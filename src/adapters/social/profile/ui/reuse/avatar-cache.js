import { apiFetch } from "/static/reuse/api-client.js";

export const AVATAR_CACHE_LIMIT = 128;
export const AVATAR_CACHE_TTL_MS = 60_000;

export function profileReadState(response) {
    if (response.ok) return "available";
    if ([401, 403].includes(response.status)) return "denied";
    if ([404, 410].includes(response.status)) return "missing";
    if ([408, 425, 429].includes(response.status) || response.status >= 500)
        return "retryable";
    return "invalid";
}

export function createAvatarCache({ isCurrent, invalidate, log }) {
    const entries = new Map();

    function release(key, entry) {
        if (entries.get(key) !== entry) return;
        entries.delete(key);
        entry.controller.abort();
        if (entry.result?.blobUrl) URL.revokeObjectURL(entry.result.blobUrl);
    }

    function clear(key) {
        if (key !== undefined) {
            const entry = entries.get(key);
            if (entry) release(key, entry);
            invalidate(key);
            return;
        }
        for (const [entryKey, entry] of entries) release(entryKey, entry);
        invalidate();
    }

    async function read(key, context) {
        if (!key) return { state: "missing" };
        if (!isCurrent(context)) return { state: "stale" };
        let entry = entries.get(key);
        if (entry?.pending) return entry.pending;
        if (entry && entry.expires > Date.now()) return entry.result;
        if (!entry) {
            if (entries.size >= AVATAR_CACHE_LIMIT) {
                const oldest = [...entries].find(
                    ([, candidate]) => !candidate.pending,
                );
                if (!oldest) return { state: "retryable" };
                release(...oldest);
            }
            entry = { controller: new AbortController() };
            entries.set(key, entry);
        }
        const current = entry;
        current.pending = (async () => {
            let result;
            try {
                const namespace = String(key).startsWith("chatrooms/")
                    ? "chats"
                    : "profile";
                const path = String(key)
                    .split("/")
                    .map(encodeURIComponent)
                    .join("/");
                const response = await apiFetch(
                    `/api/v1/files/${namespace}/${path}`,
                    { signal: current.controller.signal },
                );
                result = { state: profileReadState(response) };
                if (result.state === "available") {
                    const blob = await response.blob();
                    const digest = new Uint8Array(
                        await crypto.subtle.digest(
                            "SHA-256",
                            await blob.arrayBuffer(),
                        ),
                    ).join(",");
                    if (!isCurrent(context) || entries.get(key) !== current)
                        return { state: "stale" };
                    const unchanged =
                        current.digest === digest && current.result?.blobUrl;
                    result.blobUrl = unchanged || URL.createObjectURL(blob);
                    if (!unchanged && current.result?.blobUrl)
                        URL.revokeObjectURL(current.result.blobUrl);
                    current.digest = digest;
                }
            } catch (error) {
                if (!current.controller.signal.aborted)
                    log?.("error", "Profile avatar read failed.", {
                        component: "social-profile",
                        operation: "readAvatar",
                        errorName: error?.name,
                    });
                result = { state: "retryable" };
            }
            if (!isCurrent(context) || entries.get(key) !== current)
                return { state: "stale" };
            if (result.state === "retryable") {
                if (!current.result?.blobUrl) release(key, current);
                return result;
            }
            if (result.state !== "available") {
                if (current.result?.blobUrl)
                    URL.revokeObjectURL(current.result.blobUrl);
                invalidate(key);
            }
            current.result = result;
            current.expires = Date.now() + AVATAR_CACHE_TTL_MS;
            return result;
        })().finally(() => {
            current.pending = null;
        });
        return current.pending;
    }

    return {
        read,
        clear,
        evictImage: (key, url) => {
            if (entries.get(key)?.result?.blobUrl === url) clear(key);
        },
        unavailable: (key) => {
            const entry = entries.get(key);
            return (
                entry?.expires > Date.now() &&
                ["missing", "denied"].includes(entry.result?.state)
            );
        },
    };
}

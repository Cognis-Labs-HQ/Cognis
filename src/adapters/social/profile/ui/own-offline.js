import { createOfflineReadCache } from "/static/reuse/offline-read-cache.js";
import { bindOfflineSnapshotRefresh } from "/static/reuse/offline-snapshot.js";
import { captureAccountGuard } from "/static/reuse/offline-identity.js";
import { isOffline } from "/static/reuse/offline-state.js";

/** Own-profile preparation and bounded private images, scoped to this provider. @returns {object} Request and route policy. */
export function registerOwnProfileOffline(ctx, request, transport) {
    const read = createOfflineReadCache({
        signal: ctx.signal,
        maxBytes: 2_000_000,
    });
    let own;
    let actor;
    let prepared = false;
    let required = [];
    let images = [];
    const identity = () =>
        JSON.stringify([
            localStorage.getItem("cognis_account"),
            localStorage.getItem("cognis_access_token"),
        ]);
    const media = ctx.capabilities.get("ui:scopedActions")(
        ctx,
        "social:profileMedia",
        {
            read: async ({ path, options }) => {
                const assertAccount = captureAccountGuard();
                const payload = await read(
                    path,
                    async () => {
                        const response = await transport(path, {
                            ...options,
                            signal: AbortSignal.any([
                                ctx.signal,
                                ...(options.signal ? [options.signal] : []),
                            ]),
                        });
                        if (!response.ok)
                            throw Object.assign(
                                new Error("profile_media_unavailable"),
                                { status: response.status },
                            );
                        const blob = await response.blob();
                        if (blob.size > 350_000) return { blob };
                        const bytes = new Uint8Array(await blob.arrayBuffer());
                        return {
                            body: btoa(
                                Array.from(bytes, (byte) =>
                                    String.fromCharCode(byte),
                                ).join(""),
                            ),
                            type: blob.type,
                        };
                    },
                    (value) => !value.blob,
                );
                assertAccount();
                if (payload.blob)
                    return new Response(payload.blob, {
                        headers: { "content-type": payload.blob.type },
                    });
                return new Response(
                    Uint8Array.from(atob(payload.body), (character) =>
                        character.charCodeAt(0),
                    ),
                    { headers: { "content-type": payload.type } },
                );
            },
        },
    );
    const isOwn = (path) => {
        const match = /^\/profile(?:\/([^/?#]+))?(?:[?#].*)?$/.exec(path);
        if (!match) return false;
        const handle = match[1] ? decodeURIComponent(match[1]) : "";
        return (
            !handle ||
            handle === localStorage.getItem("cognis_account") ||
            (actor === identity() && handle === own?.handle)
        );
    };
    const fetch = async (path, options = {}) => {
        if (
            options.accessToken ||
            new Headers(options.headers).has("authorization")
        )
            return transport(path, options);
        if (
            path.startsWith("/api/v1/files/profile/") &&
            (options.method ?? "GET").toUpperCase() === "GET"
        )
            return media.read({ path, options, signal: options.signal });
        if (isOffline()) {
            const match =
                /^\/api\/v1\/social\/users\/([^/]+)\/(?:profile|posts)$/.exec(
                    path,
                );
            if (match && !isOwn(`/profile/${match[1]}`))
                throw new Error("offline_access_denied");
        }
        return request(path, options);
    };
    fetch.hasCachedRead = request.hasCachedRead;
    bindOfflineSnapshotRefresh(ctx, {
        id: "profile:prepareOwnSnapshot",
        refresh: async () => {
            prepared = false;
            const assertAccount = captureAccountGuard();
            const response = await request("/api/v1/social/profile", {
                signal: ctx.signal,
            });
            if (!response.ok) throw new Error("profile_snapshot_unavailable");
            const profile = (await response.json()).data;
            const account = localStorage.getItem("cognis_account");
            const paths = [
                "/api/v1/social/posts",
                ...[
                    "ui-preferences",
                    "profile-banner",
                    "preferences-editor-acknowledgement",
                ].map(
                    (key) =>
                        `/api/v1/social/users/${encodeURIComponent(account)}/preferences/${key}`,
                ),
            ];
            if (profile?.handle)
                paths.push(
                    ...["follow", "following"].map(
                        (kind) =>
                            `/api/v1/social/users/${encodeURIComponent(profile.handle)}/${kind}`,
                    ),
                );
            for (const path of paths) {
                assertAccount();
                ctx.signal.throwIfAborted();
                if (isOffline()) return;
                const result = await request(path, { signal: ctx.signal });
                if (!result.ok) throw new Error("profile_snapshot_unavailable");
            }
            for (const key of [profile?.avatarKey, profile?.bannerKey].filter(
                Boolean,
            ))
                await media.read({
                    path: `/api/v1/files/profile/${key}`,
                    options: {},
                });
            assertAccount();
            required = ["/api/v1/social/profile", ...paths];
            images = [profile?.avatarKey, profile?.bannerKey]
                .filter(Boolean)
                .map((key) => `/api/v1/files/profile/${key}`);
            prepared = true;
            own = profile;
            actor = identity();
        },
    });
    ctx.capabilities.contribute("social:isOwnProfileRoute", isOwn);
    return {
        fetch,
        available: (_route, path) =>
            isOwn(path) &&
            actor === identity() &&
            Boolean(own) &&
            prepared &&
            required.every((path) => request.hasCachedRead(path)) &&
            images.every((path) => read.has(path)),
    };
}

import { profileReadState } from "./reuse/avatar-cache.js";
import { readImageBlob } from "./reuse/image-blob.js";
import { profileFetch as apiFetch } from "./offline-client.js";
import {
    PROFILE_FILE_NAMESPACE_ID,
    buildNamespacedFileUrl,
} from "./file-namespaces.js";

const DEFAULT_BANNER_LAYOUT = {
    height: "half",
    panX: 50,
    panY: 50,
};

function clampBannerPanPercent(value) {
    return Math.min(100, Math.max(0, Number(value) || 0));
}

function resolveBannerPanPercent(value) {
    const normalizedValue = Number(value);
    if (!Number.isFinite(normalizedValue)) return 50;
    return clampBannerPanPercent(normalizedValue);
}

function createDefaultBannerLayout() {
    return { ...DEFAULT_BANNER_LAYOUT };
}

export async function loadOwnProfile() {
    try {
        const response = await apiFetch("/api/v1/social/profile");
        const state = profileReadState(response);
        if (["denied", "missing"].includes(state)) return null;
        if (state !== "available") throw new Error("profile_read_failed");
        const payload = await response.json();
        if (
            !Object.hasOwn(payload, "data") ||
            (payload.data !== null &&
                (typeof payload.data !== "object" ||
                    Array.isArray(payload.data) ||
                    typeof payload.data.accountId !== "string" ||
                    !payload.data.accountId ||
                    typeof payload.data.handle !== "string" ||
                    !payload.data.handle ||
                    ["avatarKey", "bannerKey"].some(
                        (key) =>
                            payload.data[key] !== null &&
                            typeof payload.data[key] !== "string",
                    )))
        )
            throw new Error("profile_read_invalid");
        return payload.data;
    } catch (error) {
        console.error("[profile] profile read failed", {
            component: "social-profile",
            operation: "readProfile",
            errorName: error?.name,
        });
        throw error;
    }
}

export async function loadFollowers(handle) {
    if (!handle) return [];
    try {
        const response = await apiFetch(
            `/api/v1/social/users/${encodeURIComponent(handle)}/follow`,
        );
        if (!response.ok) return [];
        return (await response.json()).data ?? [];
    } catch {
        return [];
    }
}

export async function loadFollowing(handle) {
    if (!handle) return [];
    try {
        const response = await apiFetch(
            `/api/v1/social/users/${encodeURIComponent(handle)}/following`,
        );
        if (!response.ok) return [];
        return (await response.json()).data ?? [];
    } catch {
        return [];
    }
}

export async function loadOwnPosts() {
    try {
        const response = await apiFetch("/api/v1/social/posts");
        if (!response.ok) return [];
        return (await response.json()).data ?? [];
    } catch {
        return [];
    }
}

export async function loadUserProfile(handle) {
    try {
        const response = await apiFetch(
            `/api/v1/social/users/${encodeURIComponent(handle)}/profile`,
        );
        if (response.status === 404) return { notFound: true };
        if (!response.ok) return null;
        return (await response.json()).data ?? null;
    } catch {
        return null;
    }
}

export async function loadUserPosts(handle) {
    if (!handle) return [];
    try {
        const response = await apiFetch(
            `/api/v1/social/users/${encodeURIComponent(handle)}/posts`,
        );
        if (!response.ok) return [];
        return (await response.json()).data ?? [];
    } catch {
        return [];
    }
}

export async function readProfileImage(
    fileKey,
    { signal, isCurrent, previous },
) {
    if (!fileKey) return { state: "missing" };
    try {
        const response = await apiFetch(
            buildNamespacedFileUrl(PROFILE_FILE_NAMESPACE_ID, fileKey),
            { signal },
        );
        if (!isCurrent()) return { state: "stale" };
        const state = profileReadState(response);
        return state === "available"
            ? await readImageBlob(response, { isCurrent, previous })
            : { state };
    } catch (error) {
        if (!isCurrent() || signal.aborted) return { state: "stale" };
        console.error("[profile] hero image read failed", {
            component: "social-profile",
            operation: "readHeroMedia",
            errorName: error?.name,
            status: error?.status,
        });
        return {
            state: error?.status
                ? profileReadState({ ok: false, status: error.status })
                : "retryable",
        };
    }
}

export async function loadBannerLayoutPreference(accountId) {
    if (!accountId) return createDefaultBannerLayout();
    try {
        const response = await apiFetch(
            `/api/v1/social/users/${encodeURIComponent(accountId)}/preferences/profile-banner`,
        );
        if (!response.ok) return createDefaultBannerLayout();
        const payload = await response.json();
        const rawLayout = payload?.data?.layoutJson;
        if (!rawLayout) return createDefaultBannerLayout();
        const parsedLayout = JSON.parse(rawLayout);
        return {
            height: parsedLayout?.height === "full" ? "full" : "half",
            panX: resolveBannerPanPercent(parsedLayout?.panX),
            panY: resolveBannerPanPercent(parsedLayout?.panY),
        };
    } catch {
        return createDefaultBannerLayout();
    }
}

export async function saveBannerLayoutPreference({ height, panX, panY }) {
    const account = localStorage.getItem("cognis_account");
    if (!account) return;
    await apiFetch(
        `/api/v1/social/users/${encodeURIComponent(account)}/preferences/profile-banner`,
        {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ layout: { height, panX, panY } }),
        },
    );
}

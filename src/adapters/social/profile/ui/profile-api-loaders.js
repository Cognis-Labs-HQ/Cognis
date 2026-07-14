import { apiFetch } from "/static/reuse/api-client.js";

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
        if (!response.ok) return null;
        return (await response.json()).data ?? null;
    } catch {
        return null;
    }
}

export async function loadFollowers(handle) {
    if (!handle) return [];
    try {
        const response = await apiFetch(
            `/api/v1/social/users/${encodeURIComponent(handle)}/followers`,
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

export async function loadImageAsBlob(fileKey) {
    if (!fileKey) return null;
    try {
        const response = await apiFetch(`/api/v1/files/profile/${fileKey}`);
        if (!response.ok) return null;
        return URL.createObjectURL(await response.blob());
    } catch {
        return null;
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

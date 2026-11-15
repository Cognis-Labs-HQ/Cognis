import assert from "node:assert/strict";
export const state = {
    messages: [],
    requests: [],
    profile: {
        handle: "le-firehawk",
        displayName: "The Firehawk",
        avatarKey: "",
    },
    images: new Map(),
    strings: new Map(),
    indexes: new Map(),
};
export async function apiFetch(path, options = {}) {
    assert.equal(options.method || "GET", "GET", `Unexpected mutation ${path}`);
    state.requests.push(path);
    if (path.startsWith("/api/v1/files/profile/")) {
        const key = decodeURIComponent(
            path.slice("/api/v1/files/profile/".length),
        );
        const result = state.images.get(key);
        if (typeof result === "function") return result();
        if (result instanceof Response) return result.clone();
        return new Response(
            result ?? new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
            { headers: { "content-type": "image/png" } },
        );
    }
    if (/\/messages(?:\?|$)/.test(path))
        return Response.json({ data: state.messages });
    if (path === "/api/v1/social/profile/ping") return Response.json({});
    if (
        path === "/api/v1/social/profile" ||
        /\/users\/[^/]+\/profile$/.test(path)
    )
        return Response.json({ data: state.profile });
    if (/\/availability/.test(path))
        return Response.json({ data: { status: "busy" } });
    throw new Error(`Unexpected read ${path}`);
}
export const createI18n = async () => ({
    t: (key) => {
        assert.ok(state.strings.has(key), `Translation missing ${key}`);
        return state.strings.get(key);
    },
});
export const applyStaticTranslations = () => {};
export const registerSearchIndex = (key, value) => {
    state.indexes.set(key, value);
    return () => state.indexes.delete(key);
};
export const formatDate = (value) => (value ? String(value).slice(0, 10) : "");
export const formatTime = (value) => (value ? String(value).slice(11, 16) : "");

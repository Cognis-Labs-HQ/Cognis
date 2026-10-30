import { registerOwnProfileOffline } from "./own-offline.js";
import { apiFetch } from "/static/reuse/api-client.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";
import { registerOfflineHttpClient } from "/static/reuse/offline-http-client.js";

const ROOT = "/api/v1/social/";
function describe(path, method) {
    const relative = path.startsWith(ROOT)
        ? path.slice(ROOT.length).split("?")[0]
        : "";
    if (
        method === "GET" &&
        /^(?:profile|posts|users\/search|users\/[^/]+\/(?:profile|posts|follow|following|relationship|preferences\/[^/]+)|availability(?:\/[^/]+)?)$/.test(
            relative,
        )
    )
        return {};
    if (relative === "profile" && method === "PATCH") return { write: true };
    if (
        /^profile\/(avatar|banner)$/.test(relative) &&
        ["PUT", "DELETE"].includes(method)
    )
        return { write: true, binary: method === "PUT" };
    if (relative === "posts" && method === "POST")
        return {
            write: true,
            create: true,
            optimistic: (operation) => pendingPost(operation),
        };
    if (/^posts\/[^/]+$/.test(relative) && method === "DELETE")
        return { write: true };
    if (
        /^users\/[^/]+\/(follow|block)$/.test(relative) &&
        ["POST", "DELETE"].includes(method)
    )
        return { write: true };
    if (/^users\/[^/]+\/preferences\/[^/]+$/.test(relative) && method === "PUT")
        return {
            write: true,
            readSnapshot: ({ body }) => {
                const [, accountId, , pageId] = relative.split("/");
                return {
                    data: {
                        accountId: decodeURIComponent(accountId),
                        pageId: decodeURIComponent(pageId),
                        layoutJson: JSON.stringify(body.layout ?? {}),
                    },
                };
            },
        };
    if (relative === "availability" && method === "PUT") return { write: true };
    return null;
}
function pendingPost(operation) {
    return {
        ...operation.body,
        id: operation.body.operationId,
        accountId: localStorage.getItem("cognis_account"),
        createdAt: operation.createdAt,
        queued: true,
    };
}
function project(path, payload, pending) {
    if (path === `${ROOT}profile` && payload.data) {
        for (const { payload: operation } of pending)
            if (operation.path === path && operation.method === "PATCH")
                payload.data = {
                    ...payload.data,
                    ...operation.body,
                    queued: true,
                };
    }
    if (path === `${ROOT}posts` && Array.isArray(payload.data)) {
        for (const { payload: operation } of pending) {
            if (operation.path === path && operation.method === "POST")
                payload.data.unshift(pendingPost(operation));
            if (
                operation.method === "DELETE" &&
                operation.path.startsWith(`${ROOT}posts/`)
            )
                payload.data = payload.data.filter(
                    (post) =>
                        post.id !==
                        decodeURIComponent(
                            operation.path.slice(`${ROOT}posts/`.length),
                        ),
                );
        }
    }
    for (const { payload: operation } of pending) {
        if (
            path === `${ROOT}availability` &&
            operation.path === path &&
            operation.method === "PUT" &&
            payload.data
        )
            payload.data = {
                ...payload.data,
                status: operation.body.status,
                source: "manual",
                queued: true,
            };
        if (
            path.includes("/preferences/") &&
            operation.path === path &&
            operation.method === "PUT"
        )
            payload.data = {
                layoutJson: JSON.stringify(operation.body.layout),
            };
        if (path.endsWith("/relationship") && payload.data) {
            const base = path.slice(0, -"relationship".length);
            if (operation.path === base + "follow")
                payload.data.following = operation.method === "POST";
            if (operation.path === base + "block")
                payload.data.blocked = operation.method === "POST";
        }
    }
    return payload;
}
export function registerProfileOfflineClient(ctx) {
    const request = registerOfflineHttpClient(ctx, {
        owner: "social.profile",
        describe,
        request: apiFetch,
        project,
    });
    const own = registerOwnProfileOffline(ctx, request, apiFetch);
    ctx.capabilities.contribute("social:profileRequest", own.fetch);
    ctx.capabilities.get("offline:registerSessionRoutes")?.(
        ["social-profile-page"],
        ctx.signal,
        { available: own.available },
    );
}
export async function profileFetch(path, options = {}) {
    if (!path.startsWith(ROOT) && !path.startsWith("/api/v1/files/"))
        throw new Error("invalid_profile_request");
    const request = uiCtx.capabilities.get("social:profileRequest");
    if (!request) throw new Error("profile_client_unavailable");
    return request(path, options);
}

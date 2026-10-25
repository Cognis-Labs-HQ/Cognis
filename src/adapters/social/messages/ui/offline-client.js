import { apiFetch } from "/static/reuse/api-client.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";
import { registerOfflineHttpClient } from "/static/reuse/offline-http-client.js";

const ROOT = "/api/v1/social/messages";
function queuedMessage(operation) {
    return {
        ...operation.body,
        id: operation.body.operationId,
        senderId: localStorage.getItem("cognis_account"),
        createdAt: operation.createdAt,
        queued: true,
        contentType: operation.body.contentType ?? "text/plain",
    };
}
function describe(path, method) {
    const relative = path.startsWith(ROOT)
        ? path.slice(ROOT.length).split("?")[0]
        : "";
    if (
        method === "GET" &&
        /^(?:\/rooms(?:\/[^/]+(?:\/messages)?)?|\/requests|\/emoji-usage)$/.test(
            relative,
        )
    )
        return {};
    if (/^\/rooms\/[^/]+\/messages$/.test(relative) && method === "POST")
        return { write: true, create: true, optimistic: queuedMessage };
    if (
        /^\/rooms\/[^/]+\/messages\/[^/]+\/reactions$/.test(relative) &&
        ["POST", "DELETE"].includes(method)
    )
        return { write: true };
    if (
        /^\/rooms\/[^/]+\/read$/.test(relative) &&
        ["POST", "PUT", "PATCH"].includes(method)
    )
        return { write: true };
    return null;
}
function project(path, payload, pending) {
    if (
        !/\/rooms\/[^/]+\/messages(?:\?|$)/.test(path) ||
        !Array.isArray(payload.data)
    )
        return payload;
    for (const { payload: operation } of pending)
        if (
            operation.method === "POST" &&
            operation.path === path.split("?")[0]
        ) {
            const message = queuedMessage(operation);
            if (!payload.data.some((row) => row.id === message.id))
                payload.data.push(message);
        }
    for (const { payload: operation } of pending) {
        const match = operation.path.match(/\/messages\/([^/]+)\/reactions$/);
        if (
            !match ||
            !operation.path.startsWith(path.split("?")[0] + "/") ||
            typeof operation.body?.active !== "boolean"
        )
            continue;
        const message = payload.data.find(
            (row) => row.id === decodeURIComponent(match[1]),
        );
        if (!message) continue;
        message.reactions ??= [];
        let reaction = message.reactions.find(
            (row) => row.emoji === operation.body.emoji,
        );
        if (!reaction) {
            reaction = {
                emoji: operation.body.emoji,
                count: 0,
                reactedByMe: false,
                reactedBy: [],
            };
            message.reactions.push(reaction);
        }
        if (reaction.reactedByMe !== operation.body.active)
            reaction.count += operation.body.active ? 1 : -1;
        reaction.reactedByMe = operation.body.active;
        message.reactions = message.reactions.filter((row) => row.count > 0);
    }
    return payload;
}
export function mountProvider(ctx) {
    const request = registerOfflineHttpClient(ctx, {
        owner: "social.messages",
        describe,
        request: apiFetch,
        project,
    });
    ctx.capabilities.contribute("social:messagesRequest", request);
    ctx.capabilities.get("offline:registerSessionRoutes")?.(
        ["social-messages-page"],
        ctx.signal,
    );
}
export function messagesFetch(path, options = {}) {
    if (!path.startsWith(`${ROOT}/`) && !path.startsWith("/api/v1/files/"))
        throw new Error("invalid_messages_request");
    const request = uiCtx.capabilities.get("social:messagesRequest");
    if (!request) throw new Error("messages_client_unavailable");
    return request(path, options);
}

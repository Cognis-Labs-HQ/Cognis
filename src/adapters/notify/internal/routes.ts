import type { IncomingMessage, ServerResponse } from "node:http";
import { getAuthClaims } from "../../../api/auth/guard.js";
import type { IInternalNotificationStore } from "./store.js";

/**
 * Route handler for all internal notification inbox endpoints.
 *
 *   GET    /api/v1/notifications/inbox          list the caller's notifications
 *   GET    /api/v1/notifications/inbox/count    unread count for the caller
 *   PUT    /api/v1/notifications/inbox/read     mark all as read
 *   PUT    /api/v1/notifications/inbox/:id/read mark one notification as read
 *   DELETE /api/v1/notifications/inbox          delete all notifications for the caller
 *   DELETE /api/v1/notifications/inbox/:id      delete one notification
 */
export function createInternalNotificationRoutes(
    store: IInternalNotificationStore,
) {
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (!url.pathname.startsWith("/api/v1/notifications/inbox")) {
            return false;
        }

        const claims = getAuthClaims(req);
        if (!claims) {
            res.writeHead(401, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    error: { code: "unauthorized", message: "Login required" },
                }),
            );
            return true;
        }

        const username = claims.sub;

        if (
            url.pathname === "/api/v1/notifications/inbox" &&
            req.method === "DELETE"
        ) {
            const removed = await store.deleteAll(username);
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { removed } }));
            return true;
        }

        if (url.pathname === "/api/v1/notifications/inbox") {
            if (req.method !== "GET") return false;
            const notifications = await store.list(username);
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: notifications }));
            return true;
        }

        if (url.pathname === "/api/v1/notifications/inbox/count") {
            if (req.method !== "GET") return false;
            const count = await store.countUnread(username);
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { count } }));
            return true;
        }

        if (
            url.pathname === "/api/v1/notifications/inbox/read" &&
            req.method === "PUT"
        ) {
            await store.markAllRead(username);
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { ok: true } }));
            return true;
        }

        const singleReadMatch = url.pathname.match(
            /^\/api\/v1\/notifications\/inbox\/([^/]+)\/read$/,
        );
        if (singleReadMatch && req.method === "PUT") {
            const id = decodeURIComponent(singleReadMatch[1]);
            const found = await store.markRead(username, id);
            if (!found) {
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "not_found",
                            message: "Notification not found",
                        },
                    }),
                );
                return true;
            }
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { ok: true } }));
            return true;
        }

        const deleteMatch = url.pathname.match(
            /^\/api\/v1\/notifications\/inbox\/([^/]+)$/,
        );
        if (deleteMatch && req.method === "DELETE") {
            const id = decodeURIComponent(deleteMatch[1]);
            const found = await store.delete(username, id);
            if (!found) {
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "not_found",
                            message: "Notification not found",
                        },
                    }),
                );
                return true;
            }
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { ok: true } }));
            return true;
        }

        return false;
    };
}

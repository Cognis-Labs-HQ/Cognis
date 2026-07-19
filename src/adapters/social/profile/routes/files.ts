import type { IncomingMessage, ServerResponse } from "node:http";
import {
    resolveRouteContext,
    type RouteContext,
} from "../../../../api/reuse/route-context.js";
import type { DbProfileStore } from "../store.js";
import { readJson } from "../../../../api/reuse/read-json.js";

/**
 * Admin-only per-category max upload size limits (avatars, banners, etc.).
 * Distinct from namespace storage quotas — this bounds a single upload's
 * size, not a user's total storage. The actual file bytes are served by the
 * files gateway's namespace-scoped routes (/api/v1/files/profile/*key).
 */
export function createFileLimitRoutes(
    profileStore: DbProfileStore,
    routeContext?: RouteContext,
) {
    const ctx = resolveRouteContext(routeContext);
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (
            url.pathname === "/api/v1/social/admin/file-limits" &&
            req.method === "GET"
        ) {
            if (!ctx.requireAuth(req, res, "admin")) return true;
            const limits = await profileStore.getAllFileSizeLimits();
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: limits }));
            return true;
        }

        const limitMatch = url.pathname.match(
            /^\/api\/v1\/social\/admin\/file-limits\/([^/]+)$/,
        );
        if (limitMatch && req.method === "PUT") {
            if (!ctx.requireAuth(req, res, "admin")) return true;
            const category = decodeURIComponent(limitMatch[1]);
            const body = await readJson(req);
            const maxBytes = Number(body.maxBytes);
            if (!Number.isInteger(maxBytes) || maxBytes <= 0) {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "bad_request",
                            message: "maxBytes must be a positive integer",
                        },
                    }),
                );
                return true;
            }
            await profileStore.setFileSizeLimit(category, maxBytes);
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { category, maxBytes } }));
            return true;
        }

        return false;
    };
}

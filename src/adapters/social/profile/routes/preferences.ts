import type { IncomingMessage, ServerResponse } from "node:http";
import { readJson } from "../../../../api/reuse/read-json.js";
import {
    resolveRouteContext,
    type RouteContext,
} from "../../../../api/reuse/route-context.js";
export type { UserPreferenceStore } from "../../../../api/reuse/preference-store.js";
export { VolatileUserPreferenceStore } from "../../../../api/reuse/preference-store.js";
import type { UserPreferenceStore } from "../../../../api/reuse/preference-store.js";

export function createPreferencesRoutes(
    store: UserPreferenceStore,
    routeContext?: RouteContext,
) {
    const ctx = resolveRouteContext(routeContext);
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        const match = url.pathname.match(
            /^\/api\/v1\/users\/([^/]+)\/preferences\/([^/]+)$/,
        );
        if (!match) return false;
        const claims = ctx.requireAuth(req, res, "user");
        if (!claims) return true;
        const accountId = decodeURIComponent(match[1]);
        if (!ctx.canAccessUserData(claims, accountId)) {
            res.writeHead(403, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    error: {
                        code: "forbidden",
                        message: "Cannot access another user preferences",
                    },
                }),
            );
            return true;
        }
        const pageId = decodeURIComponent(match[2]);

        if (req.method === "GET") {
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: {
                        accountId,
                        pageId,
                        layoutJson: await store.get(accountId, pageId),
                    },
                }),
            );
            return true;
        }

        if (req.method === "PUT") {
            const body = await readJson(req);
            await store.set(
                accountId,
                pageId,
                JSON.stringify(body.layout ?? {}),
            );
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { saved: true } }));
            return true;
        }

        return false;
    };
}

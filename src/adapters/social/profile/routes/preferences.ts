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
        request: IncomingMessage,
        response: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        const match = url.pathname.match(
            /^\/api\/v1\/social\/users\/([^/]+)\/preferences\/([^/]+)$/,
        );
        if (!match) return false;
        const claims = ctx.requireAuth(request, response, "user");
        if (!claims) return true;
        const accountId = decodeURIComponent(match[1]);
        const pageId = decodeURIComponent(match[2]);
        const allowPublicProfileBannerRead =
            request.method === "GET" && pageId === "profile-banner";
        if (
            !ctx.canAccessUserData(claims, accountId) &&
            !allowPublicProfileBannerRead
        ) {
            response.writeHead(403, { "content-type": "application/json" });
            response.end(
                JSON.stringify({
                    error: {
                        code: "forbidden",
                        message: "Cannot access another user preferences",
                    },
                }),
            );
            return true;
        }

        if (request.method === "GET") {
            response.writeHead(200, { "content-type": "application/json" });
            response.end(
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

        if (request.method === "PUT") {
            const body = await readJson(request);
            await store.set(
                accountId,
                pageId,
                JSON.stringify(body.layout ?? {}),
            );
            response.writeHead(200, { "content-type": "application/json" });
            response.end(JSON.stringify({ data: { saved: true } }));
            return true;
        }

        return false;
    };
}

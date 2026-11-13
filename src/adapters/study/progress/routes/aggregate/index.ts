import type { IncomingMessage, ServerResponse } from "node:http";
import type { RouteContext } from "../../../../../api/reuse/route-context.js";
import type { ProgressCapability } from "../../../../../gateways/study/reuse/progress.js";
import { actorFrom, filtersFrom, sendJson } from "../http.js";

export function createAggregateRoutes(
    progress: ProgressCapability,
    routeContext: RouteContext,
) {
    return async (
        request: IncomingMessage,
        response: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (
            ![
                "/api/v1/study/progress/aggregate",
                "/api/v1/study/progress/engagement",
            ].includes(url.pathname) ||
            request.method !== "GET"
        )
            return false;
        const claims = routeContext.requireAuth(request, response);
        if (!claims) return true;
        sendJson(response, 200, {
            data: url.pathname.endsWith("/engagement")
                ? await progress.engagement(actorFrom(claims))
                : await progress.aggregate(actorFrom(claims), filtersFrom(url)),
        });
        return true;
    };
}

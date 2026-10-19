import type { IncomingMessage, ServerResponse } from "node:http";
import type { RouteContext } from "../../../../../api/reuse/route-context.js";
import type { ProgressCapability } from "../../service.js";
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
            url.pathname !== "/api/v1/study/progress/aggregate" ||
            request.method !== "GET"
        )
            return false;
        const claims = routeContext.requireAuth(request, response);
        if (!claims) return true;
        sendJson(response, 200, {
            data: await progress.aggregate(actorFrom(claims), filtersFrom(url)),
        });
        return true;
    };
}

import type { IncomingMessage, ServerResponse } from "node:http";
import type { RouteContext } from "../../../../../api/reuse/route-context.js";
import type { ProgressCapability } from "../../service.js";
import { actorFrom, sendJson } from "../http.js";

export function createRebuildRoutes(
    progress: ProgressCapability,
    routeContext: RouteContext,
) {
    return async (
        request: IncomingMessage,
        response: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (
            url.pathname !== "/api/v1/study/progress/rebuild" ||
            request.method !== "POST"
        )
            return false;
        const claims = routeContext.requireAuth(request, response, "admin");
        if (!claims) return true;
        sendJson(response, 200, {
            data: await progress.rebuild(
                actorFrom(claims),
                url.searchParams.get("actorId") ?? claims.sub,
            ),
        });
        return true;
    };
}

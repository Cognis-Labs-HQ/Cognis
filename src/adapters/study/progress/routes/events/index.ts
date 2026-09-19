import type { IncomingMessage, ServerResponse } from "node:http";
import { readJson } from "../../../../../api/reuse/read-json.js";
import type { RouteContext } from "../../../../../api/reuse/route-context.js";
import type { ProgressCapability } from "../../service.js";
import type { LearningEventInput } from "../../types.js";
import { actorFrom, filtersFrom, sendJson } from "../http.js";

export function createEventRoutes(
    progress: ProgressCapability,
    routeContext: RouteContext,
) {
    return async (
        request: IncomingMessage,
        response: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        const isEventCollection =
            url.pathname === "/api/v1/study/progress/events";
        const isCorrection =
            url.pathname === "/api/v1/study/progress/events/corrections";
        if (!isEventCollection && !isCorrection) return false;
        const claims = routeContext.requireAuth(request, response);
        if (!claims) return true;
        const actor = actorFrom(claims);
        if (isEventCollection && request.method === "GET") {
            sendJson(response, 200, {
                data: await progress.listEvents(actor, filtersFrom(url)),
            });
            return true;
        }
        if (request.method === "POST") {
            const input = (await readJson(request)) as LearningEventInput;
            const result = isCorrection
                ? await progress.correctEvent(
                      actor,
                      input as LearningEventInput & {
                          compensatesEventId: string;
                      },
                  )
                : await progress.recordEvent(actor, input);
            sendJson(response, result.duplicate ? 200 : 201, { data: result });
            return true;
        }
        return false;
    };
}

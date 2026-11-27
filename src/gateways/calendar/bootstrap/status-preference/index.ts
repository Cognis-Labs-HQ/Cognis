import type { IncomingMessage, ServerResponse } from "node:http";
import { readJson } from "../../../../api/reuse/read-json.js";
import {
    resolveRouteContext,
    type RouteContext,
} from "../../../../api/reuse/route-context.js";
import type { CalendarLogger } from "../helpers.js";

interface StatusPreferenceRouteOptions {
    routeContext?: RouteContext;
    getPreference: (accountId: string) => Promise<string | null>;
    setPreference: (accountId: string, prevented: boolean) => Promise<boolean>;
    log?: CalendarLogger;
}

export function createStatusPreferenceRoutes({
    routeContext,
    getPreference,
    setPreference,
    log,
}: StatusPreferenceRouteOptions) {
    const ctx = resolveRouteContext(routeContext);
    return async (
        request: IncomingMessage,
        response: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (url.pathname !== "/api/v1/calendar/status-preference") {
            return false;
        }
        const claims = ctx.requireAuth(request, response, "user");
        if (!claims) return true;
        if (request.method === "GET") {
            const prevented = (await getPreference(claims.sub)) === "true";
            response.writeHead(200, { "content-type": "application/json" });
            response.end(JSON.stringify({ data: { prevented } }));
            return true;
        }
        if (request.method === "PUT") {
            const body = await readJson(request);
            if (typeof body.prevented !== "boolean") {
                response.writeHead(400, { "content-type": "application/json" });
                response.end(
                    JSON.stringify({
                        error: {
                            code: "invalid_preference",
                            message: "Prevented must be a boolean.",
                        },
                    }),
                );
                return true;
            }
            const saved = await setPreference(claims.sub, body.prevented);
            if (!saved) {
                response.writeHead(503, { "content-type": "application/json" });
                response.end(
                    JSON.stringify({
                        error: {
                            code: "preferences_unavailable",
                            message: "Preference storage is unavailable.",
                        },
                    }),
                );
                return true;
            }
            log?.("info", "Calendar status preference updated.", {
                component: "calendar-gateway",
                operation: "update_status_preference",
                accountId: claims.sub,
                prevented: body.prevented,
            });
            response.writeHead(200, { "content-type": "application/json" });
            response.end(JSON.stringify({ data: { saved } }));
            return true;
        }
        return false;
    };
}

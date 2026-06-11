import type { IncomingMessage, ServerResponse } from "node:http";
import { jsonOk, jsonError } from "../../../../api/reuse/json-responses.js";
import type { RouteContext } from "../../../../api/reuse/route-context.js";
import type { DbClassesStore } from "../store/index.js";
import {
    resolveAgendaCalendarId,
    type ClassesRouteOptions,
} from "./route-helpers.js";

export async function handleClassroomAgendaRoutes({
    req,
    res,
    url,
    ctx,
    store,
    options,
}: {
    req: IncomingMessage;
    res: ServerResponse;
    url: URL;
    ctx: RouteContext;
    store: DbClassesStore;
    options: ClassesRouteOptions;
}): Promise<boolean> {
    const agendaItemMatch = url.pathname.match(
        /^\/api\/v1\/study\/classes\/([^/]+)\/agenda\/([^/]+)$/,
    );
    if (agendaItemMatch && req.method === "DELETE") {
        const claims = ctx.requireAuth(req, res, "teacher");
        if (!claims) return true;
        const classId = decodeURIComponent(agendaItemMatch[1]);
        const eventId = decodeURIComponent(agendaItemMatch[2]);
        const classRow = await store.getClassById(classId);
        if (!classRow || classRow.teacherAccountId !== claims.sub) {
            jsonError(
                res,
                403,
                "forbidden",
                "Class not found or access denied.",
            );
            return true;
        }
        if (!options.deleteEvent) {
            jsonError(
                res,
                503,
                "service_unavailable",
                "Calendar integration is unavailable.",
            );
            return true;
        }
        const calendarId = await resolveAgendaCalendarId(
            options,
            claims.sub,
            classRow,
        );
        if (!calendarId) {
            jsonError(
                res,
                503,
                "service_unavailable",
                "Agenda calendar is unavailable.",
            );
            return true;
        }
        const deleted = await options
            .deleteEvent(calendarId, eventId)
            .catch((error: unknown) => {
                options.log?.("error", "Failed to delete agenda item.", {
                    component: "classes",
                    operation: "delete-agenda-item",
                    classId: classId,
                    error,
                });
                return false;
            });
        if (!deleted) {
            jsonError(res, 404, "not_found", "Agenda item not found.");
            return true;
        }
        jsonOk(res, { deleted: true });
        return true;
    }

    return false;
}

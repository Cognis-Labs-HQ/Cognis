import type { IncomingMessage, ServerResponse } from "node:http";
import { jsonOk, jsonError } from "../../../../api/reuse/json-responses.js";
import type { RouteContext } from "../../../../api/reuse/route-context.js";
import type { DbClassesStore } from "../store/index.js";
import {
    resolveAgendaCalendarId,
    type ClassesRouteOptions,
} from "./route-helpers.js";

interface FileGatewayLike {
    list(
        prefix?: string,
    ): Promise<Array<{ key: string; size: number; lastModified: Date }>>;
}

export async function handleClassroomFilesRoutes({
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

    const notepadFilesMatch = url.pathname.match(
        /^\/api\/v1\/study\/classes\/([^/]+)\/notepad-files$/,
    );
    if (notepadFilesMatch && req.method === "GET") {
        const claims = ctx.requireAuth(req, res, "user");
        if (!claims) return true;
        const classId = decodeURIComponent(notepadFilesMatch[1]);
        const classRow = await store.getClassById(classId);
        if (!classRow) {
            jsonError(res, 404, "not_found", "Class not found.");
            return true;
        }
        try {
            await store.getClassMembersForViewer(classId, claims.sub);
        } catch {
            jsonError(
                res,
                403,
                "forbidden",
                "Class not found or access denied.",
            );
            return true;
        }
        const fileGateway = ctx.getCapability<FileGatewayLike>("file:gateway");
        if (!fileGateway) {
            jsonError(
                res,
                503,
                "service_unavailable",
                "File storage is unavailable.",
            );
            return true;
        }
        const prefix = `classroom-notes/${encodeURIComponent(classId)}/`;
        const files = await fileGateway.list(prefix).catch(() => []);
        jsonOk(
            res,
            files.map((file) => ({
                key: file.key,
                size: file.size,
                lastModified: file.lastModified,
            })),
        );
        return true;
    }

    return false;
}

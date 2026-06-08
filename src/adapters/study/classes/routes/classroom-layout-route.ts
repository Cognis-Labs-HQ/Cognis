import type { IncomingMessage, ServerResponse } from "node:http";
import { readJson } from "../../../../api/reuse/read-json.js";
import { jsonError, jsonOk } from "../../../../api/reuse/json-responses.js";
import type { DbClassesStore } from "../store/index.js";
import { MAX_STUDENT_LIMIT } from "../store/constants.js";
import type { ClassesRouteOptions } from "./route-helpers.js";

export async function handleClassroomLayoutRoute(
    req: IncomingMessage,
    res: ServerResponse,
    url: URL,
    input: {
        store: DbClassesStore;
        options: ClassesRouteOptions;
        ctx: {
            requireAuth(
                req: IncomingMessage,
                res: ServerResponse,
                role: "teacher",
            ): { sub: string } | null;
        };
        logMeta: { component: string; method: string; path: string };
    },
): Promise<boolean> {
    const classroomLayoutMatch = url.pathname.match(
        /^\/api\/v1\/study\/classrooms\/([^/]+)\/layout$/,
    );
    if (!classroomLayoutMatch || req.method !== "PATCH") {
        return false;
    }
    const claims = input.ctx.requireAuth(req, res, "teacher");
    if (!claims) return true;
    const classId = decodeURIComponent(classroomLayoutMatch[1]);
    const body = (await readJson(req)) as {
        studentLimit?: unknown;
        seatAssignments?: unknown;
        boardFocus?: unknown;
    };
    const studentLimitRaw = body.studentLimit;
    const seatAssignmentsRaw = body.seatAssignments;
    const boardFocusRaw =
        String(body.boardFocus ?? "")
            .trim()
            .toLowerCase() || undefined;
    const studentLimit =
        studentLimitRaw == null ? undefined : Number(studentLimitRaw);
    if (
        studentLimit != null &&
        (!Number.isInteger(studentLimit) ||
            studentLimit < 1 ||
            studentLimit > MAX_STUDENT_LIMIT)
    ) {
        jsonError(
            res,
            400,
            "bad_request",
            `studentLimit must be an integer between 1 and ${MAX_STUDENT_LIMIT}.`,
        );
        return true;
    }
    if (
        seatAssignmentsRaw != null &&
        (typeof seatAssignmentsRaw !== "object" ||
            Array.isArray(seatAssignmentsRaw))
    ) {
        jsonError(
            res,
            400,
            "bad_request",
            "seatAssignments must be an object.",
        );
        return true;
    }
    if (
        boardFocusRaw != null &&
        boardFocusRaw !== "agenda" &&
        boardFocusRaw !== "classroom"
    ) {
        jsonError(
            res,
            400,
            "bad_request",
            "boardFocus must be either agenda or classroom.",
        );
        return true;
    }
    const seatAssignments: Record<string, number> | undefined =
        seatAssignmentsRaw == null
            ? undefined
            : Object.fromEntries(
                  Object.entries(
                      seatAssignmentsRaw as Record<string, unknown>,
                  ).map(([accountId, seatNumber]) => [
                      accountId,
                      Number(seatNumber),
                  ]),
              );
    try {
        const classroomState = await input.store.updateClassroomStateForTeacher(
            classId,
            claims.sub,
            {
                studentLimit,
                seatAssignments,
                boardFocus: boardFocusRaw as "agenda" | "classroom" | undefined,
            },
        );
        jsonOk(res, classroomState);
    } catch (err) {
        if (err instanceof Error && err.message === "not_authorized") {
            jsonError(
                res,
                403,
                "forbidden",
                "Class not found or access denied.",
            );
            return true;
        }
        if (err instanceof Error && err.message === "invalid_student_limit") {
            jsonError(
                res,
                400,
                "bad_request",
                `studentLimit must be between 1 and ${MAX_STUDENT_LIMIT}.`,
            );
            return true;
        }
        if (
            err instanceof Error &&
            err.message === "student_limit_below_members"
        ) {
            jsonError(
                res,
                409,
                "conflict",
                "studentLimit cannot be lower than current class member count.",
            );
            return true;
        }
        input.options.log?.("error", "Failed to update classroom layout.", {
            ...input.logMeta,
            accountId: claims.sub,
            classId,
            error: err instanceof Error ? err.message : String(err),
        });
        jsonError(res, 500, "internal_error", "Failed to update classroom.");
    }
    return true;
}

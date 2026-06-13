import type { IncomingMessage, ServerResponse } from "node:http";
import { jsonError, jsonOk } from "../../../../api/reuse/json-responses.js";
import type { DbClassesStore } from "../store/index.js";
import type { ClassesRouteOptions } from "./route-helpers.js";

export async function handleClassroomViewStateRoute(
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
                role: "user",
            ): { sub: string } | null;
        };
        logMeta: { component: string; method: string; path: string };
    },
): Promise<boolean> {
    const match = url.pathname.match(
        /^\/api\/v1\/study\/classrooms\/([^/]+)\/view-state$/,
    );
    if (!match || req.method !== "GET") {
        return false;
    }
    const claims = input.ctx.requireAuth(req, res, "user");
    if (!claims) return true;
    const classId = decodeURIComponent(match[1]);
    try {
        await input.store.getClassMembersForViewer(classId, claims.sub);
        const state = await input.store.getClassroomState(classId);
        jsonOk(res, {
            boardFocus: state.boardFocus,
            viewLayout: state.viewLayout,
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (message === "not_authorized") {
            jsonError(res, 403, "not_authorized", "Not authorized.");
        } else {
            console.error("[classroom-view-state] error", {
                ...input.logMeta,
                error: message,
            });
            jsonError(res, 500, "server_error", "Failed to load view state.");
        }
    }
    return true;
}

import type { IncomingMessage, ServerResponse } from "node:http";
import { readJson } from "../../../../api/reuse/read-json.js";
import { jsonError, jsonOk } from "../../../../api/reuse/json-responses.js";
import type { DbClassesStore } from "../store/index.js";
import type { ClassesRouteOptions } from "./route-helpers.js";

export async function handleClassUpdateRoute(
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
    const classMatch = url.pathname.match(
        /^\/api\/v1\/study\/classes\/([^/]+)$/,
    );
    if (!classMatch || req.method !== "PATCH") {
        return false;
    }
    const claims = input.ctx.requireAuth(req, res, "teacher");
    if (!claims) return true;
    const classId = decodeURIComponent(classMatch[1]);
    const body = (await readJson(req)) as { name?: unknown };
    const className = String(body?.name ?? "").trim();
    if (!className) {
        jsonError(res, 400, "bad_request", "name is required.");
        return true;
    }
    try {
        const updated = await input.store.updateClassNameForTeacher(
            classId,
            claims.sub,
            className,
        );
        jsonOk(res, updated);
    } catch (error) {
        if (
            error instanceof Error &&
            (error.message === "not_authorized" ||
                error.message === "invalid_class_name")
        ) {
            jsonError(
                res,
                error.message === "not_authorized" ? 403 : 400,
                error.message,
                error.message === "not_authorized"
                    ? "Teacher access required."
                    : "name is required.",
            );
            return true;
        }
        input.options.log?.("error", "Failed to rename class.", {
            ...input.logMeta,
            accountId: claims.sub,
            classId,
            error: error instanceof Error ? error.message : String(error),
        });
        jsonError(res, 500, "internal_error", "Failed to update class.");
    }
    return true;
}

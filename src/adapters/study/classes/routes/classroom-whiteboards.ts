import type { IncomingMessage, ServerResponse } from "node:http";
import { readJson } from "../../../../api/reuse/read-json.js";
import { jsonError, jsonOk } from "../../../../api/reuse/json-responses.js";
import type { RouteContext } from "../../../../api/reuse/route-context.js";
import type { DbClassesStore } from "../store/index.js";

interface WhiteboardRouteOptions {
    log?: (
        level: string,
        message: string,
        meta?: Record<string, unknown>,
    ) => void;
}

export async function handleClassroomWhiteboardRoutes(input: {
    req: IncomingMessage;
    res: ServerResponse;
    url: URL;
    ctx: RouteContext;
    store: DbClassesStore;
    options: WhiteboardRouteOptions;
    logMeta: Record<string, unknown>;
}): Promise<boolean> {
    const { req, res, url, ctx, store, options, logMeta } = input;

    const listMatch = url.pathname.match(
        /^\/api\/v1\/study\/classes\/([^/]+)\/whiteboards$/,
    );
    if (listMatch && req.method === "GET") {
        const claims = ctx.requireAuth(req, res, "user");
        if (!claims) return true;
        const classId = decodeURIComponent(listMatch[1]);
        try {
            const visibleWhiteboardId = await getStudentVisibleWhiteboardId(
                store,
                classId,
                claims.sub,
            );
            const boards = await store.listClassroomWhiteboards(
                classId,
                claims.sub,
            );
            jsonOk(
                res,
                visibleWhiteboardId
                    ? boards.filter(
                          (board) => String(board.id) === visibleWhiteboardId,
                      )
                    : claims.role === "teacher"
                      ? boards
                      : [],
            );
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
            options.log?.("error", "Failed to list whiteboards.", {
                ...logMeta,
                accountId: claims.sub,
                classId,
                error: err instanceof Error ? err.message : String(err),
            });
            jsonError(
                res,
                500,
                "internal_error",
                "Failed to list whiteboards.",
            );
        }
        return true;
    }

    if (listMatch && req.method === "POST") {
        const claims = ctx.requireAuth(req, res, "teacher");
        if (!claims) return true;
        const classId = decodeURIComponent(listMatch[1]);
        const body = (await readJson(req)) as { name?: unknown };
        if (body.name != null && typeof body.name !== "string") {
            jsonError(res, 400, "bad_request", "name must be a string.");
            return true;
        }
        const name = typeof body.name === "string" ? body.name.trim() : "";
        try {
            const board = await store.createClassroomWhiteboard(
                classId,
                claims.sub,
                name || "Whiteboard",
            );
            res.writeHead(201, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: board }));
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
            options.log?.("error", "Failed to create whiteboard.", {
                ...logMeta,
                accountId: claims.sub,
                classId,
                error: err instanceof Error ? err.message : String(err),
            });
            jsonError(
                res,
                500,
                "internal_error",
                "Failed to create whiteboard.",
            );
        }
        return true;
    }

    const boardMatch = url.pathname.match(
        /^\/api\/v1\/study\/classes\/([^/]+)\/whiteboards\/([^/]+)$/,
    );
    if (boardMatch && req.method === "DELETE") {
        const claims = ctx.requireAuth(req, res, "teacher");
        if (!claims) return true;
        const classId = decodeURIComponent(boardMatch[1]);
        const boardId = decodeURIComponent(boardMatch[2]);
        try {
            await store.deleteClassroomWhiteboard(classId, boardId, claims.sub);
            jsonOk(res, { success: true });
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
            options.log?.("error", "Failed to delete whiteboard.", {
                ...logMeta,
                accountId: claims.sub,
                classId,
                boardId,
                error: err instanceof Error ? err.message : String(err),
            });
            jsonError(
                res,
                500,
                "internal_error",
                "Failed to delete whiteboard.",
            );
        }
        return true;
    }

    const tokenMatch = url.pathname.match(
        /^\/api\/v1\/study\/classes\/([^/]+)\/whiteboards\/([^/]+)\/token$/,
    );
    if (tokenMatch && req.method === "GET") {
        const claims = ctx.requireAuth(req, res, "user");
        if (!claims) return true;
        const classId = decodeURIComponent(tokenMatch[1]);
        const boardId = decodeURIComponent(tokenMatch[2]);

        const getClassroomBoardEmbed = ctx.getCapability<
            (input: {
                classId: string;
                boardId: string;
                userId: string;
                userName: string;
                isTeacher: boolean;
            }) => Promise<{ embedUrl: string } | { error: string }>
        >("whiteboard:getClassroomBoardEmbed");

        if (!getClassroomBoardEmbed) {
            jsonError(
                res,
                503,
                "not_configured",
                "Whiteboard service is not configured.",
            );
            return true;
        }

        try {
            const board = await store.getClassroomWhiteboard(
                classId,
                boardId,
                claims.sub,
            );
            if (!board) {
                jsonError(res, 404, "not_found", "Whiteboard not found.");
                return true;
            }
            const result = await getClassroomBoardEmbed({
                classId,
                boardId,
                userId: claims.sub,
                userName: claims.sub,
                isTeacher: claims.role === "teacher",
            });
            if ("error" in result) {
                const status = result.error === "not_configured" ? 503 : 403;
                const code =
                    result.error === "not_configured"
                        ? "not_configured"
                        : "forbidden";
                const message =
                    result.error === "not_configured"
                        ? "Whiteboard service is not configured."
                        : "Whiteboard is not currently active.";
                jsonError(res, status, code, message);
                return true;
            }
            jsonOk(res, {
                embedUrl: result.embedUrl,
                boardId,
                name: board.name,
            });
        } catch (err) {
            options.log?.("error", "Failed to open whiteboard.", {
                ...logMeta,
                accountId: claims.sub,
                classId,
                boardId,
                error: err instanceof Error ? err.message : String(err),
            });
            jsonError(res, 500, "internal_error", "Failed to open whiteboard.");
        }
        return true;
    }

    const saveMatch = url.pathname.match(
        /^\/api\/v1\/study\/classes\/([^/]+)\/whiteboards\/([^/]+)\/save$/,
    );
    if (saveMatch && req.method === "POST") {
        const claims = ctx.requireAuth(req, res, "user");
        if (!claims) return true;
        const classId = decodeURIComponent(saveMatch[1]);
        const boardId = decodeURIComponent(saveMatch[2]);

        const fetchBoardData = ctx.getCapability<
            (boardId: string) => Promise<string | null>
        >("whiteboard:fetchBoardData");

        if (!fetchBoardData) {
            jsonError(
                res,
                503,
                "not_configured",
                "Whiteboard service is not configured.",
            );
            return true;
        }

        const isTeacher = claims.role === "teacher";
        try {
            if (!isTeacher) {
                const classResources = ctx.getCapability<{
                    getActiveWhiteboardId: (
                        classId: string,
                        userId: string,
                    ) => Promise<string | null>;
                }>("study:classes:resources");
                const activeId = await classResources?.getActiveWhiteboardId?.(
                    classId,
                    claims.sub,
                );
                if (!activeId || activeId !== boardId) {
                    jsonError(
                        res,
                        403,
                        "forbidden",
                        "Whiteboard is not currently active.",
                    );
                    return true;
                }
            }
            const board = await store.getClassroomWhiteboard(
                classId,
                boardId,
                claims.sub,
            );
            if (!board) {
                jsonError(res, 404, "not_found", "Whiteboard not found.");
                return true;
            }
            const data = await fetchBoardData(boardId);
            if (data === null) {
                jsonError(
                    res,
                    502,
                    "upstream_error",
                    "Failed to fetch whiteboard data.",
                );
                return true;
            }
            const fileKey = `whiteboards/${classId}/${boardId}.json`;
            await store.setWhiteboardFileKey(classId, boardId, fileKey);
            jsonOk(res, { fileKey, size: data.length });
        } catch (err) {
            options.log?.("error", "Failed to save whiteboard.", {
                ...logMeta,
                accountId: claims.sub,
                classId,
                boardId,
                error: err instanceof Error ? err.message : String(err),
            });
            jsonError(res, 500, "internal_error", "Failed to save whiteboard.");
        }
        return true;
    }

    return false;
}

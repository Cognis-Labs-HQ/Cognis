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

type WhiteboardRow = {
    id: string;
    classId: string;
    name: string;
    fileKey: string | null;
    createdBy: string;
    createdAt: string;
};

async function assertClassMember(
    store: DbClassesStore,
    classId: string,
    accountId: string,
): Promise<{ isTeacher: boolean }> {
    const classRow = await store.getClassById(classId);
    if (!classRow) throw new Error("not_authorized");
    if (classRow.teacherAccountId === accountId) return { isTeacher: true };
    const status = await store.getStudentMembershipStatus(classId, accountId);
    if (status !== "member") throw new Error("not_authorized");
    return { isTeacher: false };
}

async function assertClassTeacher(
    store: DbClassesStore,
    classId: string,
    accountId: string,
): Promise<void> {
    const classRow = await store.getClassById(classId);
    if (!classRow || classRow.teacherAccountId !== accountId) {
        throw new Error("not_authorized");
    }
}

function requireWhiteboardCapability<T>(
    ctx: RouteContext,
    name: string,
): T | null {
    return ctx.getCapability<T>(name) ?? null;
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

        const listBoards = requireWhiteboardCapability<
            (classId: string) => Promise<WhiteboardRow[]>
        >(ctx, "whiteboard:classroom.list");
        if (!listBoards) {
            jsonError(
                res,
                503,
                "not_configured",
                "Whiteboard service is not configured.",
            );
            return true;
        }

        try {
            await assertClassMember(store, classId, claims.sub);
            const boards = await listBoards(classId);
            if (claims.role === "teacher") {
                jsonOk(res, boards);
                return true;
            }
            const classResources = ctx.getCapability<{
                getActiveWhiteboardId: (
                    classId: string,
                    userId: string,
                ) => Promise<string | null>;
            }>("study:classes:resources");
            const activeId =
                await classResources?.getActiveWhiteboardId?.(
                    classId,
                    claims.sub,
                ) ?? null;
            jsonOk(
                res,
                activeId
                    ? boards.filter(
                          (board) => String(board.id) === activeId,
                      )
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

        const createBoard = requireWhiteboardCapability<
            (
                classId: string,
                createdBy: string,
                name: string,
            ) => Promise<WhiteboardRow>
        >(ctx, "whiteboard:classroom.create");
        if (!createBoard) {
            jsonError(
                res,
                503,
                "not_configured",
                "Whiteboard service is not configured.",
            );
            return true;
        }

        try {
            await assertClassTeacher(store, classId, claims.sub);
            const board = await createBoard(
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

        const deleteBoard = requireWhiteboardCapability<
            (classId: string, boardId: string) => Promise<void>
        >(ctx, "whiteboard:classroom.delete");
        if (!deleteBoard) {
            jsonError(
                res,
                503,
                "not_configured",
                "Whiteboard service is not configured.",
            );
            return true;
        }

        try {
            await assertClassTeacher(store, classId, claims.sub);
            await deleteBoard(classId, boardId);
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

        const getBoard = requireWhiteboardCapability<
            (
                classId: string,
                boardId: string,
            ) => Promise<WhiteboardRow | null>
        >(ctx, "whiteboard:classroom.get");
        if (!getBoard) {
            jsonError(
                res,
                503,
                "not_configured",
                "Whiteboard service is not configured.",
            );
            return true;
        }

        try {
            await assertClassMember(store, classId, claims.sub);
            const board = await getBoard(classId, boardId);
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

        const getBoard = requireWhiteboardCapability<
            (
                classId: string,
                boardId: string,
            ) => Promise<WhiteboardRow | null>
        >(ctx, "whiteboard:classroom.get");
        const setFileKey = requireWhiteboardCapability<
            (
                classId: string,
                boardId: string,
                fileKey: string,
            ) => Promise<void>
        >(ctx, "whiteboard:classroom.setFileKey");

        if (!getBoard || !setFileKey) {
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
            await assertClassMember(store, classId, claims.sub);
            if (!isTeacher) {
                const classResources = ctx.getCapability<{
                    getActiveWhiteboardId: (
                        classId: string,
                        userId: string,
                    ) => Promise<string | null>;
                }>("study:classes:resources");
                const activeId =
                    await classResources?.getActiveWhiteboardId?.(
                        classId,
                        claims.sub,
                    ) ?? null;
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
            const board = await getBoard(classId, boardId);
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
            await setFileKey(classId, boardId, fileKey);
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

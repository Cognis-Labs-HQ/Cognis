import type { IncomingMessage, ServerResponse } from "node:http";
import { readJson } from "../../../../api/reuse/read-json.js";
import { jsonError, jsonOk } from "../../../../api/reuse/json-responses.js";
import type { RouteContext } from "../../../../api/reuse/route-context.js";
import type { DbClassesStore } from "../store/index.js";

interface ClassroomNotebookRouteOptions {
    areFriends?: (accountA: string, accountB: string) => Promise<boolean>;
    log?: (
        level: string,
        message: string,
        meta?: Record<string, unknown>,
    ) => void;
}

export async function handleClassroomNotebookRoutes(input: {
    req: IncomingMessage;
    res: ServerResponse;
    url: URL;
    ctx: RouteContext;
    store: DbClassesStore;
    options: ClassroomNotebookRouteOptions;
    logMeta: Record<string, unknown>;
}): Promise<boolean> {
    const { req, res, url, ctx, store, options, logMeta } = input;
    const classroomResourcesMatch = url.pathname.match(
        /^\/api\/v1\/study\/classes\/([^/]+)\/resources$/,
    );
    if (
        classroomResourcesMatch &&
        (req.method === "GET" || req.method === "PUT")
    ) {
        const claims = ctx.requireAuth(req, res, "user");
        if (!claims) return true;
        const classId = decodeURIComponent(classroomResourcesMatch[1]);
        try {
            if (req.method === "GET") {
                const resources = await store.getClassroomResourcesForViewer(
                    classId,
                    claims.sub,
                );
                jsonOk(res, resources);
                return true;
            }
            if (claims.role !== "teacher") {
                jsonError(
                    res,
                    403,
                    "forbidden",
                    "Only teachers can edit class resources.",
                );
                return true;
            }
            const body = (await readJson(req)) as {
                materials?: unknown;
                homework?: unknown;
                files?: unknown;
            };
            if (body.materials != null && typeof body.materials !== "string") {
                jsonError(
                    res,
                    400,
                    "bad_request",
                    "materials must be a string.",
                );
                return true;
            }
            if (body.homework != null && typeof body.homework !== "string") {
                jsonError(
                    res,
                    400,
                    "bad_request",
                    "homework must be a string.",
                );
                return true;
            }
            if (body.files != null && !Array.isArray(body.files)) {
                jsonError(res, 400, "bad_request", "files must be an array.");
                return true;
            }
            const materials =
                typeof body.materials === "string" ? body.materials : undefined;
            const homework =
                typeof body.homework === "string" ? body.homework : undefined;
            const files = Array.isArray(body.files)
                ? (
                      body.files as Array<{
                          key: string;
                          name: string;
                          contentType?: string;
                      }>
                  ).filter(
                      (item) =>
                          item !== null &&
                          typeof item === "object" &&
                          typeof item.key === "string" &&
                          typeof item.name === "string",
                  )
                : undefined;
            const resources = await store.updateClassroomResourcesForTeacher(
                classId,
                claims.sub,
                { materials, homework, files },
            );
            jsonOk(res, resources);
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
            options.log?.("error", "Failed to handle class resources.", {
                ...logMeta,
                accountId: claims.sub,
                classId,
                error: err instanceof Error ? err.message : String(err),
            });
            jsonError(
                res,
                500,
                "internal_error",
                "Failed to handle class resources.",
            );
        }
        return true;
    }

    const ownNotebookMatch = url.pathname.match(
        /^\/api\/v1\/study\/classes\/([^/]+)\/notebook$/,
    );
    if (ownNotebookMatch && (req.method === "GET" || req.method === "PUT")) {
        const claims = ctx.requireAuth(req, res, "user");
        if (!claims) return true;
        const classId = decodeURIComponent(ownNotebookMatch[1]);
        try {
            if (req.method === "GET") {
                const notebook = await store.getOwnNotebook(
                    classId,
                    claims.sub,
                );
                jsonOk(res, notebook);
                return true;
            }
            const body = (await readJson(req)) as { noteText?: unknown };
            if (body.noteText != null && typeof body.noteText !== "string") {
                jsonError(
                    res,
                    400,
                    "bad_request",
                    "noteText must be a string.",
                );
                return true;
            }
            const noteText =
                typeof body.noteText === "string" ? body.noteText : "";
            const notebook = await store.updateOwnNotebook(
                classId,
                claims.sub,
                noteText,
            );
            jsonOk(res, notebook);
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
            options.log?.("error", "Failed to handle own notebook.", {
                ...logMeta,
                accountId: claims.sub,
                classId,
                error: err instanceof Error ? err.message : String(err),
            });
            jsonError(res, 500, "internal_error", "Failed to handle notebook.");
        }
        return true;
    }

    const notebookViewMatch = url.pathname.match(
        /^\/api\/v1\/study\/classes\/([^/]+)\/notebooks\/([^/]+)$/,
    );
    if (notebookViewMatch && req.method === "GET") {
        const claims = ctx.requireAuth(req, res, "user");
        if (!claims) return true;
        const classId = decodeURIComponent(notebookViewMatch[1]);
        const ownerStudentAccountId = decodeURIComponent(notebookViewMatch[2]);
        try {
            const notebook = await store.getNotebookForViewer(
                classId,
                ownerStudentAccountId,
                claims.sub,
                options.areFriends,
            );
            jsonOk(res, notebook);
        } catch (err) {
            if (
                err instanceof Error &&
                err.message === "access_request_required"
            ) {
                jsonError(
                    res,
                    403,
                    "access_request_required",
                    "Notebook access approval required.",
                );
                return true;
            }
            if (err instanceof Error && err.message === "not_authorized") {
                jsonError(
                    res,
                    403,
                    "forbidden",
                    "Class not found or access denied.",
                );
                return true;
            }
            options.log?.("error", "Failed to load notebook.", {
                ...logMeta,
                accountId: claims.sub,
                classId,
                ownerStudentAccountId,
                error: err instanceof Error ? err.message : String(err),
            });
            jsonError(res, 500, "internal_error", "Failed to load notebook.");
        }
        return true;
    }

    const notebookRequestMatch = url.pathname.match(
        /^\/api\/v1\/study\/classes\/([^/]+)\/notebooks\/([^/]+)\/request$/,
    );
    if (notebookRequestMatch && req.method === "POST") {
        const claims = ctx.requireAuth(req, res, "user");
        if (!claims) return true;
        const classId = decodeURIComponent(notebookRequestMatch[1]);
        const ownerStudentAccountId = decodeURIComponent(
            notebookRequestMatch[2],
        );
        try {
            const request = await store.requestNotebookAccess(
                classId,
                ownerStudentAccountId,
                claims.sub,
            );
            res.writeHead(201, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: request }));
        } catch (err) {
            if (err instanceof Error && err.message === "bad_request") {
                jsonError(
                    res,
                    400,
                    "bad_request",
                    "Cannot request access to your own notebook.",
                );
                return true;
            }
            if (err instanceof Error && err.message === "not_authorized") {
                jsonError(
                    res,
                    403,
                    "forbidden",
                    "Class not found or access denied.",
                );
                return true;
            }
            options.log?.("error", "Failed to request notebook access.", {
                ...logMeta,
                accountId: claims.sub,
                classId,
                ownerStudentAccountId,
                error: err instanceof Error ? err.message : String(err),
            });
            jsonError(
                res,
                500,
                "internal_error",
                "Failed to request notebook access.",
            );
        }
        return true;
    }

    const notebookRequestsForOwnerMatch = url.pathname.match(
        /^\/api\/v1\/study\/classes\/([^/]+)\/notebook-requests$/,
    );
    if (notebookRequestsForOwnerMatch && req.method === "GET") {
        const claims = ctx.requireAuth(req, res, "user");
        if (!claims) return true;
        const classId = decodeURIComponent(notebookRequestsForOwnerMatch[1]);
        try {
            const requests = await store.listIncomingNotebookAccessRequests(
                classId,
                claims.sub,
            );
            jsonOk(res, requests);
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
            options.log?.(
                "error",
                "Failed to list incoming notebook requests.",
                {
                    ...logMeta,
                    accountId: claims.sub,
                    classId,
                    error: err instanceof Error ? err.message : String(err),
                },
            );
            jsonError(
                res,
                500,
                "internal_error",
                "Failed to list notebook requests.",
            );
        }
        return true;
    }

    const notebookReviewMatch = url.pathname.match(
        /^\/api\/v1\/study\/classes\/([^/]+)\/notebooks\/([^/]+)\/requests\/([^/]+)\/(approve|reject)$/,
    );
    if (notebookReviewMatch && req.method === "POST") {
        const claims = ctx.requireAuth(req, res, "user");
        if (!claims) return true;
        const classId = decodeURIComponent(notebookReviewMatch[1]);
        const ownerStudentAccountId = decodeURIComponent(
            notebookReviewMatch[2],
        );
        const viewerStudentAccountId = decodeURIComponent(
            notebookReviewMatch[3],
        );
        const action = notebookReviewMatch[4] as "approve" | "reject";
        if (ownerStudentAccountId !== claims.sub) {
            jsonError(
                res,
                403,
                "forbidden",
                "Only notebook owners can review access requests.",
            );
            return true;
        }
        try {
            const reviewed = await store.reviewNotebookAccessRequest(
                classId,
                ownerStudentAccountId,
                viewerStudentAccountId,
                action === "approve",
            );
            jsonOk(res, reviewed);
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
            options.log?.("error", "Failed to review notebook access.", {
                ...logMeta,
                accountId: claims.sub,
                classId,
                ownerStudentAccountId,
                viewerStudentAccountId,
                action,
                error: err instanceof Error ? err.message : String(err),
            });
            jsonError(
                res,
                500,
                "internal_error",
                "Failed to review notebook access.",
            );
        }
        return true;
    }

    return false;
}

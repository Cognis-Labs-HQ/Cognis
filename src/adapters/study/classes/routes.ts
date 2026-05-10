/**
 * API routes for the classes adapter.
 *
 * Endpoints:
 *   GET  /api/v1/study/classes                 — list caller's classes (teacher view)
 *   POST /api/v1/study/teacher-requests        — submit a teacher request for a language
 *   GET  /api/v1/study/teacher-requests        — list all pending requests (admin only)
 *   POST /api/v1/study/teacher-requests/:id/approve — approve a pending request (admin)
 *   POST /api/v1/study/teacher-requests/:id/reject  — reject a pending request (admin)
 *
 * @module adapters/study/classes/routes
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { requireAuth } from "../../../api/auth/guard.js";
import { readJson } from "../../../api/reuse/read-json.js";
import type { DbClassesStore } from "./store.js";

function jsonOk(res: ServerResponse, data: unknown): void {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ data }));
}

function jsonError(
    res: ServerResponse,
    status: number,
    code: string,
    message: string,
): void {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: { code, message } }));
}

export function createClassesRoutes(
    store: DbClassesStore,
): (req: IncomingMessage, res: ServerResponse, url: URL) => Promise<boolean> {
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (url.pathname === "/api/v1/study/classes" && req.method === "GET") {
            const claims = requireAuth(req, res, "user");
            if (!claims) return true;
            const classes = await store.getClassesForTeacher(claims.accountId);
            jsonOk(res, classes);
            return true;
        }

        if (
            url.pathname === "/api/v1/study/teacher-requests" &&
            req.method === "POST"
        ) {
            const claims = requireAuth(req, res, "user");
            if (!claims) return true;

            const body = (await readJson(req)) as { languageCode?: unknown };
            const languageCode =
                typeof body?.languageCode === "string"
                    ? body.languageCode.trim()
                    : "";
            if (!languageCode) {
                jsonError(res, 400, "bad_request", "languageCode is required.");
                return true;
            }

            const existing = await store.getTeacherRequest(
                claims.accountId,
                languageCode,
            );
            if (existing) {
                jsonOk(res, existing);
                return true;
            }

            const request = await store.submitTeacherRequest(
                claims.accountId,
                languageCode,
            );
            res.writeHead(201, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: request }));
            return true;
        }

        if (
            url.pathname === "/api/v1/study/teacher-requests" &&
            req.method === "GET"
        ) {
            if (!requireAuth(req, res, "admin")) return true;
            const pending = await store.listPendingRequests();
            jsonOk(res, pending);
            return true;
        }

        const approveMatch = url.pathname.match(
            /^\/api\/v1\/study\/teacher-requests\/([^/]+)\/(approve|reject)$/,
        );
        if (approveMatch && req.method === "POST") {
            const claims = requireAuth(req, res, "admin");
            if (!claims) return true;

            const requestId = decodeURIComponent(approveMatch[1]);
            const action = approveMatch[2] as "approve" | "reject";

            if (action === "approve") {
                const classRow = await store.approveTeacherRequest(
                    requestId,
                    claims.accountId,
                );
                if (!classRow) {
                    jsonError(
                        res,
                        404,
                        "not_found",
                        "Request not found or already reviewed.",
                    );
                    return true;
                }
                jsonOk(res, classRow);
            } else {
                await store.rejectTeacherRequest(requestId, claims.accountId);
                jsonOk(res, { rejected: true });
            }
            return true;
        }

        return false;
    };
}

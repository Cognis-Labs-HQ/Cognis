/**
 * API routes for the classes adapter.
 *
 * Endpoints:
 *   GET    /api/v1/study/classes                                              — list caller's classes (teacher view, supports ?language= filter)
 *   GET    /api/v1/study/my-classes                                           — list enrolled classes (student view)
 *   GET    /api/v1/study/available-classes                                    — list joinable classes (student view, supports ?language= filter)
 *   GET    /api/v1/study/preferences                                          — read caller's study language preferences
 *   PUT    /api/v1/study/preferences                                          — save caller's study language preferences
 *   POST   /api/v1/study/teacher-requests                                     — submit or auto-approve a teacher request for a language
 *   GET    /api/v1/study/teacher-requests                                     — list all pending requests (admin only)
 *   POST   /api/v1/study/teacher-requests/:id/approve                         — approve a pending request (admin)
 *   POST   /api/v1/study/teacher-requests/:id/reject                          — reject a pending request (admin)
 *   POST   /api/v1/study/classes/:classId/join                                — request to join a class (student)
 *   DELETE /api/v1/study/classes/:classId/membership                          — leave a class (student)
 *   GET    /api/v1/study/classes/:classId/members                             — list class members (teacher, supports ?search=)
 *   GET    /api/v1/study/classes/:classId/join-requests                       — list pending join requests (teacher)
 *   POST   /api/v1/study/classes/:classId/invite                              — invite a student directly (teacher)
 *   POST   /api/v1/study/classes/:classId/join-requests/:studentId/approve    — approve a join request (teacher)
 *   POST   /api/v1/study/classes/:classId/join-requests/:studentId/reject     — reject a join request (teacher)
 *
 * @module adapters/study/classes/routes
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { requireAuth } from "../../../gateways/auth/guard.js";
import { readJson } from "../../../api/reuse/read-json.js";
import type { DbClassesStore, StudyLanguageRow } from "./store.js";

type SetRole = (username: string, role: "teacher") => Promise<void>;
type DispatchToRole = (
    role: "admin" | "teacher" | "user",
    envelope: {
        category: string;
        subject: string;
        body: string;
        senderName?: string;
        actionUrl?: string;
        metadata?: Record<string, unknown>;
    },
) => Promise<unknown>;

export interface ClassesRouteOptions {
    requireTeacherManualApproval?: () => Promise<boolean> | boolean;
    setRole?: SetRole;
    setProfileRole?: SetRole;
    dispatchToRole?: DispatchToRole;
    accountExists?: (accountId: string) => Promise<boolean>;
    log?: (
        level: string,
        message: string,
        meta?: Record<string, unknown>,
    ) => void;
}

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

function normalizeLanguageList(input: unknown): string[] {
    if (!Array.isArray(input)) return [];
    return [
        ...new Set(
            input
                .filter((entry): entry is string => typeof entry === "string")
                .map((entry) => entry.trim().toLowerCase())
                .filter(Boolean)
                .slice(0, 25),
        ),
    ];
}

export function createClassesRoutes(
    store: DbClassesStore,
    options: ClassesRouteOptions = {},
): (req: IncomingMessage, res: ServerResponse, url: URL) => Promise<boolean> {
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        const logMeta = {
            component: "study-classes-routes",
            method: req.method ?? "GET",
            path: url.pathname,
        };

        if (url.pathname === "/api/v1/study/classes" && req.method === "GET") {
            const claims = requireAuth(req, res, "teacher");
            if (!claims) return true;
            const languageFilter =
                url.searchParams.get("language") ?? undefined;
            const classes = await store.getClassesForTeacherWithFilter(
                claims.sub,
                languageFilter || undefined,
            );
            jsonOk(res, classes);
            return true;
        }

        if (
            url.pathname === "/api/v1/study/my-classes" &&
            req.method === "GET"
        ) {
            const claims = requireAuth(req, res, "user");
            if (!claims) return true;
            try {
                const classes = await store.getEnrolledClasses(claims.sub);
                jsonOk(res, classes);
            } catch (err) {
                options.log?.("error", "Failed to load enrolled classes.", {
                    ...logMeta,
                    accountId: claims.sub,
                    error: err instanceof Error ? err.message : String(err),
                });
                jsonError(
                    res,
                    500,
                    "internal_error",
                    "Failed to load classes.",
                );
            }
            return true;
        }

        if (
            url.pathname === "/api/v1/study/available-classes" &&
            req.method === "GET"
        ) {
            const claims = requireAuth(req, res, "user");
            if (!claims) return true;
            try {
                const languageCode =
                    url.searchParams.get("language") ?? undefined;
                const classes = await store.getAvailableClasses(
                    languageCode || undefined,
                    claims.sub,
                );
                jsonOk(res, classes);
            } catch (err) {
                options.log?.("error", "Failed to load available classes.", {
                    ...logMeta,
                    accountId: claims.sub,
                    error: err instanceof Error ? err.message : String(err),
                });
                jsonError(
                    res,
                    500,
                    "internal_error",
                    "Failed to load classes.",
                );
            }
            return true;
        }

        if (
            url.pathname === "/api/v1/study/preferences" &&
            req.method === "GET"
        ) {
            const claims = requireAuth(req, res, "user");
            if (!claims) return true;
            const prefs = await store.getStudyPreferences(claims.sub);
            jsonOk(res, prefs);
            return true;
        }

        if (
            url.pathname === "/api/v1/study/preferences" &&
            req.method === "PUT"
        ) {
            const claims = requireAuth(req, res, "user");
            if (!claims) return true;
            const body = (await readJson(req)) as {
                learningLanguages?: unknown;
                teachingLanguages?: unknown;
            };
            const learningLanguages = normalizeLanguageList(
                body.learningLanguages,
            );
            const teachingLanguages = normalizeLanguageList(
                body.teachingLanguages,
            );
            const prefs = await store.saveStudyPreferences(
                claims.sub,
                learningLanguages,
                teachingLanguages,
            );
            options.log?.("info", "Saved study preferences.", {
                ...logMeta,
                accountId: claims.sub,
                learningLanguageCount: learningLanguages.length,
                teachingLanguageCount: teachingLanguages.length,
            });
            jsonOk(res, prefs);
            return true;
        }

        if (
            url.pathname === "/api/v1/study/teacher-requests" &&
            req.method === "POST"
        ) {
            const claims = requireAuth(req, res, "user");
            if (!claims) return true;

            const body = (await readJson(req)) as {
                languageCode?: unknown;
                reason?: unknown;
            };
            const languageCode =
                typeof body?.languageCode === "string"
                    ? body.languageCode.trim().toLowerCase()
                    : "";
            const reason =
                typeof body?.reason === "string" ? body.reason.trim() : "";
            if (!languageCode) {
                jsonError(res, 400, "bad_request", "languageCode is required.");
                return true;
            }

            const existing = await store.getTeacherRequest(
                claims.sub,
                languageCode,
            );
            if (existing?.status === "pending") {
                jsonOk(res, existing);
                return true;
            }

            const requiresApproval =
                (await options.requireTeacherManualApproval?.()) ?? true;
            if (!requiresApproval) {
                const request =
                    existing ??
                    (await store.submitTeacherRequest(
                        claims.sub,
                        languageCode,
                        reason || null,
                    ));
                const classRow = await store.approveTeacherRequest(
                    request.id,
                    claims.sub,
                );
                await options.setRole?.(claims.sub, "teacher");
                await options.setProfileRole?.(claims.sub, "teacher");
                options.log?.("info", "Auto-approved teacher request.", {
                    ...logMeta,
                    accountId: claims.sub,
                    languageCode,
                });
                jsonOk(res, { request, class: classRow, autoApproved: true });
                return true;
            }

            if (!reason) {
                jsonError(res, 400, "bad_request", "reason is required.");
                return true;
            }

            const request = await store.submitTeacherRequest(
                claims.sub,
                languageCode,
                reason,
            );
            await options.dispatchToRole?.("admin", {
                category: "study",
                subject: `Teacher application for ${languageCode}`,
                body: `${claims.sub} applied to teach ${languageCode}.`,
                senderName: claims.sub,
                actionUrl: "/classes",
                metadata: {
                    requestId: request.id,
                    accountId: claims.sub,
                    languageCode,
                },
            });
            options.log?.("info", "Submitted teacher request.", {
                ...logMeta,
                accountId: claims.sub,
                languageCode,
                requestId: request.id,
            });
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
                    claims.sub,
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
                await options.setRole?.(classRow.teacherAccountId, "teacher");
                await options.setProfileRole?.(
                    classRow.teacherAccountId,
                    "teacher",
                );
                options.log?.("info", "Approved teacher request.", {
                    ...logMeta,
                    accountId: claims.sub,
                    teacherAccountId: classRow.teacherAccountId,
                    languageCode: classRow.languageCode,
                    requestId,
                });
                jsonOk(res, classRow);
            } else {
                await store.rejectTeacherRequest(requestId, claims.sub);
                options.log?.("info", "Rejected teacher request.", {
                    ...logMeta,
                    accountId: claims.sub,
                    requestId,
                });
                jsonOk(res, { rejected: true });
            }
            return true;
        }

        if (
            url.pathname === "/api/v1/study/languages" &&
            req.method === "GET"
        ) {
            const claims = requireAuth(req, res, "user");
            if (!claims) return true;
            const languages = await store.listStudyLanguages(true);
            jsonOk(res, languages);
            return true;
        }

        if (
            url.pathname === "/api/v1/study/languages" &&
            req.method === "POST"
        ) {
            const claims = requireAuth(req, res, "admin");
            if (!claims) return true;
            const body = (await readJson(req)) as Partial<StudyLanguageRow> & {
                code?: string;
            };
            if (!body?.code || typeof body.code !== "string") {
                jsonError(res, 400, "bad_request", "code is required.");
                return true;
            }
            const language = await store.upsertStudyLanguage(
                body as Partial<StudyLanguageRow> & { code: string },
            );
            options.log?.("info", "Upserted study language.", {
                ...logMeta,
                accountId: claims.sub,
                code: language.code,
            });
            jsonOk(res, language);
            return true;
        }

        const joinMatch = url.pathname.match(
            /^\/api\/v1\/study\/classes\/([^/]+)\/join$/,
        );
        if (joinMatch && req.method === "POST") {
            const claims = requireAuth(req, res, "user");
            if (!claims) return true;
            const classId = decodeURIComponent(joinMatch[1]);
            try {
                const membership = await store.requestJoinClass(
                    classId,
                    claims.sub,
                );
                options.log?.("info", "Student requested to join class.", {
                    ...logMeta,
                    accountId: claims.sub,
                    classId,
                    status: membership.status,
                });
                res.writeHead(201, { "content-type": "application/json" });
                res.end(JSON.stringify({ data: membership }));
            } catch (err) {
                options.log?.("error", "Failed to process join request.", {
                    ...logMeta,
                    accountId: claims.sub,
                    classId,
                    error: err instanceof Error ? err.message : String(err),
                });
                jsonError(res, 500, "internal_error", "Failed to join class.");
            }
            return true;
        }

        const membershipMatch = url.pathname.match(
            /^\/api\/v1\/study\/classes\/([^/]+)\/membership$/,
        );
        if (membershipMatch && req.method === "DELETE") {
            const claims = requireAuth(req, res, "user");
            if (!claims) return true;
            const classId = decodeURIComponent(membershipMatch[1]);
            try {
                await store.leaveClass(classId, claims.sub);
                options.log?.("info", "Student left class.", {
                    ...logMeta,
                    accountId: claims.sub,
                    classId,
                });
                jsonOk(res, { left: true });
            } catch (err) {
                options.log?.("error", "Failed to leave class.", {
                    ...logMeta,
                    accountId: claims.sub,
                    classId,
                    error: err instanceof Error ? err.message : String(err),
                });
                jsonError(res, 500, "internal_error", "Failed to leave class.");
            }
            return true;
        }

        const membersMatch = url.pathname.match(
            /^\/api\/v1\/study\/classes\/([^/]+)\/members$/,
        );
        if (membersMatch && req.method === "GET") {
            const claims = requireAuth(req, res, "teacher");
            if (!claims) return true;
            const classId = decodeURIComponent(membersMatch[1]);
            const searchQuery = url.searchParams.get("search") ?? undefined;
            try {
                const members = await store.getClassMembers(
                    classId,
                    claims.sub,
                    searchQuery || undefined,
                );
                jsonOk(res, members);
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
                options.log?.("error", "Failed to load class members.", {
                    ...logMeta,
                    accountId: claims.sub,
                    classId,
                    error: err instanceof Error ? err.message : String(err),
                });
                jsonError(
                    res,
                    500,
                    "internal_error",
                    "Failed to load members.",
                );
            }
            return true;
        }

        const joinRequestsMatch = url.pathname.match(
            /^\/api\/v1\/study\/classes\/([^/]+)\/join-requests$/,
        );
        if (joinRequestsMatch && req.method === "GET") {
            const claims = requireAuth(req, res, "teacher");
            if (!claims) return true;
            const classId = decodeURIComponent(joinRequestsMatch[1]);
            try {
                const requests = await store.getPendingJoinRequests(
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
                options.log?.("error", "Failed to load join requests.", {
                    ...logMeta,
                    accountId: claims.sub,
                    classId,
                    error: err instanceof Error ? err.message : String(err),
                });
                jsonError(
                    res,
                    500,
                    "internal_error",
                    "Failed to load requests.",
                );
            }
            return true;
        }

        const inviteMatch = url.pathname.match(
            /^\/api\/v1\/study\/classes\/([^/]+)\/invite$/,
        );
        if (inviteMatch && req.method === "POST") {
            const claims = requireAuth(req, res, "teacher");
            if (!claims) return true;
            const classId = decodeURIComponent(inviteMatch[1]);
            const body = (await readJson(req)) as { accountId?: unknown };
            const accountId =
                typeof body?.accountId === "string"
                    ? body.accountId.trim()
                    : "";
            if (!accountId) {
                jsonError(res, 400, "bad_request", "accountId is required.");
                return true;
            }
            if (
                options.accountExists &&
                !(await options.accountExists(accountId))
            ) {
                jsonError(res, 404, "not_found", "User not found.");
                return true;
            }
            try {
                const membership = await store.inviteToClass(
                    classId,
                    accountId,
                    claims.sub,
                );
                options.log?.("info", "Teacher invited student to class.", {
                    ...logMeta,
                    accountId: claims.sub,
                    classId,
                    studentAccountId: accountId,
                });
                jsonOk(res, membership);
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
                options.log?.("error", "Failed to invite student.", {
                    ...logMeta,
                    accountId: claims.sub,
                    classId,
                    error: err instanceof Error ? err.message : String(err),
                });
                jsonError(
                    res,
                    500,
                    "internal_error",
                    "Failed to invite student.",
                );
            }
            return true;
        }

        const reviewRequestMatch = url.pathname.match(
            /^\/api\/v1\/study\/classes\/([^/]+)\/join-requests\/([^/]+)\/(approve|reject)$/,
        );
        if (reviewRequestMatch && req.method === "POST") {
            const claims = requireAuth(req, res, "teacher");
            if (!claims) return true;
            const classId = decodeURIComponent(reviewRequestMatch[1]);
            const studentAccountId = decodeURIComponent(reviewRequestMatch[2]);
            const action = reviewRequestMatch[3] as "approve" | "reject";
            try {
                await store.reviewJoinRequest(
                    classId,
                    studentAccountId,
                    claims.sub,
                    action === "approve",
                );
                options.log?.("info", `Teacher ${action}d join request.`, {
                    ...logMeta,
                    accountId: claims.sub,
                    classId,
                    studentAccountId,
                });
                jsonOk(res, { reviewed: true, action });
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
                options.log?.("error", "Failed to review join request.", {
                    ...logMeta,
                    accountId: claims.sub,
                    classId,
                    studentAccountId,
                    error: err instanceof Error ? err.message : String(err),
                });
                jsonError(
                    res,
                    500,
                    "internal_error",
                    "Failed to review request.",
                );
            }
            return true;
        }

        return false;
    };
}

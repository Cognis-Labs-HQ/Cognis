import type { IncomingMessage, ServerResponse } from "node:http";
import { readJson } from "../../../../api/reuse/read-json.js";
import { jsonOk, jsonError } from "../../../../api/reuse/json-responses.js";
import { resolveRouteContext } from "../../../../api/reuse/route-context.js";
import type { DbClassesStore, StudyLanguageRow } from "../store/index.js";
import { handleClassroomNotebookRoutes } from "./classroom-notebooks.js";
import { handleClassroomWhiteboardRoutes } from "./classroom-whiteboards.js";
import { handleAvailableClassesRequest } from "./available-classes-route.js";
import { handleClassUpdateRoute } from "./class-update-route.js";
import { handleClassroomLayoutRoute } from "./classroom-layout-route.js";
import { handleClassroomViewStateRoute } from "./classroom-view-state-route.js";
import { handleClassroomFilesRoutes } from "./classroom-files-route.js";
import { handleTeacherRequestsRoutes } from "./teacher-requests-route.js";
import {
    decorateMemberships,
    normalizeLanguageList,
    resolveAgendaCalendarId,
    resolveClassroomMode,
    syncClassroomArtifacts,
    type ClassesRouteOptions,
} from "./route-helpers.js";

export function createClassesRoutes(
    store: DbClassesStore,
    options: ClassesRouteOptions = {},
): (req: IncomingMessage, res: ServerResponse, url: URL) => Promise<boolean> {
    const ctx = resolveRouteContext(options.routeContext);
    const languageNameCache = new Map<string, string>();

    const resolveStudyLanguageName = async (languageCode: string) => {
        const normalizedCode = String(languageCode ?? "")
            .trim()
            .toLowerCase();
        if (!normalizedCode) return "";
        if (languageNameCache.has(normalizedCode)) {
            return languageNameCache.get(normalizedCode) ?? "";
        }
        const languages = await store.listStudyLanguages(false);
        for (const language of languages) {
            languageNameCache.set(
                String(language.code ?? "")
                    .trim()
                    .toLowerCase(),
                String(language.name ?? "").trim(),
            );
        }
        return languageNameCache.get(normalizedCode) ?? "";
    };

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
            const claims = ctx.requireAuth(req, res, "teacher");
            if (!claims) return true;
            const languageFilter =
                url.searchParams.get("language") || undefined;
            const classes = await store.getClassesForTeacherWithFilter(
                claims.sub,
                languageFilter,
            );
            jsonOk(res, classes);
            return true;
        }

        if (
            url.pathname === "/api/v1/study/my-classes" &&
            req.method === "GET"
        ) {
            const claims = ctx.requireAuth(req, res, "user");
            if (!claims) return true;
            await handleEnrolledClassesRequest(store, options, res, {
                accountId: claims.sub,
                logMeta,
            });
            return true;
        }

        if (
            url.pathname === "/api/v1/study/available-classes" &&
            req.method === "GET"
        ) {
            const claims = ctx.requireAuth(req, res, "user");
            if (!claims) return true;
            await handleAvailableClassesRequest(store, options, res, {
                accountId: claims.sub,
                languageCode: url.searchParams.get("language") || undefined,
                searchQuery: String(
                    url.searchParams.get("search") ?? "",
                ).trim(),
                logMeta,
            });
            return true;
        }

        if (
            url.pathname === "/api/v1/study/preferences" &&
            req.method === "GET"
        ) {
            const claims = ctx.requireAuth(req, res, "user");
            if (!claims) return true;
            const prefs = await store.getStudyPreferences(claims.sub);
            jsonOk(res, prefs);
            return true;
        }

        if (
            url.pathname === "/api/v1/study/preferences" &&
            req.method === "PUT"
        ) {
            const claims = ctx.requireAuth(req, res, "user");
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
            await handleTeacherRequestsRoutes(req, res, url, {
                store,
                options,
                ctx,
                logMeta,
                resolveStudyLanguageName,
            })
        ) {
            return true;
        }

        if (
            url.pathname === "/api/v1/study/languages" &&
            req.method === "GET"
        ) {
            const claims = ctx.requireAuth(req, res, "user");
            if (!claims) return true;
            const languages = await store.listStudyLanguages(true);
            jsonOk(res, languages);
            return true;
        }

        if (
            url.pathname === "/api/v1/study/languages" &&
            req.method === "POST"
        ) {
            const claims = ctx.requireAuth(req, res, "admin");
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

        if (
            url.pathname === "/api/v1/study/classrooms" &&
            req.method === "GET"
        ) {
            const claims = ctx.requireAuth(req, res, "user");
            if (!claims) return true;
            const languageFilter =
                url.searchParams.get("language") || undefined;
            const mode = resolveClassroomMode(
                claims.role,
                url.searchParams.get("student"),
            );
            try {
                const isTeacherAccount =
                    String(claims.role ?? "")
                        .trim()
                        .toLowerCase() === "teacher";
                const classroomClasses =
                    mode === "teacher"
                        ? await store.getClassesForTeacherWithFilter(
                              claims.sub,
                              languageFilter,
                          )
                        : (await store.getEnrolledClasses(claims.sub))
                              .filter(
                                  (classRow) =>
                                      !languageFilter ||
                                      classRow.languageCode === languageFilter,
                              )
                              .map((classRow) => ({
                                  ...classRow,
                                  memberCount: 0,
                              }));
                const snapshots = await Promise.all(
                    classroomClasses.map(async (classRow) => {
                        const languageName =
                            (await resolveStudyLanguageName(
                                classRow.languageCode,
                            )) || classRow.languageCode;
                        const [classroomState, members, synced] =
                            await Promise.all([
                                store.getClassroomState(classRow.id),
                                store.getClassMembersForViewer(
                                    classRow.id,
                                    claims.sub,
                                ),
                                syncClassroomArtifacts(
                                    store,
                                    options,
                                    classRow.id,
                                ),
                            ]);
                        const pendingMembers =
                            mode === "teacher"
                                ? await store.getPendingJoinRequests(
                                      classRow.id,
                                      claims.sub,
                                  )
                                : [];
                        const decoratedMembers = await decorateMemberships(
                            options,
                            members,
                            {
                                viewerAccountId: claims.sub,
                                isTeacherViewer:
                                    mode === "teacher" || isTeacherAccount,
                            },
                        );
                        const decoratedPendingMembers =
                            mode === "teacher"
                                ? await decorateMemberships(
                                      options,
                                      pendingMembers,
                                      {
                                          viewerAccountId: claims.sub,
                                          isTeacherViewer: true,
                                      },
                                  )
                                : [];
                        const teacherProfile =
                            await options.getProfileSummary?.(
                                classRow.teacherAccountId,
                            );
                        return {
                            ...classRow,
                            languageName,
                            classroom: classroomState,
                            members: decoratedMembers,
                            pendingMembers: decoratedPendingMembers,
                            chatUrl: synced?.chat?.url ?? null,
                            whiteboardEnabled: Boolean(
                                ctx.getCapability(
                                    "whiteboard:getClassroomBoardEmbed",
                                ),
                            ),
                            teacher: {
                                accountId: classRow.teacherAccountId,
                                handle: teacherProfile?.handle ?? null,
                                displayName:
                                    teacherProfile?.displayName ?? null,
                                avatarKey: teacherProfile?.avatarKey ?? null,
                            },
                            viewerAccountId: claims.sub,
                        };
                    }),
                );
                jsonOk(res, snapshots, { mode });
            } catch (err) {
                options.log?.("error", "Failed to load classroom snapshots.", {
                    ...logMeta,
                    accountId: claims.sub,
                    error: err instanceof Error ? err.message : String(err),
                });
                jsonError(
                    res,
                    500,
                    "internal_error",
                    "Failed to load classroom data.",
                );
            }
            return true;
        }

        if (
            await handleClassUpdateRoute(req, res, url, {
                store,
                options,
                ctx,
                logMeta,
            })
        )
            return true;
        if (
            await handleClassroomLayoutRoute(req, res, url, {
                store,
                options,
                ctx,
                logMeta,
            })
        ) {
            return true;
        }
        if (
            await handleClassroomViewStateRoute(req, res, url, {
                store,
                options,
                ctx,
                logMeta,
            })
        ) {
            return true;
        }

        const classroomStudentMatch = url.pathname.match(
            /^\/api\/v1\/study\/classrooms\/([^/]+)\/students\/([^/]+)$/,
        );
        if (classroomStudentMatch && req.method === "DELETE") {
            const claims = ctx.requireAuth(req, res, "teacher");
            if (!claims) return true;
            const classId = decodeURIComponent(classroomStudentMatch[1]);
            const studentAccountId = decodeURIComponent(
                classroomStudentMatch[2],
            );
            try {
                await store.removeClassMemberByTeacher(
                    classId,
                    claims.sub,
                    studentAccountId,
                );
                await syncClassroomArtifacts(store, options, classId);
                jsonOk(res, { removed: true });
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
                options.log?.("error", "Failed to remove class member.", {
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
                    "Failed to remove class member.",
                );
            }
            return true;
        }

        if (
            await handleClassroomNotebookRoutes({
                req,
                res,
                url,
                ctx,
                store,
                options,
                logMeta,
            })
        ) {
            return true;
        }

        if (
            await handleClassroomFilesRoutes({
                req,
                res,
                url,
                ctx,
                store,
            })
        ) {
            return true;
        }

        if (
            await handleClassroomWhiteboardRoutes({
                req,
                res,
                url,
                ctx,
                store,
                options: {
                    log: options.log,
                },
                logMeta,
            })
        ) {
            return true;
        }

        const joinMatch = url.pathname.match(
            /^\/api\/v1\/study\/classes\/([^/]+)\/join$/,
        );
        if (joinMatch && req.method === "POST") {
            const claims = ctx.requireAuth(req, res, "user");
            if (!claims) return true;
            const classId = decodeURIComponent(joinMatch[1]);
            try {
                const membership = await store.requestJoinClass(
                    classId,
                    claims.sub,
                );
                if (membership.status === "member") {
                    await syncClassroomArtifacts(store, options, classId);
                }
                if (membership.status === "pending") {
                    store.getClassById(classId).then((classRow) => {
                        if (!classRow) return;
                        options
                            .dispatchNotification?.({
                                category: "study",
                                recipientUsername: classRow.teacherAccountId,
                                subject: "Class join request pending",
                                body: `${claims.sub} requested to join "${classRow.name || classRow.languageCode}".`,
                                actionUrl: `/classroom?classId=${encodeURIComponent(classId)}`,
                                metadata: {
                                    classId,
                                    studentAccountId: claims.sub,
                                    status: "pending",
                                },
                            })
                            .catch((error) => {
                                options.log?.(
                                    "error",
                                    "Failed to dispatch join request notification.",
                                    {
                                        ...logMeta,
                                        accountId: claims.sub,
                                        classId,
                                        error:
                                            error instanceof Error
                                                ? error.message
                                                : String(error),
                                    },
                                );
                            });
                    });
                }
                options.log?.("info", "Student requested to join class.", {
                    ...logMeta,
                    accountId: claims.sub,
                    classId,
                    status: membership.status,
                });
                res.writeHead(201, { "content-type": "application/json" });
                res.end(JSON.stringify({ data: membership }));
            } catch (err) {
                if (
                    err instanceof Error &&
                    err.message === "class_requires_invitation"
                ) {
                    jsonError(
                        res,
                        403,
                        "forbidden",
                        "This class is invite only.",
                    );
                    return true;
                }
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
        const disbandMatch = url.pathname.match(
            /^\/api\/v1\/study\/classes\/([^/]+)\/disband$/,
        );
        if (disbandMatch && req.method === "DELETE") {
            const claims = ctx.requireAuth(req, res, "teacher");
            if (!claims) return true;
            const classId = decodeURIComponent(disbandMatch[1]);
            try {
                const classRow = await store.getClassById(classId);
                await store.disbandClassForTeacher(classId, claims.sub);
                const calendarId = classRow
                    ? await resolveAgendaCalendarId(
                          options,
                          claims.sub,
                          classRow,
                          { createIfMissing: false },
                      )
                    : null;
                if (calendarId) {
                    options.deleteCalendar?.(claims.sub, calendarId);
                }
                await options.archiveClassroomMeetings?.({ classId });
                await options.archiveClassroomChat?.({ classId });
                options.log?.("info", "Teacher disbanded class.", {
                    ...logMeta,
                    accountId: claims.sub,
                    classId,
                });
                jsonOk(res, { disbanded: true });
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
                options.log?.("error", "Failed to disband class.", {
                    ...logMeta,
                    accountId: claims.sub,
                    classId,
                    error: err instanceof Error ? err.message : String(err),
                });
                jsonError(
                    res,
                    500,
                    "internal_error",
                    "Failed to disband class.",
                );
            }
            return true;
        }
        if (membershipMatch && req.method === "DELETE") {
            const claims = ctx.requireAuth(req, res, "user");
            if (!claims) return true;
            const classId = decodeURIComponent(membershipMatch[1]);
            try {
                await store.leaveClass(classId, claims.sub);
                await syncClassroomArtifacts(store, options, classId);
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
            const claims = ctx.requireAuth(req, res, "teacher");
            if (!claims) return true;
            const classId = decodeURIComponent(membersMatch[1]);
            const searchQuery = url.searchParams.get("search") ?? undefined;
            try {
                const members = await store.getClassMembers(
                    classId,
                    claims.sub,
                    searchQuery || undefined,
                );
                jsonOk(
                    res,
                    await decorateMemberships(options, members, {
                        viewerAccountId: claims.sub,
                        isTeacherViewer: true,
                    }),
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
            const claims = ctx.requireAuth(req, res, "teacher");
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
            const claims = ctx.requireAuth(req, res, "teacher");
            if (!claims) return true;
            const classId = decodeURIComponent(inviteMatch[1]);
            const body = (await readJson(req)) as Record<string, unknown>;
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
                await syncClassroomArtifacts(store, options, classId);
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
            const claims = ctx.requireAuth(req, res, "teacher");
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
                const classRow = await store.getClassById(classId);
                const readableClassName =
                    String(classRow?.name ?? "").trim() ||
                    classRow?.languageCode ||
                    classId;
                options
                    .dispatchNotification?.({
                        category: "study",
                        recipientUsername: studentAccountId,
                        subject:
                            action === "approve"
                                ? "Class join request approved"
                                : "Class join request rejected",
                        body:
                            action === "approve"
                                ? `Your request to join "${readableClassName}" was approved.`
                                : `Your request to join "${readableClassName}" was rejected.`,
                        actionUrl: `/classroom?classId=${encodeURIComponent(classId)}`,
                        metadata: {
                            classId,
                            className: readableClassName,
                            teacherAccountId: claims.sub,
                            action,
                        },
                    })
                    .catch((error) => {
                        options.log?.(
                            "error",
                            "Failed to dispatch join review notification.",
                            {
                                ...logMeta,
                                accountId: claims.sub,
                                classId,
                                studentAccountId,
                                action,
                                error:
                                    error instanceof Error
                                        ? error.message
                                        : String(error),
                            },
                        );
                    });
                if (action === "approve") {
                    await syncClassroomArtifacts(store, options, classId);
                }
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

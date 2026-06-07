import type { IncomingMessage, ServerResponse } from "node:http";
import { readJson } from "../../../../api/reuse/read-json.js";
import { jsonOk, jsonError } from "../../../../api/reuse/json-responses.js";
import { resolveRouteContext } from "../../../../api/reuse/route-context.js";
import type { DbClassesStore, StudyLanguageRow } from "../store/index.js";
import { MAX_STUDENT_LIMIT } from "../store/constants.js";
import { handleClassroomNotebookRoutes } from "./classroom-notebooks.js";
import { handleAvailableClassesRequest } from "./available-classes-route.js";
import { handleEnrolledClassesRequest } from "./enrolled-classes-route.js";
import {
    dispatchJoinRequestNotification,
    dispatchJoinReviewNotification,
} from "./join-notifications.js";
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
                    mode === "teacher" || isTeacherAccount
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
                        return {
                            ...classRow,
                            languageName,
                            classroom: classroomState,
                            members: decoratedMembers,
                            pendingMembers: decoratedPendingMembers,
                            chatUrl: synced?.chat?.url ?? null,
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

        const classroomLayoutMatch = url.pathname.match(
            /^\/api\/v1\/study\/classrooms\/([^/]+)\/layout$/,
        );
        if (classroomLayoutMatch && req.method === "PATCH") {
            const claims = ctx.requireAuth(req, res, "teacher");
            if (!claims) return true;
            const classId = decodeURIComponent(classroomLayoutMatch[1]);
            const body = (await readJson(req)) as {
                studentLimit?: unknown;
                seatAssignments?: unknown;
            };
            const studentLimitRaw = body.studentLimit;
            const seatAssignmentsRaw = body.seatAssignments;
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
                const classroomState =
                    await store.updateClassroomStateForTeacher(
                        classId,
                        claims.sub,
                        {
                            studentLimit,
                            seatAssignments,
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
                if (
                    err instanceof Error &&
                    err.message === "invalid_student_limit"
                ) {
                    jsonError(
                        res,
                        400,
                        "bad_request",
                        `studentLimit must be between 1 and ${MAX_STUDENT_LIMIT}.`,
                    );
                    return true;
                }
                options.log?.("error", "Failed to update classroom layout.", {
                    ...logMeta,
                    accountId: claims.sub,
                    classId,
                    error: err instanceof Error ? err.message : String(err),
                });
                jsonError(
                    res,
                    500,
                    "internal_error",
                    "Failed to update classroom.",
                );
            }
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

        const agendaMatch = url.pathname.match(
            /^\/api\/v1\/study\/classes\/([^/]+)\/agenda$/,
        );
        if (agendaMatch && req.method === "GET") {
            const claims = ctx.requireAuth(req, res, "user");
            if (!claims) return true;
            const classId = decodeURIComponent(agendaMatch[1]);
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
            const calendarId = await resolveAgendaCalendarId(
                options,
                classRow.teacherAccountId,
                classId,
            );
            const now = Date.now();
            const activeItems =
                calendarId && options.listEvents
                    ? options
                          .listEvents(calendarId)
                          .filter((event) => {
                              const startMs = Date.parse(event.startAt);
                              const endMs = Date.parse(event.endAt);
                              return (
                                  Number.isFinite(startMs) &&
                                  Number.isFinite(endMs) &&
                                  startMs <= now &&
                                  now <= endMs
                              );
                          })
                          .map((event) => ({
                              id: event.id,
                              title: event.title,
                              description: event.description ?? "",
                              startAt: event.startAt,
                              endAt: event.endAt,
                              meetingUrl: event.meetingUrl ?? null,
                          }))
                    : [];
            jsonOk(res, { activeItems });
            return true;
        }

        if (agendaMatch && req.method === "POST") {
            const claims = ctx.requireAuth(req, res, "teacher");
            if (!claims) return true;
            const classId = decodeURIComponent(agendaMatch[1]);
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
            if (
                !options.listCalendars ||
                !options.createCalendar ||
                !options.addEvent ||
                !options.listEvents
            ) {
                jsonError(
                    res,
                    503,
                    "service_unavailable",
                    "Calendar integration is unavailable.",
                );
                return true;
            }
            const body = (await readJson(req)) as Record<string, unknown>;
            const title = String(body.title ?? "").trim();
            const description =
                typeof body.description === "string"
                    ? body.description.trim()
                    : "";
            const startAt = String(body.startAt ?? "").trim();
            const endAt = String(body.endAt ?? "").trim();
            if (!title || !startAt || !endAt) {
                jsonError(
                    res,
                    400,
                    "bad_request",
                    "title, startAt, and endAt are required.",
                );
                return true;
            }
            const startMs = Date.parse(startAt);
            const endMs = Date.parse(endAt);
            if (
                !Number.isFinite(startMs) ||
                !Number.isFinite(endMs) ||
                endMs <= startMs
            ) {
                jsonError(
                    res,
                    400,
                    "bad_request",
                    "Agenda end time must be after start time.",
                );
                return true;
            }
            const calendarId = await resolveAgendaCalendarId(
                options,
                claims.sub,
                classId,
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
            const overlappingEvent = options
                .listEvents(calendarId)
                .find((event) => {
                    const eventStartMs = Date.parse(event.startAt);
                    const eventEndMs = Date.parse(event.endAt);
                    if (
                        !Number.isFinite(eventStartMs) ||
                        !Number.isFinite(eventEndMs)
                    ) {
                        return false;
                    }
                    return startMs < eventEndMs && eventStartMs < endMs;
                });
            if (overlappingEvent) {
                jsonError(
                    res,
                    409,
                    "conflict",
                    "Agenda entries cannot overlap.",
                );
                return true;
            }
            const event = options.addEvent({
                ownerAccountId: claims.sub,
                calendarId,
                title,
                description,
                startAt,
                endAt,
            });
            jsonOk(res, event);
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
                    dispatchJoinRequestNotification({
                        options,
                        store,
                        classId,
                        studentAccountId: claims.sub,
                        logMeta,
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
                if (err instanceof Error && err.message === "invite_only") {
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
                await store.disbandClassForTeacher(classId, claims.sub);
                const calendarName = `class-agenda-${classId}`;
                const calendarId =
                    options
                        .listCalendars?.(claims.sub)
                        ?.find((calendar) => calendar.name === calendarName)
                        ?.id ?? null;
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
                dispatchJoinReviewNotification({
                    options,
                    classId,
                    teacherAccountId: claims.sub,
                    studentAccountId,
                    action,
                    logMeta,
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

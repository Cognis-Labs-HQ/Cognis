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
 *   GET    /api/v1/study/classrooms                                            — list classroom snapshots for caller (supports ?language=)
 *   PATCH  /api/v1/study/classrooms/:classId/layout                            — update classroom layout and student limit (teacher)
 *   DELETE /api/v1/study/classrooms/:classId/students/:studentId               — remove student from class (teacher)
 *   GET    /api/v1/study/classes/:classId/resources                             — read class materials and homework text (teacher/student member)
 *   PUT    /api/v1/study/classes/:classId/resources                             — update class materials/homework (teacher)
 *   GET    /api/v1/study/classes/:classId/notebook                              — read caller notebook text
 *   PUT    /api/v1/study/classes/:classId/notebook                              — save caller notebook text
 *   GET    /api/v1/study/classes/:classId/notebooks/:studentId                  — read another student's notebook (friends or approved request)
 *   POST   /api/v1/study/classes/:classId/notebooks/:studentId/request          — request notebook access from a classmate
 *   GET    /api/v1/study/classes/:classId/notebook-requests                     — list incoming notebook-access requests for caller
 *   POST   /api/v1/study/classes/:classId/notebooks/:ownerId/requests/:viewerId/:action
 *                                                                               — owner approves/rejects notebook-access request
 *   GET    /api/v1/study/classes/:classId/members                             — list class members (teacher, supports ?search=)
 *   GET    /api/v1/study/classes/:classId/join-requests                       — list pending join requests (teacher)
 *   POST   /api/v1/study/classes/:classId/invite                              — invite a student directly (teacher)
 *   POST   /api/v1/study/classes/:classId/join-requests/:studentId/approve    — approve a join request (teacher)
 *   POST   /api/v1/study/classes/:classId/join-requests/:studentId/reject     — reject a join request (teacher)
 *
 * @module adapters/study/classes/routes
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import { readJson } from "../../../../api/reuse/read-json.js";
import { jsonOk, jsonError } from "../../../../api/reuse/json-responses.js";
import {
    resolveRouteContext,
    type RouteContext,
} from "../../../../api/reuse/route-context.js";
import type { DbClassesStore, StudyLanguageRow } from "../store/index.js";
import { handleClassroomNotebookRoutes } from "./classroom-notebooks.js";

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
    areFriends?: (accountA: string, accountB: string) => Promise<boolean>;
    getProfileSummary?: (accountId: string) => Promise<{
        handle?: string | null;
        displayName?: string | null;
        avatarKey?: string | null;
    } | null>;
    resolveClassroomChatUrl?: (input: {
        classId: string;
        title?: string | null;
        teacherAccountId: string;
        memberAccountIds: string[];
    }) => Promise<{ roomId: string; url: string; reused: boolean }>;
    createCalendar?: (
        ownerAccountId: string,
        name: string,
        visibility?: "private" | "shared" | "public",
        color?: string,
        defaultReminderOffsetsMinutes?: number[],
    ) => { id: string };
    listCalendars?: (
        ownerAccountId: string,
    ) => Array<{ id: string; name: string }>;
    addEvent?: (input: {
        ownerAccountId: string;
        calendarId: string;
        title: string;
        description?: string | null;
        startAt: string;
        endAt: string;
        attendees?: string[];
        inviteEmails?: string[];
        reminderOffsetsMinutes?: number[];
        meetingUrl?: string | null;
        status?: "busy" | "free";
        recurrence?: "none" | "daily" | "weekly" | "monthly" | "yearly";
    }) => {
        id: string;
        title: string;
        description: string | null;
        startAt: string;
        endAt: string;
        meetingUrl: string | null;
    };
    listEvents?: (calendarId: string) => Array<{
        id: string;
        title: string;
        description?: string | null;
        startAt: string;
        endAt: string;
        meetingUrl?: string | null;
    }>;
    log?: (
        level: string,
        message: string,
        meta?: Record<string, unknown>,
    ) => void;
    routeContext?: RouteContext;
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

function normalizeJoinMode(input: unknown): "invite_only" | "on_request" | "open" {
    const joinMode = String(input ?? "").trim().toLowerCase();
    if (joinMode === "invite_only" || joinMode === "open") {
        return joinMode;
    }
    return "on_request";
}

function resolveClassroomMode(
    role: string,
    requestedMode: string | null,
): "teacher" | "student" {
    const normalizedRole = String(role ?? "").trim().toLowerCase();
    if (normalizedRole === "teacher" && requestedMode === "student") {
        return "student";
    }
    return normalizedRole === "teacher" ? "teacher" : "student";
}

function buildAgendaCalendarName(classId: string): string {
    return `Class Agenda ${classId}`;
}

export function createClassesRoutes(
    store: DbClassesStore,
    options: ClassesRouteOptions = {},
): (req: IncomingMessage, res: ServerResponse, url: URL) => Promise<boolean> {
    const ctx = resolveRouteContext(options.routeContext);

    async function decorateMemberships(
        memberships: Array<{
            studentAccountId: string;
            [key: string]: unknown;
        }>,
    ) {
        return Promise.all(
            memberships.map(async (membership) => {
                const profile = await options.getProfileSummary?.(
                    membership.studentAccountId,
                );
                return {
                    ...membership,
                    handle: profile?.handle ?? null,
                    displayName: profile?.displayName ?? null,
                    avatarKey: profile?.avatarKey ?? null,
                };
            }),
        );
    }

    async function syncClassroomArtifacts(classId: string) {
        const classRow = await store.getClassById(classId);
        if (!classRow) return null;
        await store.getClassroomState(classRow.id);
        const members = await store.getClassMembersForViewer(
            classRow.id,
            classRow.teacherAccountId,
        );
        const chat = await options.resolveClassroomChatUrl?.({
            classId: classRow.id,
            title: `Classroom ${classRow.languageCode}`,
            teacherAccountId: classRow.teacherAccountId,
            memberAccountIds: members.map((member) => member.studentAccountId),
        });
        return { classRow, chat };
    }

    async function resolveAgendaCalendarId(ownerAccountId: string, classId: string) {
        const calendarName = buildAgendaCalendarName(classId);
        const existingCalendar = options
            .listCalendars?.(ownerAccountId)
            ?.find((calendar) => calendar.name === calendarName);
        if (existingCalendar) {
            return existingCalendar.id;
        }
        return (
            options.createCalendar?.(
                ownerAccountId,
                calendarName,
                "private",
                "#2f855a",
            )?.id ?? null
        );
    }

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
            const claims = ctx.requireAuth(req, res, "user");
            if (!claims) return true;
            try {
                const languageCode =
                    url.searchParams.get("language") || undefined;
                const searchQuery = String(
                    url.searchParams.get("search") ?? "",
                ).trim();
                const classes = await store.getAvailableClasses(
                    languageCode,
                    claims.sub,
                );
                const filteredClasses = searchQuery
                    ? classes.filter((classRow) =>
                          [
                              classRow.languageCode,
                              classRow.teacherAccountId,
                              classRow.id,
                          ]
                              .join(" ")
                              .toLowerCase()
                              .includes(searchQuery.toLowerCase()),
                      )
                    : classes;
                jsonOk(res, filteredClasses);
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
            url.pathname === "/api/v1/study/teacher-requests" &&
            req.method === "POST"
        ) {
            const claims = ctx.requireAuth(req, res, "user");
            if (!claims) return true;

            const body = (await readJson(req)) as {
                languageCode?: unknown;
                reason?: unknown;
                joinMode?: unknown;
            };
            const languageCode =
                typeof body?.languageCode === "string"
                    ? body.languageCode.trim().toLowerCase()
                    : "";
            const reason =
                typeof body?.reason === "string" ? body.reason.trim() : "";
            const joinMode = normalizeJoinMode(body?.joinMode);
            const isListed = joinMode !== "invite_only";
            if (!languageCode) {
                jsonError(res, 400, "bad_request", "languageCode is required.");
                return true;
            }

            const existingClass = await store.getTeacherClassForLanguage(
                claims.sub,
                languageCode,
            );
            if (existingClass) {
                jsonError(
                    res,
                    409,
                    "conflict",
                    "A class already exists for this language.",
                );
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
                        joinMode,
                        isListed,
                    ));
                const classRow = await store.approveTeacherRequest(
                    request.id,
                    claims.sub,
                );
                if (classRow) {
                    await syncClassroomArtifacts(classRow.id);
                }
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
                joinMode,
                isListed,
            );
            await options.dispatchToRole?.("admin", {
                category: "study",
                subject: `Teacher application for ${languageCode}`,
                body: `${claims.sub} applied to teach ${languageCode}.`,
                senderName: claims.sub,
                actionUrl: "/classroom",
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
            if (!ctx.requireAuth(req, res, "admin")) return true;
            const pending = await store.listPendingRequests();
            jsonOk(res, pending);
            return true;
        }

        const approveMatch = url.pathname.match(
            /^\/api\/v1\/study\/teacher-requests\/([^/]+)\/(approve|reject)$/,
        );
        if (approveMatch && req.method === "POST") {
            const claims = ctx.requireAuth(req, res, "admin");
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
                await syncClassroomArtifacts(classRow.id);
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
                url.searchParams.get("mode"),
            );
            try {
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
                        const [classroomState, members, synced] =
                            await Promise.all([
                            store.getClassroomState(classRow.id),
                            store.getClassMembersForViewer(
                               classRow.id,
                               claims.sub,
                            ),
                            syncClassroomArtifacts(classRow.id),
                        ]);
                        const decoratedMembers =
                            await decorateMemberships(members);
                        return {
                            ...classRow,
                            classroom: classroomState,
                            members: decoratedMembers,
                            chatUrl: synced?.chat?.url ?? null,
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
                    studentLimit > 300)
            ) {
                jsonError(
                    res,
                    400,
                    "bad_request",
                    "studentLimit must be an integer between 1 and 300.",
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
                        "studentLimit must be between 1 and 300.",
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
                await syncClassroomArtifacts(classId);
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
                jsonError(res, 403, "forbidden", "Class not found or access denied.");
                return true;
            }
            const calendarId = await resolveAgendaCalendarId(
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
                jsonError(res, 403, "forbidden", "Class not found or access denied.");
                return true;
            }
            if (!options.listCalendars || !options.createCalendar || !options.addEvent || !options.listEvents) {
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
                typeof body.description === "string" ? body.description.trim() : "";
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
            const calendarId = await resolveAgendaCalendarId(claims.sub, classId);
            if (!calendarId) {
                jsonError(
                    res,
                    503,
                    "service_unavailable",
                    "Agenda calendar is unavailable.",
                );
                return true;
            }
            const overlappingEvent = options.listEvents(calendarId).find((event) => {
                const eventStartMs = Date.parse(event.startAt);
                const eventEndMs = Date.parse(event.endAt);
                if (!Number.isFinite(eventStartMs) || !Number.isFinite(eventEndMs)) {
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
                    await syncClassroomArtifacts(classId);
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
        if (membershipMatch && req.method === "DELETE") {
            const claims = ctx.requireAuth(req, res, "user");
            if (!claims) return true;
            const classId = decodeURIComponent(membershipMatch[1]);
            try {
                await store.leaveClass(classId, claims.sub);
                await syncClassroomArtifacts(classId);
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
                jsonOk(res, await decorateMemberships(members));
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
                await syncClassroomArtifacts(classId);
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
                if (action === "approve") {
                    await syncClassroomArtifacts(classId);
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

import path from "node:path";
import { fileURLToPath } from "node:url";
import type { IncomingMessage, ServerResponse } from "node:http";
import type {
    StudyAdapter,
    StudyAdapterBootstrapCtx,
} from "../../../gateways/study/gateway.js";
import { DbClassesStore } from "./store/index.js";
import { createClassesRoutes } from "./routes/index.js";
import type { UserPreferenceStore } from "../../../api/reuse/preference-store.js";
import {
    parseSecuritySettings,
    SECURITY_SETTINGS_KEY,
} from "../../../api/reuse/security-settings.js";
import {
    resolveRouteContext,
    type RouteContext,
} from "../../../api/reuse/route-context.js";

const ADAPTER_UI_ROOT = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "ui",
);

let adapterReady = false;
let requireTeacherManualApproval = true;
let persistTeacherManualApproval: null | ((value: boolean) => Promise<void>) =
    null;

export function createStudyAdapter(): StudyAdapter {
    return {
        adapterId: "classes",
        adapterName: "Classes",
        getConfig: () => ({ requireTeacherManualApproval }),
        setConfig: async (config) => {
            const rawValue = config?.requireTeacherManualApproval;
            requireTeacherManualApproval =
                rawValue === false || rawValue === "false" ? false : true;
            await persistTeacherManualApproval?.(requireTeacherManualApproval);
        },
        isConfigured: () => adapterReady,
    };
}

/**
 * Page-serving route for `/classroom`. Serves the classroom hub SPA page with
 * notepad config injected via meta tags so the client can dynamically load the
 * notepad adapter without a hardcoded static import.
 */
function createClassroomHubPageRoute(
    routeContext: RouteContext | undefined,
    isAdapterEnabled: () => boolean,
    notepadScriptUrl: string,
    notepadStringsBaseUrl: string,
) {
    const ctx = resolveRouteContext(routeContext);
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (req.method && req.method !== "GET") return false;
        if (!isAdapterEnabled()) return false;
        if (url.pathname !== "/classroom") return false;
        const session = ctx.getCookieSession(req);
        if (!session) {
            res.writeHead(302, { location: "/login" });
            res.end();
            return true;
        }
        ctx.setPageSecurityHeaders(res);
        let html = await import("node:fs/promises").then((fs) =>
            fs.readFile(path.join(ADAPTER_UI_ROOT, "classroom.html"), "utf8"),
        );
        html = html
            .replace("{{classroom.notepadScriptUrl}}", notepadScriptUrl)
            .replace(
                "{{classroom.notepadStringsBaseUrl}}",
                notepadStringsBaseUrl,
            );
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        res.end(html);
        return true;
    };
}

/**
 * Legacy page-serving route for `/classes`. Redirects to `/classroom`.
 */
function createClassesPageRoute(
    routeContext: RouteContext | undefined,
    isAdapterEnabled: () => boolean,
) {
    const ctx = resolveRouteContext(routeContext);
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (req.method && req.method !== "GET") return false;
        if (!isAdapterEnabled()) return false;
        if (url.pathname !== "/classes") return false;
        const session = ctx.getCookieSession(req);
        if (!session) {
            res.writeHead(302, { location: "/login" });
            res.end();
            return true;
        }
        res.writeHead(302, { location: "/classroom" });
        res.end();
        return true;
    };
}

/**
 * Legacy page-serving route for `/my-classes`. Redirects to `/classroom`.
 */
function createMyClassesPageRoute(
    routeContext: RouteContext | undefined,
    isAdapterEnabled: () => boolean,
) {
    const ctx = resolveRouteContext(routeContext);
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (req.method && req.method !== "GET") return false;
        if (!isAdapterEnabled()) return false;
        if (url.pathname !== "/my-classes") return false;
        const session = ctx.getCookieSession(req);
        if (!session) {
            res.writeHead(302, { location: "/login" });
            res.end();
            return true;
        }
        res.writeHead(302, { location: "/classroom" });
        res.end();
        return true;
    };
}

function createRequestsPageRoute(
    routeContext: RouteContext | undefined,
    isAdapterEnabled: () => boolean,
) {
    const ctx = resolveRouteContext(routeContext);
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (req.method && req.method !== "GET") return false;
        if (!isAdapterEnabled()) return false;
        if (url.pathname !== "/requests") return false;
        const session = ctx.getCookieSession(req);
        if (!session) {
            res.writeHead(302, { location: "/login" });
            res.end();
            return true;
        }
        if (!ctx.hasMinRole(session.role, "admin")) {
            res.writeHead(302, { location: "/dashboard" });
            res.end();
            return true;
        }
        ctx.setPageSecurityHeaders(res);
        const html = await import("node:fs/promises").then((fs) =>
            fs.readFile(path.join(ADAPTER_UI_ROOT, "requests.html"), "utf8"),
        );
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        res.end(html);
        return true;
    };
}

export async function bootstrapStudyAdapter(
    ctx: StudyAdapterBootstrapCtx,
): Promise<void> {
    const notepadUi = ctx.capabilities.get<{
        scriptUrl?: string;
        stringsBaseUrl?: string;
        stylesheetUrl?: string;
    }>("file-reader:text:ui");
    const notepadScriptUrl =
        typeof notepadUi?.scriptUrl === "string"
            ? notepadUi.scriptUrl.trim()
            : "";
    const notepadStringsBaseUrl =
        typeof notepadUi?.stringsBaseUrl === "string"
            ? notepadUi.stringsBaseUrl.trim()
            : "";
    const notepadStylesheetUrl =
        typeof notepadUi?.stylesheetUrl === "string"
            ? notepadUi.stylesheetUrl.trim()
            : "";
    const routeContext =
        ctx.capabilities.get<RouteContext>("auth:routeContext");
    ctx.registerAdapterStaticDir?.("study", "classes", ADAPTER_UI_ROOT);
    const dbExecutor = ctx.capabilities.get("db:executor");
    if (!dbExecutor) {
        ctx.log?.(
            "warn",
            "Study/classes adapter: no DB executor available — skipping.",
            { component: "study-classes" },
        );
        return;
    }

    const store = new DbClassesStore(dbExecutor);

    try {
        await store.ensureSchema();
    } catch (err) {
        ctx.log?.(
            "error",
            "Study/classes adapter: schema initialisation failed.",
            {
                component: "study-classes",
                error: err instanceof Error ? err.message : String(err),
            },
        );
        return;
    }

    adapterReady = true;
    ctx.capabilities.contribute("study:classes:resources", {
        classExists: async (classId: string) => {
            const classRow = await store.getClassById(classId);
            return classRow !== null;
        },
        canViewClassroomResources: async (
            classId: string,
            accountId: string,
        ) => {
            try {
                await store.getClassMembersForViewer(classId, accountId);
                return true;
            } catch {
                return false;
            }
        },
        isClassTeacher: async (classId: string, accountId: string) => {
            const classRow = await store.getClassById(classId);
            if (!classRow) return false;
            return classRow.teacherAccountId === accountId;
        },
        getClassroomResourcesForViewer: async (
            classId: string,
            accountId: string,
        ) => {
            return store.getClassroomResourcesForViewer(classId, accountId);
        },
        updateClassroomResourcesForTeacher: async (
            classId: string,
            accountId: string,
            updates: {
                agendaDocument?: string;
                agendaSnapshots?: Array<{
                    id?: string;
                    name?: string;
                    content?: string;
                    updatedAt?: string;
                }>;
            },
        ) => {
            return store.updateClassroomResourcesForTeacher(
                classId,
                accountId,
                updates,
            );
        },
    });

    const isEnabled = () => ctx.isAdapterEnabled();
    const preferenceStore =
        ctx.capabilities.get<UserPreferenceStore>("preferences:store");
    const readTeacherManualApproval = async (): Promise<boolean> => {
        return requireTeacherManualApproval;
    };
    const loadTeacherManualApproval = async (): Promise<boolean> => {
        if (!preferenceStore) return true;
        const raw = await preferenceStore.get(
            "__system__",
            SECURITY_SETTINGS_KEY,
        );
        return (
            parseSecuritySettings(raw)?.requireTeacherManualApproval !== false
        );
    };
    persistTeacherManualApproval = async (value) => {
        if (!preferenceStore) return;
        const raw = await preferenceStore.get(
            "__system__",
            SECURITY_SETTINGS_KEY,
        );
        const settings = parseSecuritySettings(raw);
        await preferenceStore.set(
            "__system__",
            SECURITY_SETTINGS_KEY,
            JSON.stringify({
                trustedDomains: settings?.trustedDomains ?? [],
                registrationsEnabled: settings?.registrationsEnabled === true,
                userValidationMode:
                    settings?.userValidationMode === "smtp" ? "smtp" : "none",
                requireTeacherManualApproval: value,
                enforceTfaForAllUsers: settings?.enforceTfaForAllUsers === true,
            }),
        );
    };
    requireTeacherManualApproval = await loadTeacherManualApproval();
    const accountStore = ctx.capabilities.get<{
        setRole(username: string, role: "teacher"): Promise<void>;
        exists(username: string): Promise<boolean>;
    }>("auth:accountStore");
    const profileStore = ctx.capabilities.get<{
        getProfile: (accountId: string) => Promise<{
            handle?: string | null;
            displayName?: string | null;
            avatarKey?: string | null;
            visibility?: string | null;
        } | null>;
        isBlocked?: (blockerId: string, blockedId: string) => Promise<boolean>;
        isFollowing?: (
            followerId: string,
            followingId: string,
        ) => Promise<boolean>;
    }>("social:profileStore");
    const setProfileRole = ctx.capabilities.get<
        (handle: string, role: "teacher") => Promise<void>
    >("profile:setRoleByHandle");
    const resolveClassroomChatUrl = ctx.capabilities.get<
        (input: {
            classId: string;
            title?: string | null;
            teacherAccountId: string;
            memberAccountIds: string[];
        }) => Promise<{ roomId: string; url: string; reused: boolean }>
    >("social:messages:resolveClassroomChatUrl");
    const createCalendar = ctx.capabilities.get<
        (
            ownerAccountId: string,
            name: string,
            visibility?: "private" | "shared" | "public",
            color?: string,
            defaultReminderOffsetsMinutes?: number[],
        ) => { id: string }
    >("calendar:createCalendar");
    const listCalendars = ctx.capabilities.get<
        (ownerAccountId: string) => Array<{ id: string; name: string }>
    >("calendar:listCalendars");
    const deleteCalendar = ctx.capabilities.get<
        (ownerAccountId: string, calendarId: string) => void
    >("calendar:deleteCalendar");
    const updateCalendar = ctx.capabilities.get<
        (input: {
            ownerAccountId: string;
            calendarId: string;
            name?: string;
        }) => { id: string; name: string } | null
    >("calendar:updateCalendar");
    const addCalendarEvent = ctx.capabilities.get<
        (input: {
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
        }
    >("calendar:addEvent");
    const listCalendarEvents = ctx.capabilities.get<
        (calendarId: string) => Array<{
            id: string;
            title: string;
            description?: string | null;
            startAt: string;
            endAt: string;
            meetingUrl?: string | null;
        }>
    >("calendar:listEvents");
    const listCalendarSharedUsers = ctx.capabilities.get<
        (input: {
            ownerAccountId: string;
            calendarId: string;
        }) => Promise<Array<{ recipientAccountId: string }>>
    >("calendar:listSharedUsers");
    const upsertCalendarShareForUser = ctx.capabilities.get<
        (input: {
            ownerAccountId: string;
            calendarId: string;
            recipientAccountId: string;
            recipientHandle?: string | null;
            recipientDisplayName?: string | null;
            recipientAvatarKey?: string | null;
            permission?: "read" | "write";
        }) => Promise<void>
    >("calendar:shareCalendarWithUser");
    const deleteCalendarShareForUser = ctx.capabilities.get<
        (input: {
            ownerAccountId: string;
            calendarId: string;
            recipientAccountId: string;
        }) => Promise<void>
    >("calendar:removeCalendarShareForUser");
    const archiveClassroomChat = ctx.capabilities.get<
        (input: { classId: string }) => Promise<void>
    >("social:messages:archiveClassroomChat");
    const getPresenceStatuses = ctx.capabilities.get<
        (
            accountIds: string[],
        ) => Promise<Record<string, "online" | "away" | "offline">>
    >("social:presence:getStatuses");
    const archiveClassroomMeetings = async (input: { classId: string }) => {
        const classId = String(input?.classId ?? "").trim();
        if (!classId) return;
        await dbExecutor.transaction(async (executor) => {
            const meetingResult = await executor.executeCommand({
                option: "SELECT",
                table: "jitsi_meetings",
                columns: ["id"],
                where: [{ column: "classroom_id", value: classId }],
            });
            const meetingIds = (meetingResult.rows ?? [])
                .map((row) => String(row.id ?? "").trim())
                .filter(Boolean);
            if (!meetingIds.length) return;
            for (const table of [
                "jitsi_meeting_presence",
                "jitsi_meeting_state",
                "jitsi_meeting_participants",
            ]) {
                await executor.executeCommand({
                    option: "DELETE",
                    table,
                    where: [
                        {
                            column: "meeting_id",
                            operator: "IN",
                            value: meetingIds,
                        },
                    ],
                });
            }
            await executor.executeCommand({
                option: "DELETE",
                table: "jitsi_meetings",
                where: [
                    {
                        column: "id",
                        operator: "IN",
                        value: meetingIds,
                    },
                ],
            });
        });
    };
    const dispatchNotification =
        ctx.capabilities.get<
            (envelope: {
                category: string;
                recipientUsername: string;
                subject: string;
                body: string;
                senderName?: string;
                actionUrl?: string;
                metadata?: Record<string, unknown>;
            }) => Promise<unknown>
        >("notify:dispatch");

    /**
     * study:classroom:listParticipantHandles — resolves normalized participant
     * handles for classroom-linked features.
     */
    ctx.capabilities.contribute(
        "study:classroom:listParticipantHandles",
        async (input: { classId: string }): Promise<string[]> => {
            const classId = String(input?.classId ?? "").trim();
            if (!classId) return [];
            const classRow = await store.getClassById(classId);
            if (!classRow) return [];
            const members = await store.getClassMembers(
                classId,
                classRow.teacherAccountId,
            );

            const accountIds = Array.from(
                new Set([
                    classRow.teacherAccountId,
                    ...members.map((member) => member.studentAccountId),
                ]),
            );
            const profileRows = await Promise.all(
                accountIds.map(async (accountId) => ({
                    accountId,
                    profile: profileStore
                        ? await profileStore.getProfile(accountId)
                        : null,
                })),
            );
            return Array.from(
                new Set(
                    profileRows
                        .map((row) =>
                            String(
                                row.profile?.handle ?? row.accountId ?? "",
                            ).toLowerCase(),
                        )
                        .map((handle) => handle.replace(/^@+/, "").trim())
                        .filter(Boolean),
                ),
            );
        },
    );

    ctx.registerRoute(createClassesPageRoute(routeContext, isEnabled), "study");
    ctx.registerRoute(
        createMyClassesPageRoute(routeContext, isEnabled),
        "study",
    );
    ctx.registerRoute(
        createRequestsPageRoute(routeContext, isEnabled),
        "study",
    );
    ctx.registerRoute(
        createClassroomHubPageRoute(
            routeContext,
            isEnabled,
            notepadScriptUrl,
            notepadStringsBaseUrl,
        ),
        "study",
    );
    ctx.registerRoute(
        createClassesRoutes(store, {
            requireTeacherManualApproval: readTeacherManualApproval,
            setRole: accountStore
                ? (username, role) => accountStore.setRole(username, role)
                : undefined,
            setProfileRole,
            accountExists: accountStore
                ? (id) => accountStore.exists(id)
                : undefined,
            areFriends: async (accountA, accountB) => {
                if (!profileStore?.isFollowing) return false;
                const [aFollowsB, bFollowsA] = await Promise.all([
                    profileStore.isFollowing(accountA, accountB),
                    profileStore.isFollowing(accountB, accountA),
                ]);
                return aFollowsB && bFollowsA;
            },
            getProfileSummary: async (accountId) => {
                const profile = profileStore
                    ? await profileStore.getProfile(accountId)
                    : null;
                if (!profile) return null;
                return {
                    handle: profile.handle ?? null,
                    displayName: profile.displayName ?? null,
                    avatarKey: profile.avatarKey ?? null,
                    visibility: profile.visibility ?? null,
                };
            },
            isBlocked: (blockerId, blockedId) =>
                profileStore?.isBlocked
                    ? profileStore.isBlocked(blockerId, blockedId)
                    : Promise.resolve(false),
            resolveClassroomChatUrl,
            createCalendar,
            listCalendars,
            deleteCalendar,
            updateCalendar,
            addEvent: addCalendarEvent,
            listEvents: listCalendarEvents,
            listCalendarSharedUsers,
            upsertCalendarShareForUser,
            deleteCalendarShareForUser,
            archiveClassroomChat,
            archiveClassroomMeetings,
            getPresenceStatuses,
            whiteboardGetEmbedUrl: ctx.capabilities.get<
                (
                    boardId: string,
                    userId: string,
                    userName: string,
                ) => Promise<string | null>
            >("whiteboard:getEmbedUrl"),
            whiteboardFetchBoardData: ctx.capabilities.get<
                (boardId: string) => Promise<string | null>
            >("whiteboard:fetchBoardData"),
            routeContext,
            dispatchToRole: (role, envelope) => {
                const dispatch = ctx.capabilities.get<
                    (
                        role: "admin" | "teacher" | "user",
                        envelope: typeof envelope,
                    ) => Promise<unknown>
                >("notify:dispatchToRole");
                return dispatch?.(role, envelope) ?? Promise.resolve(null);
            },
            dispatchNotification: (envelope) =>
                dispatchNotification?.(envelope) ?? Promise.resolve(null),
            log: ctx.log,
        }),
        "study",
    );

    ctx.registerPageExtension("dashboard", {
        id: "study-classes-dashboard",
        label: "My Classes",
        scriptUrl: "/static/gateways/study/classes-dashboard-element.js",
        isEnabled: () => ctx.isAdapterEnabled(),
    });
    ctx.registerSpaRoute?.({
        id: "study-classes-classroom-hub-page",
        pattern: "^/classroom$",
        base: "/classroom",
        scriptUrl: "/static/adapters/study/classes/classroom/index.js",
        stylesheets: [
            "/static/styles/page-builder.css",
            "/static/styles/reuse/page-sections.css",
            "/static/adapters/study/classes/classes.css",
            "/static/adapters/study/classes/classroom-workspace.css",
            ...(notepadStylesheetUrl ? [notepadStylesheetUrl] : []),
            "/static/modules/nextcloud-whiteboard/classes-whiteboard.css",
        ],
        isEnabled: () => ctx.isAdapterEnabled(),
    });
    ctx.registerNavbarPlugin("/static/adapters/study/classes/nav-link.js", () =>
        ctx.isAdapterEnabled(),
    );
    ctx.registerSpaRoute?.({
        id: "study-classes-requests-page",
        pattern: "^/requests$",
        base: "/requests",
        scriptUrl: "/static/adapters/study/classes/requests.js",
        stylesheets: [
            "/static/styles/page-builder.css",
            "/static/styles/reuse/page-sections.css",
            "/static/adapters/study/classes/classes.css",
        ],
        isEnabled: () => ctx.isAdapterEnabled(),
    });

    const registerNotificationCategory = ctx.capabilities.get<
        (id: string, label: string) => void
    >("notify:registerCategory");
    registerNotificationCategory?.("study", "Study");

    ctx.log?.("info", "Study/classes adapter: bootstrapped.", {
        component: "study-classes",
    });
}

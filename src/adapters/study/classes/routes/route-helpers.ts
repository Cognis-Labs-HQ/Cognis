import type { RouteContext } from "../../../../api/reuse/route-context.js";
import type { DbClassesStore } from "../store/index.js";

export type SetRole = (username: string, role: "teacher") => Promise<void>;
export type DispatchToRole = (
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
    deleteCalendar?: (ownerAccountId: string, calendarId: string) => void;
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
    archiveClassroomChat?: (input: { classId: string }) => Promise<void>;
    archiveClassroomMeetings?: (input: { classId: string }) => Promise<void>;
    getPresenceStatuses?: (
        accountIds: string[],
    ) => Promise<Record<string, "online" | "away" | "offline">>;
    log?: (
        level: string,
        message: string,
        meta?: Record<string, unknown>,
    ) => void;
    routeContext?: RouteContext;
}

export function normalizeLanguageList(input: unknown): string[] {
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

export function normalizeJoinMode(
    input: unknown,
): "invite_only" | "on_request" | "open" {
    const joinMode = String(input ?? "")
        .trim()
        .toLowerCase();
    if (joinMode === "invite_only" || joinMode === "open") {
        return joinMode;
    }
    return "on_request";
}

export function resolveClassroomMode(
    role: string,
    requestedMode: string | null,
): "teacher" | "student" {
    const normalizedRole = String(role ?? "")
        .trim()
        .toLowerCase();
    if (normalizedRole === "teacher" && requestedMode === "student") {
        return "student";
    }
    return normalizedRole === "teacher" ? "teacher" : "student";
}

export function filterClassesBySearchQuery<
    T extends {
        name?: string;
        languageCode?: string;
        teacherAccountId?: string;
        id?: string;
    },
>(classes: T[], searchQuery: string): T[] {
    if (!searchQuery) {
        return classes;
    }
    const normalizedQuery = searchQuery.toLowerCase();
    return classes.filter((classRow) =>
        [
            classRow.name ?? "",
            classRow.languageCode ?? "",
            classRow.teacherAccountId ?? "",
            classRow.id ?? "",
        ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery),
    );
}

export async function decorateMemberships(
    options: ClassesRouteOptions,
    memberships: Array<{
        studentAccountId: string;
        [key: string]: unknown;
    }>,
) {
    const presenceByAccountId = options.getPresenceStatuses
        ? await options.getPresenceStatuses(
              memberships.map((membership) => membership.studentAccountId),
          )
        : {};
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
                presence:
                    presenceByAccountId[membership.studentAccountId] ??
                    "offline",
            };
        }),
    );
}

export async function syncClassroomArtifacts(
    store: DbClassesStore,
    options: ClassesRouteOptions,
    classId: string,
) {
    const classRow = await store.getClassById(classId);
    if (!classRow) return null;
    await store.getClassroomState(classRow.id);
    const members = await store.getClassMembersForViewer(
        classRow.id,
        classRow.teacherAccountId,
    );
    const chat = await options.resolveClassroomChatUrl?.({
        classId: classRow.id,
        title: classRow.name || `Classroom ${classRow.languageCode}`,
        teacherAccountId: classRow.teacherAccountId,
        memberAccountIds: members.map((member) => member.studentAccountId),
    });
    return { classRow, chat };
}

export function buildDefaultClassName(input: {
    teacherDisplayName: string;
    languageName: string;
}) {
    const teacherDisplayName =
        String(input.teacherDisplayName ?? "").trim() || "Teacher";
    const languageName = String(input.languageName ?? "").trim() || "Language";
    return `${teacherDisplayName}'s ${languageName} class`;
}

export async function resolveAgendaCalendarId(
    options: ClassesRouteOptions,
    ownerAccountId: string,
    classId: string,
) {
    const calendarName = `class-agenda-${classId}`;
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

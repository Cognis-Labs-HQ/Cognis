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
export type DispatchNotification = (envelope: {
    category: string;
    recipientUsername: string;
    subject: string;
    body: string;
    senderName?: string;
    actionUrl?: string;
    metadata?: Record<string, unknown>;
}) => Promise<unknown>;

export interface ClassesRouteOptions {
    requireTeacherManualApproval?: () => Promise<boolean> | boolean;
    setRole?: SetRole;
    setProfileRole?: SetRole;
    dispatchToRole?: DispatchToRole;
    dispatchNotification?: DispatchNotification;
    accountExists?: (accountId: string) => Promise<boolean>;
    areFriends?: (accountA: string, accountB: string) => Promise<boolean>;
    getProfileSummary?: (accountId: string) => Promise<{
        handle?: string | null;
        displayName?: string | null;
        avatarKey?: string | null;
        visibility?: string | null;
    } | null>;
    isBlocked?: (blockerId: string, blockedId: string) => Promise<boolean>;
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
    updateCalendar?: (input: {
        ownerAccountId: string;
        calendarId: string;
        name?: string;
    }) => { id: string; name: string } | null;
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
    listCalendarSharedUsers?: (input: {
        ownerAccountId: string;
        calendarId: string;
    }) => Promise<
        Array<{
            recipientAccountId: string;
        }>
    >;
    upsertCalendarShareForUser?: (input: {
        ownerAccountId: string;
        calendarId: string;
        recipientAccountId: string;
        recipientHandle?: string | null;
        recipientDisplayName?: string | null;
        recipientAvatarKey?: string | null;
        permission?: "read" | "write";
    }) => Promise<void>;
    deleteCalendarShareForUser?: (input: {
        ownerAccountId: string;
        calendarId: string;
        recipientAccountId: string;
    }) => Promise<void>;
    archiveClassroomChat?: (input: { classId: string }) => Promise<void>;
    archiveClassroomMeetings?: (input: { classId: string }) => Promise<void>;
    getPresenceStatuses?: (
        accountIds: string[],
    ) => Promise<Record<string, "online" | "away" | "offline">>;
    whiteboardUrl?: string;
    whiteboardSecret?: string;
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
    requestedStudentView: string | null,
): "teacher" | "student" {
    const normalizedRole = String(role ?? "")
        .trim()
        .toLowerCase();
    if (normalizedRole === "teacher" && requestedStudentView === "true") {
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
    input?: {
        viewerAccountId?: string;
        isTeacherViewer?: boolean;
    },
) {
    const viewerAccountId = String(input?.viewerAccountId ?? "").trim();
    const isTeacherViewer = input?.isTeacherViewer === true;
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
            const isSelf =
                viewerAccountId &&
                membership.studentAccountId === viewerAccountId;
            const blocked = !isTeacherViewer
                ? (await options.isBlocked?.(
                      membership.studentAccountId,
                      viewerAccountId,
                  )) ||
                  (await options.isBlocked?.(
                      viewerAccountId,
                      membership.studentAccountId,
                  )) ||
                  false
                : false;
            const hasPrivateVisibility =
                String(profile?.visibility ?? "")
                    .trim()
                    .toLowerCase() === "private";
            const isFriend =
                !isTeacherViewer && viewerAccountId && !isSelf
                    ? await options.areFriends?.(
                          viewerAccountId,
                          membership.studentAccountId,
                      )
                    : false;
            const identityMasked =
                !isTeacherViewer &&
                !isSelf &&
                (blocked || (hasPrivateVisibility && !isFriend));
            return {
                ...membership,
                handle: identityMasked ? null : (profile?.handle ?? null),
                displayName: identityMasked
                    ? "???"
                    : (profile?.displayName ?? null),
                avatarKey: identityMasked ? null : (profile?.avatarKey ?? null),
                presence:
                    presenceByAccountId[membership.studentAccountId] ??
                    "offline",
                identityMasked,
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
    const agendaCalendarId = await resolveAgendaCalendarId(
        options,
        classRow.teacherAccountId,
        classRow,
    );
    if (
        agendaCalendarId &&
        (options.upsertCalendarShareForUser ||
            options.deleteCalendarShareForUser)
    ) {
        const memberAccountIds = new Set(
            members
                .map((member) => String(member.studentAccountId ?? "").trim())
                .filter(
                    (accountId) =>
                        Boolean(accountId) &&
                        accountId !== classRow.teacherAccountId,
                ),
        );
        const existingShares = options.listCalendarSharedUsers
            ? await options.listCalendarSharedUsers({
                  ownerAccountId: classRow.teacherAccountId,
                  calendarId: agendaCalendarId,
              })
            : [];
        for (const memberAccountId of memberAccountIds) {
            const profile =
                (await options.getProfileSummary?.(memberAccountId)) ?? null;
            await options.upsertCalendarShareForUser?.({
                ownerAccountId: classRow.teacherAccountId,
                calendarId: agendaCalendarId,
                recipientAccountId: memberAccountId,
                recipientHandle: profile?.handle ?? null,
                recipientDisplayName: profile?.displayName ?? null,
                recipientAvatarKey: profile?.avatarKey ?? null,
                permission: "read",
            });
        }
        for (const share of existingShares) {
            const recipientAccountId = String(
                share.recipientAccountId ?? "",
            ).trim();
            if (
                !recipientAccountId ||
                memberAccountIds.has(recipientAccountId)
            ) {
                continue;
            }
            await options.deleteCalendarShareForUser?.({
                ownerAccountId: classRow.teacherAccountId,
                calendarId: agendaCalendarId,
                recipientAccountId,
            });
        }
    }
    return { classRow, chat };
}

function resolveClassDisplayName(input: {
    name?: string | null;
    languageCode?: string | null;
    id?: string | null;
}) {
    return (
        String(input.name ?? "").trim() ||
        String(input.languageCode ?? "").trim() ||
        String(input.id ?? "").trim() ||
        "Classroom"
    );
}

export function buildAgendaCalendarName(input: {
    name?: string | null;
    languageCode?: string | null;
    id?: string | null;
}) {
    return resolveClassDisplayName(input);
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
    classRow: {
        id: string;
        name?: string | null;
        languageCode?: string | null;
    },
    config: { createIfMissing?: boolean } = {},
) {
    const classId = String(classRow.id ?? "").trim();
    if (!classId) return null;
    const calendarName = buildAgendaCalendarName(classRow);
    const legacyCalendarName = `class-agenda-${classId}`;
    const existingCalendar = options
        .listCalendars?.(ownerAccountId)
        ?.find(
            (calendar) =>
                calendar.name === calendarName ||
                calendar.name === legacyCalendarName,
        );
    if (existingCalendar) {
        if (
            existingCalendar.name !== calendarName &&
            options.updateCalendar &&
            existingCalendar.name === legacyCalendarName
        ) {
            options.updateCalendar({
                ownerAccountId,
                calendarId: existingCalendar.id,
                name: calendarName,
            });
        }
        return existingCalendar.id;
    }
    if (config.createIfMissing === false) {
        return null;
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

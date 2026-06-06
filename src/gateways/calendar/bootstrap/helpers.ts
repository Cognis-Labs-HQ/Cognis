import { randomBytes } from "node:crypto";
import { sanitizeFilenameBase } from "../../../api/reuse/sanitize-filename.js";
import type {
    CalendarEventRecord,
    CalendarEventResponse,
    CalendarVisibility,
} from "../gateway/index.js";
import type { CalendarShareLinkRegistryRecord } from "./share-registry.js";

const DEFAULT_SHARE_TTL_SECONDS = 24 * 3600;

export type NotificationDispatcher = (envelope: {
    category: string;
    recipientUsername: string;
    recipientEmail?: string;
    subject: string;
    body: string;
    actionUrl?: string;
    senderName?: string;
    metadata?: Record<string, unknown>;
    attachments?: Array<{
        filename: string;
        contentType?: string;
        content: string;
    }>;
}) => Promise<{ dispatched: string[] }>;

export type ResolveAccountId = (
    handleOrIdentifier: string,
) => Promise<string | null>;
export type CalendarLogger = (
    level: string,
    msg: string,
    meta?: Record<string, unknown>,
) => void;

export type EventLocationRef = {
    calendarId: string;
    eventId: string;
};

export function normalizeVisibility(value: unknown): CalendarVisibility {
    return value === "public" ? "public" : "private";
}

export function normalizeStringList(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return Array.from(
        new Set(
            value.map((entry) => String(entry ?? "").trim()).filter(Boolean),
        ),
    );
}

export function normalizeReminderOffsets(value: unknown): number[] {
    const maxReminderOffsetMinutes = 7 * 24 * 60 * 52;
    if (!Array.isArray(value)) return [];
    return Array.from(
        new Set(
            value
                .map((entry) =>
                    typeof entry === "number" ? entry : Number(entry),
                )
                .filter(
                    (entry) =>
                        Number.isFinite(entry) &&
                        entry > 0 &&
                        entry <= maxReminderOffsetMinutes,
                )
                .map((entry) => Math.trunc(entry)),
        ),
    ).sort((left, right) => left - right);
}

export function buildCalendarShareData(input: {
    shareLink: CalendarShareLinkRegistryRecord;
    externalHost: string;
}): {
    id: string;
    name: string | null;
    passphrase: string | null;
    expiresAt: string;
    shareUrl: string;
    caldavUrl: string;
    icsUrl: string;
} {
    const caldavPath = `/api/v1/calendar/caldav/share/${encodeURIComponent(
        input.shareLink.token,
    )}`;
    const icsPath = `/api/v1/calendar/ics/share/${encodeURIComponent(
        input.shareLink.token,
    )}`;
    const toAbsoluteOrPath = (relativePath: string) =>
        input.externalHost
            ? `${input.externalHost}${relativePath}`
            : relativePath;
    const caldavUrl = toAbsoluteOrPath(caldavPath);
    const icsUrl = toAbsoluteOrPath(icsPath);
    return {
        id: input.shareLink.id,
        name: input.shareLink.name,
        passphrase: input.shareLink.passphrase,
        expiresAt: input.shareLink.expiresAt,
        shareUrl: caldavUrl,
        caldavUrl,
        icsUrl,
    };
}

export function createCalendarSharePassphrase(): string {
    return randomBytes(12).toString("hex");
}

export function resolveShareExpiry(expiresInHours: unknown): string {
    if (expiresInHours === null) return "";
    if (
        typeof expiresInHours !== "number" ||
        !Number.isFinite(expiresInHours)
    ) {
        return new Date(
            Date.now() + DEFAULT_SHARE_TTL_SECONDS * 1000,
        ).toISOString();
    }
    if (expiresInHours <= 0) {
        return new Date(
            Date.now() + DEFAULT_SHARE_TTL_SECONDS * 1000,
        ).toISOString();
    }
    const ttlSeconds = Math.max(1, Math.round(expiresInHours * 3600));
    return new Date(Date.now() + ttlSeconds * 1000).toISOString();
}

export async function normalizeAttendeesForOwner(
    attendees: unknown,
    ownerAccountId: string,
    resolveAccountId: ResolveAccountId | null,
): Promise<string[]> {
    const normalized = normalizeStringList(attendees);
    const resolved = await Promise.all(
        normalized.map((attendee) =>
            resolveNotificationRecipientUsername(attendee, resolveAccountId),
        ),
    );
    return Array.from(
        new Set(
            [...resolved, ownerAccountId]
                .map((entry) => String(entry ?? "").trim())
                .filter(Boolean),
        ),
    );
}

export function normalizeResponseValue(value: unknown): CalendarEventResponse {
    return value === "accepted" || value === "tentative" || value === "declined"
        ? value
        : "pending";
}

export function buildIcsAttachmentFilename(eventTitle: string): string {
    return `${sanitizeFilenameBase(eventTitle, "event")}.ics`;
}

export function sendJson(
    res: ServerResponse,
    statusCode: number,
    payload: unknown,
): void {
    res.writeHead(statusCode, { "content-type": "application/json" });
    res.end(JSON.stringify(payload));
}

export function sendCalendarError(
    res: ServerResponse,
    code: string,
    message: string,
    statusCode: number,
): void {
    sendJson(res, statusCode, {
        error: {
            code,
            message,
        },
    });
}

export function requireOrganizerOwnedSourceEvent(input: {
    gateway: CoreCalendarGateway;
    ownerAccountId: string;
    calendarId: string;
    eventId: string;
    res: ServerResponse;
    actionVerb: "edit" | "delete";
}): CalendarEventRecord | null {
    const targetEvent = input.gateway.getOwnedEvent(
        input.ownerAccountId,
        input.calendarId,
        input.eventId,
    );
    if (!targetEvent) {
        sendCalendarError(input.res, "not_found", "Event not found.", 404);
        return null;
    }
    const isOrganizerOwnedSourceEvent =
        targetEvent.createdBy === input.ownerAccountId &&
        targetEvent.sourceEventId === null;
    if (!isOrganizerOwnedSourceEvent) {
        sendCalendarError(
            input.res,
            "forbidden",
            `Only the event organizer can ${input.actionVerb} this event.`,
            403,
        );
        return null;
    }
    return targetEvent;
}

export function buildEventActionUrl(
    calendarId: string,
    eventId: string,
): string {
    const query = new URLSearchParams({
        calendarId,
        eventId,
    });
    return `/calendar?${query.toString()}`;
}

export function buildInternalInviteBody(
    event: CalendarEventRecord,
    eventActionUrl: string,
): string {
    return [
        `You were invited to ${event.title}.`,
        "",
        `Starts: ${event.startAt}`,
        `Ends: ${event.endAt}`,
        ...(event.description ? [`Description: ${event.description}`] : []),
        ...(event.meetingUrl ? [`Meeting link: ${event.meetingUrl}`] : []),
        "",
        "Open the event to respond with Accepted, Tentative, or Declined.",
        eventActionUrl,
    ].join("\n");
}

export function buildExternalInviteBody(
    event: CalendarEventRecord,
    meetingAccessUrl: string | null,
    inviterAccountId: string,
): string {
    return [
        `${inviterAccountId} invited you to ${event.title}.`,
        "",
        `Starts: ${event.startAt}`,
        `Ends: ${event.endAt}`,
        ...(event.description ? [`Description: ${event.description}`] : []),
        ...(meetingAccessUrl ? [`Meeting link: ${meetingAccessUrl}`] : []),
    ].join("\n");
}

export function buildResponseNotificationBody(
    event: CalendarEventRecord,
    attendeeAccountId: string,
    response: CalendarEventResponse,
): string {
    return [
        `${attendeeAccountId} responded to ${event.title}.`,
        "",
        `Response: ${response}`,
        `Starts: ${event.startAt}`,
        `Ends: ${event.endAt}`,
    ].join("\n");
}

export function buildCancellationNotificationBody(
    event: CalendarEventRecord,
): string {
    return [
        `${event.title} has been cancelled.`,
        "",
        `Starts: ${event.startAt}`,
        `Ends: ${event.endAt}`,
        ...(event.description ? [`Description: ${event.description}`] : []),
        ...(event.meetingUrl ? [`Meeting link: ${event.meetingUrl}`] : []),
    ].join("\n");
}

export function buildReminderNotificationBody(
    event: CalendarEventRecord,
    reminderOffsetMinutes: number,
): string {
    return [
        `Reminder set for ${event.title}.`,
        "",
        `Starts: ${event.startAt}`,
        `Ends: ${event.endAt}`,
        `Reminder: ${reminderOffsetMinutes} minutes before`,
        ...(event.description ? [`Description: ${event.description}`] : []),
        ...(event.meetingUrl ? [`Meeting link: ${event.meetingUrl}`] : []),
    ].join("\n");
}

async function resolveNotificationRecipientUsername(
    attendee: string,
    resolveAccountId: ResolveAccountId | null,
): Promise<string> {
    if (!resolveAccountId) return attendee;
    try {
        return (await resolveAccountId(attendee)) ?? attendee;
    } catch {
        return attendee;
    }
}

export async function dispatchInviteNotifications({
    gateway,
    event,
    dispatchNotification,
    canInviteByEmail,
    externalHost,
    inviterAccountId,
    calendarId,
    resolveAccountId,
    log,
}: {
    gateway: CoreCalendarGateway;
    event: CalendarEventRecord;
    dispatchNotification: NotificationDispatcher | null;
    canInviteByEmail: boolean;
    externalHost: string;
    inviterAccountId: string;
    calendarId: string;
    resolveAccountId: ResolveAccountId | null;
    log?: CalendarLogger;
}): Promise<void> {
    if (!dispatchNotification) return;
    await Promise.all(
        event.attendees.map(async (attendee) => {
            const recipientUsername =
                await resolveNotificationRecipientUsername(
                    attendee,
                    resolveAccountId,
                );
            if (recipientUsername === inviterAccountId) return;
            const invitedCopy = gateway
                .listMirroredEvents(event.id)
                .find((copy) => {
                    const copyCalendar = gateway.getCalendar(copy.calendarId);
                    return copyCalendar?.ownerAccountId === recipientUsername;
                });
            const actionCalendarId = invitedCopy?.calendarId ?? calendarId;
            const actionEventId = invitedCopy?.id ?? event.id;
            const actionUrl = buildEventActionUrl(
                actionCalendarId,
                actionEventId,
            );
            try {
                await dispatchNotification({
                    category: "calendar",
                    recipientUsername,
                    subject: `Calendar invite: ${event.title}`,
                    body: buildInternalInviteBody(event, actionUrl),
                    actionUrl,
                    senderName: inviterAccountId,
                    metadata: {
                        eventId: actionEventId,
                        calendarId: actionCalendarId,
                    },
                });
            } catch (error) {
                log?.("error", "Calendar invite notification failed.", {
                    component: "calendar-gateway",
                    attendee: recipientUsername,
                    eventId: event.id,
                    error:
                        error instanceof Error ? error.message : String(error),
                });
            }
        }),
    );
    if (!canInviteByEmail || event.inviteEmails.length === 0) return;
    const eventIcs = gateway.exportCalendarAsIcs(calendarId);
    await Promise.all(
        event.inviteEmails.map(async (email) => {
            try {
                const scopedAccessToken = event.meetingUrl
                    ? gateway.issueScopedMeetingAccessToken({
                          targetUrl: event.meetingUrl,
                          createdByAccountId: inviterAccountId,
                          eventId: event.id,
                      })
                    : null;
                const meetingAccessUrl = scopedAccessToken
                    ? `${externalHost}/api/v1/calendar/meeting-access/${encodeURIComponent(scopedAccessToken.token)}`
                    : null;
                await dispatchNotification({
                    category: "calendar",
                    recipientUsername: email,
                    recipientEmail: email,
                    subject: `Calendar invite: ${event.title}`,
                    body: buildExternalInviteBody(
                        event,
                        meetingAccessUrl,
                        inviterAccountId,
                    ),
                    senderName: inviterAccountId,
                    actionUrl:
                        meetingAccessUrl ??
                        buildEventActionUrl(calendarId, event.id),
                    attachments: [
                        {
                            filename: buildIcsAttachmentFilename(event.title),
                            contentType: "text/calendar; charset=UTF-8",
                            content: eventIcs,
                        },
                    ],
                    metadata: {
                        eventId: event.id,
                        calendarId,
                    },
                });
            } catch (error) {
                log?.("error", "Calendar email invite notification failed.", {
                    component: "calendar-gateway",
                    email,
                    eventId: event.id,
                    error:
                        error instanceof Error ? error.message : String(error),
                });
            }
        }),
    );
}

export async function dispatchCancellationNotifications({
    dispatchNotification,
    event,
    resolveAccountId,
    canInviteByEmail,
    log,
}: {
    dispatchNotification: NotificationDispatcher | null;
    event: CalendarEventRecord;
    resolveAccountId: ResolveAccountId | null;
    canInviteByEmail: boolean;
    log?: CalendarLogger;
}): Promise<void> {
    if (!dispatchNotification) return;
    await Promise.all(
        event.attendees.map(async (attendee) => {
            const recipientUsername =
                await resolveNotificationRecipientUsername(
                    attendee,
                    resolveAccountId,
                );
            try {
                await dispatchNotification({
                    category: "calendar",
                    recipientUsername,
                    subject: `Event cancelled: ${event.title}`,
                    body: buildCancellationNotificationBody(event),
                    actionUrl: "/calendar",
                    senderName: event.createdBy,
                    metadata: {
                        eventId: event.id,
                        recurrenceId: event.recurrenceId,
                        cancelled: true,
                    },
                });
            } catch (error) {
                log?.("error", "Calendar cancellation notification failed.", {
                    component: "calendar-gateway",
                    attendee: recipientUsername,
                    eventId: event.id,
                    error:
                        error instanceof Error ? error.message : String(error),
                });
            }
        }),
    );
    if (!canInviteByEmail || event.inviteEmails.length === 0) return;
    await Promise.all(
        event.inviteEmails.map(async (email) => {
            try {
                await dispatchNotification({
                    category: "calendar",
                    recipientUsername: email,
                    recipientEmail: email,
                    subject: `Event cancelled: ${event.title}`,
                    body: buildCancellationNotificationBody(event),
                    senderName: event.createdBy,
                    metadata: {
                        eventId: event.id,
                        recurrenceId: event.recurrenceId,
                        cancelled: true,
                    },
                });
            } catch (error) {
                log?.(
                    "error",
                    "Calendar email cancellation notification failed.",
                    {
                        component: "calendar-gateway",
                        email,
                        eventId: event.id,
                        error:
                            error instanceof Error
                                ? error.message
                                : String(error),
                    },
                );
            }
        }),
    );
}

export async function dispatchReminderNotifications({
    dispatchNotification,
    event,
    resolveAccountId,
    log,
}: {
    dispatchNotification: NotificationDispatcher | null;
    event: CalendarEventRecord;
    resolveAccountId: ResolveAccountId | null;
    log?: CalendarLogger;
}): Promise<void> {
    if (!dispatchNotification) return;
    const reminders = normalizeReminderOffsets(event.reminderOffsetsMinutes);
    if (reminders.length === 0) return;
    await Promise.all(
        event.attendees.map(async (attendee) => {
            const recipientUsername =
                await resolveNotificationRecipientUsername(
                    attendee,
                    resolveAccountId,
                );
            await Promise.all(
                reminders.map(async (reminderOffsetMinutes) => {
                    const startAtMs = Date.parse(event.startAt);
                    const reminderAt = Number.isFinite(startAtMs)
                        ? new Date(
                              startAtMs - reminderOffsetMinutes * 60_000,
                          ).toISOString()
                        : null;
                    try {
                        await dispatchNotification({
                            category: "calendar",
                            recipientUsername,
                            subject: `Calendar reminder: ${event.title}`,
                            body: buildReminderNotificationBody(
                                event,
                                reminderOffsetMinutes,
                            ),
                            actionUrl: buildEventActionUrl(
                                event.calendarId,
                                event.id,
                            ),
                            senderName: event.createdBy,
                            metadata: {
                                eventId: event.id,
                                calendarId: event.calendarId,
                                reminderOffsetMinutes,
                                ...(reminderAt ? { reminderAt } : {}),
                            },
                        });
                    } catch (error) {
                        log?.(
                            "error",
                            "Calendar reminder notification failed.",
                            {
                                component: "calendar-gateway",
                                attendee: recipientUsername,
                                eventId: event.id,
                                reminderOffsetMinutes,
                                error:
                                    error instanceof Error
                                        ? error.message
                                        : String(error),
                            },
                        );
                    }
                }),
            );
        }),
    );
}

export function resolveCreatedSeries(
    gateway: CoreCalendarGateway,
    calendarId: string,
    event: CalendarEventRecord,
): CalendarEventRecord[] {
    if (!event.recurrenceId) {
        return [event];
    }
    return gateway
        .listEvents(calendarId)
        .filter((entry) => entry.recurrenceId === event.recurrenceId);
}

export function resolveEventMeta(
    event: CalendarEventRecord,
    accountId: string,
    response: CalendarEventResponse | null,
): Record<string, unknown> {
    const hasResponded =
        response === "accepted" ||
        response === "tentative" ||
        response === "declined";
    return {
        canEdit: event.createdBy === accountId,
        canRespond: event.attendees.includes(accountId) && !hasResponded,
        response,
        responseOptions: ["accepted", "tentative", "declined"],
    };
}

export function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : "calendar_error";
}

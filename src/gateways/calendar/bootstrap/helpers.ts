import { sanitizeFilenameBase } from "../../../api/reuse/sanitize-filename.js";
import type { CoreCalendarGateway } from "../gateway.js";
import type {
    CalendarEventRecord,
    CalendarEventResponse,
    CalendarVisibility,
} from "../gateway.js";

export const INVITED_CALENDAR_NAME = "Invited";
export const INVITED_CALENDAR_COLOR = "#8b5cf6";
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

export function buildCalendarShareData(input: {
    gateway: CoreCalendarGateway;
    ownerAccountId: string;
    calendarId: string;
    permission: unknown;
    expiresInHours: unknown;
    externalHost: string;
}): {
    permission: "read" | "write";
    shareUrl: string;
    caldavUrl: string;
    icsUrl: string;
} | null {
    const calendar = input.gateway.getOwnedCalendar(
        input.ownerAccountId,
        input.calendarId,
    );
    if (!calendar) return null;
    const permission = input.permission === "write" ? "write" : "read";
    const privateExportToken =
        calendar.visibility === "public"
            ? null
            : input.gateway.issuePrivateExportToken({
                  ownerAccountId: input.ownerAccountId,
                  calendarId: calendar.id,
                  ttlSeconds: resolveShareTtlSeconds(input.expiresInHours),
              }).token;
    const caldavPath =
        calendar.visibility === "public"
            ? `/api/v1/calendar/caldav/public/${encodeURIComponent(calendar.id)}`
            : `/api/v1/calendar/caldav/private/${encodeURIComponent(
                  String(privateExportToken),
              )}`;
    const icsPath =
        calendar.visibility === "public"
            ? `/api/v1/calendar/ics/public/${encodeURIComponent(calendar.id)}`
            : `/api/v1/calendar/ics/private/${encodeURIComponent(
                  String(privateExportToken),
              )}`;
    const toAbsoluteOrPath = (relativePath: string) =>
        input.externalHost
            ? `${input.externalHost}${relativePath}`
            : relativePath;
    const caldavUrl = toAbsoluteOrPath(caldavPath);
    const icsUrl = toAbsoluteOrPath(icsPath);
    return {
        permission,
        shareUrl: caldavUrl,
        caldavUrl,
        icsUrl,
    };
}

function resolveShareTtlSeconds(expiresInHours: unknown): number | null {
    if (expiresInHours === null) return null;
    if (
        typeof expiresInHours !== "number" ||
        !Number.isFinite(expiresInHours)
    ) {
        return DEFAULT_SHARE_TTL_SECONDS;
    }
    if (expiresInHours <= 0) return DEFAULT_SHARE_TTL_SECONDS;
    return Math.round(expiresInHours * 3600);
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

export async function syncInvitedCopiesForEvents({
    gateway,
    events,
    resolveAccountId,
}: {
    gateway: CoreCalendarGateway;
    events: CalendarEventRecord[];
    resolveAccountId: ResolveAccountId | null;
}): Promise<void> {
    for (const event of events) {
        const resolvedAttendees = Array.from(
            new Set(
                (
                    await Promise.all(
                        event.attendees.map(async (attendee) => {
                            if (!resolveAccountId) {
                                return attendee;
                            }
                            try {
                                const resolvedAccountId =
                                    await resolveAccountId(attendee);
                                return resolvedAccountId ?? attendee;
                            } catch {
                                return attendee;
                            }
                        }),
                    )
                )
                    .map((entry) => String(entry ?? "").trim())
                    .filter(Boolean),
            ),
        ).filter((accountId) => accountId !== event.createdBy);
        const existingCopies = gateway.listMirroredEvents(event.id);
        const existingCopyByOwner = new Map<string, CalendarEventRecord>();
        for (const copy of existingCopies) {
            const copyCalendar = gateway.getCalendar(copy.calendarId);
            if (!copyCalendar) continue;
            existingCopyByOwner.set(copyCalendar.ownerAccountId, copy);
        }

        for (const copy of existingCopies) {
            const copyCalendar = gateway.getCalendar(copy.calendarId);
            if (!copyCalendar) continue;
            if (resolvedAttendees.includes(copyCalendar.ownerAccountId))
                continue;
            gateway.deleteEvent({
                ownerAccountId: copyCalendar.ownerAccountId,
                calendarId: copy.calendarId,
                eventId: copy.id,
            });
        }

        for (const attendeeAccountId of resolvedAttendees) {
            const invitedCalendar = gateway.ensureSpecialCalendar(
                attendeeAccountId,
                INVITED_CALENDAR_NAME,
                INVITED_CALENDAR_COLOR,
            );
            const existingCopy = existingCopyByOwner.get(attendeeAccountId);
            if (existingCopy) {
                gateway.updateEvent({
                    ownerAccountId: attendeeAccountId,
                    calendarId: existingCopy.calendarId,
                    eventId: existingCopy.id,
                    title: event.title,
                    description: event.description,
                    startAt: event.startAt,
                    endAt: event.endAt,
                    attendees: event.attendees,
                    inviteEmails: event.inviteEmails,
                    meetingUrl: event.meetingUrl,
                    status: event.status,
                    recurrence: event.recurrence,
                    targetCalendarId: invitedCalendar.id,
                });
                continue;
            }
            gateway.addEventToCalendar({
                calendarId: invitedCalendar.id,
                sourceEventId: event.id,
                title: event.title,
                description: event.description,
                startAt: event.startAt,
                endAt: event.endAt,
                createdBy: event.createdBy,
                attendees: event.attendees,
                inviteEmails: event.inviteEmails,
                meetingUrl: event.meetingUrl,
                status: event.status,
                recurrence: event.recurrence,
                recurrenceId: event.recurrenceId,
            });
        }
    }
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
    return {
        canEdit: event.createdBy === accountId,
        canRespond: event.attendees.includes(accountId),
        response,
        responseOptions: ["accepted", "tentative", "declined"],
    };
}

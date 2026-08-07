import type { IncomingMessage, ServerResponse } from "node:http";
import { hasMinRole } from "@cognis/core";
import { readJson } from "../../../api/reuse/read-json.js";
import {
    resolveRouteContext,
    type RouteContext,
} from "../../../api/reuse/route-context.js";
import { CoreCalendarGateway } from "../gateway/index.js";
import {
    dispatchCancellationNotifications,
    dispatchInviteNotifications,
    errorMessage,
    includeSharedAudienceAttendees,
    normalizeAttendeesForOwner,
    normalizeReminderOffsets,
    normalizeStringList,
    normalizeVisibility,
    requireOrganizerOwnedSourceEvent,
    requireWritableSharedSourceEvent,
    resolveCreatedSeries,
    resolveEventMeta,
    resolveJitsiAvailability,
    sendCalendarError,
    sendJson,
    validateSharedCalendars,
    type CalendarLogger,
    type NotificationDispatcher,
    type ResolveAccountDisplayName,
    type ResolveAccountId,
} from "./helpers.js";
import { createReminderScheduler } from "./reminder-scheduler.js";
import { handleCalendarMutationRoutes } from "./calendar-mutation-routes.js";
import { handleCalendarEventRoutes } from "./calendar-event-routes.js";
import { handleCalendarResponseRoute } from "./respond-route.js";
import { handleCalendarShareRoutes } from "./share-routes.js";
import type { CalendarShareRegistry } from "./share-registry.js";
import { requireSharedCalendarPassword } from "./shared-password.js";
import { rejectInactiveSharedCalendar } from "./shared-calendar-guards.js";

export function createCalendarCoreRoutes({
    gateway,
    shareRegistry,
    routeContext,
    resolveMeetingsProviderAvailability,
    resolveShareableUsers,
    resolveAccountId,
    resolveAccountDisplayName,
    log,
    getDispatchNotification,
    ensureNotificationCategory,
    getCapability,
    runUpcomingEventsFlow,
}: {
    gateway: CoreCalendarGateway;
    shareRegistry: CalendarShareRegistry;
    routeContext?: RouteContext;
    resolveMeetingsProviderAvailability:
        ((providerId: string) => Promise<boolean> | boolean) | null;
    resolveShareableUsers:
        | ((input: { ownerAccountId: string; query: string }) => Promise<
              Array<{
                  accountId: string;
                  handle?: string | null;
                  displayName?: string | null;
                  avatarKey?: string | null;
              }>
          >)
        | null;
    resolveAccountId: ResolveAccountId | null;
    resolveAccountDisplayName: ResolveAccountDisplayName | null;
    log?: CalendarLogger;
    getDispatchNotification: () => NotificationDispatcher | null;
    ensureNotificationCategory: () => void;
    getCapability: <T>(capabilityId: string) => T | undefined;
    runUpcomingEventsFlow: (input: {
        accountId: string;
        limit?: number;
    }) => Promise<unknown[]>;
}): (req: IncomingMessage, res: ServerResponse, url: URL) => Promise<boolean> {
    const ctx = resolveRouteContext(routeContext);
    const externalHost =
        process.env.EXTERNAL_HOST ??
        (process.env.HOST ? `http://${process.env.HOST}` : "");
    const shareBuildAbsoluteUrl = ctx.getCapability?.<
        (relativePath: string) => string
    >("share:buildAbsoluteUrl");
    const buildShareAbsoluteUrl =
        typeof shareBuildAbsoluteUrl === "function"
            ? shareBuildAbsoluteUrl
            : (relativePath: string) =>
                  externalHost
                      ? `${externalHost}${relativePath}`
                      : relativePath;
    const {
        clearScheduledReminderTimersForEvent,
        scheduleReminderNotificationsForEvent,
    } = createReminderScheduler({
        getDispatchNotification,
        resolveAccountId,
        log,
    });
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        ensureNotificationCategory();
        const dispatchNotification = getDispatchNotification();
        if (
            url.pathname === "/api/v1/calendar/upcoming-events" &&
            req.method === "GET"
        ) {
            const claims = ctx.requireAuth(req, res, "user");
            if (!claims) return true;
            const limitParameter = url.searchParams.get("limit");
            const limit =
                limitParameter === null ? undefined : Number(limitParameter);
            if (
                limit !== undefined &&
                (!Number.isSafeInteger(limit) || limit < 1)
            ) {
                sendCalendarError(
                    res,
                    "bad_request",
                    "The limit parameter must be a positive integer.",
                    400,
                );
                return true;
            }
            const results = await runUpcomingEventsFlow({
                accountId: claims.sub,
                limit,
            });
            sendJson(res, 200, { data: results[0] ?? [] });
            return true;
        }
        const sharedEventsMatch = url.pathname.match(
            /^\/api\/v1\/calendar\/shared\/([^/]+)\/events$/,
        );
        if (
            sharedEventsMatch &&
            (req.method === "GET" ||
                req.method === "POST" ||
                req.method === "PATCH" ||
                req.method === "DELETE")
        ) {
            const claims = ctx.requireAuth(req, res, "user");
            if (!claims) return true;
            const calendarId = decodeURIComponent(sharedEventsMatch[1]);
            const resolveGuestAccess = ctx.getCapability?.<
                (accessInput: {
                    claims: { sub?: string };
                    resourceType: string;
                    resourceId: string;
                    requiredCapability: string;
                }) => Promise<{ shareGuest: boolean; authorized: boolean }>
            >("share:resolveGuestAccess");
            const requiredCapability =
                req.method === "GET" ? "calendar:read" : "calendar:write";
            const guestAccess = resolveGuestAccess
                ? await resolveGuestAccess({
                      claims,
                      resourceType: "calendar",
                      resourceId: calendarId,
                      requiredCapability,
                  })
                : { shareGuest: false, authorized: false };
            if (!guestAccess.authorized) {
                sendCalendarError(
                    res,
                    "forbidden",
                    "Share access denied.",
                    403,
                );
                return true;
            }
            if (req.method === "GET") {
                sendJson(res, 200, { data: gateway.listEvents(calendarId) });
                return true;
            }
            const body = (await readJson(req)) as Record<string, unknown>;
            try {
                if (req.method === "PATCH") {
                    const eventId = String(body.eventId ?? "").trim();
                    const event = gateway.updateSharedEvent({
                        calendarId,
                        eventId,
                        title:
                            typeof body.title === "string"
                                ? body.title
                                : undefined,
                        description:
                            typeof body.description === "string"
                                ? body.description
                                : undefined,
                        startAt:
                            typeof body.startAt === "string"
                                ? body.startAt
                                : undefined,
                        endAt:
                            typeof body.endAt === "string"
                                ? body.endAt
                                : undefined,
                    });
                    await gateway.flushStore();
                    log?.("info", "Shared calendar event updated.", {
                        component: "calendar-gateway",
                        operation: "update_shared_event",
                        calendarId,
                        eventId: event.id,
                    });
                    sendJson(res, 200, { data: event });
                    return true;
                }
                if (req.method === "DELETE") {
                    const eventId = String(body.eventId ?? "").trim();
                    const deletedEvents = gateway.deleteSharedEvent({
                        calendarId,
                        eventId,
                    });
                    await gateway.flushStore();
                    log?.("info", "Shared calendar event deleted.", {
                        component: "calendar-gateway",
                        operation: "delete_shared_event",
                        calendarId,
                        eventId,
                    });
                    sendJson(res, 200, { data: deletedEvents });
                    return true;
                }
                const event = gateway.addEventToCalendar({
                    calendarId,
                    title: String(body.title ?? "").trim(),
                    description: String(body.description ?? ""),
                    startAt: String(body.startAt ?? ""),
                    endAt: String(body.endAt ?? ""),
                    createdBy: claims.sub,
                    attendees: [],
                    inviteEmails: [],
                    reminderOffsetsMinutes: [],
                    meetingUrl: null,
                    status: "busy",
                    recurrence: "none",
                });
                await gateway.flushStore();
                log?.("info", "Shared calendar event created.", {
                    component: "calendar-gateway",
                    operation: "create_shared_event",
                    calendarId,
                    eventId: event.id,
                });
                sendJson(res, 201, { data: event });
            } catch (error) {
                sendCalendarError(res, "bad_request", errorMessage(error), 400);
            }
            return true;
        }
        if (
            url.pathname === "/api/v1/calendar/calendars" &&
            req.method === "GET"
        ) {
            const claims = ctx.requireAuth(req, res, "user");
            if (!claims) return true;
            const requestedAccountId = String(
                url.searchParams.get("accountId") ?? "",
            ).trim();
            if (requestedAccountId && !hasMinRole(claims.role, "admin")) {
                sendCalendarError(
                    res,
                    "forbidden",
                    "Only administrators can list another account's calendars.",
                    403,
                );
                return true;
            }
            const targetAccountId = requestedAccountId || claims.sub;
            gateway.ensureDefaultCalendar(targetAccountId);
            const jitsiAvailable = await resolveJitsiAvailability(
                resolveMeetingsProviderAvailability,
                log,
            );
            const validatedCalendars = await validateSharedCalendars(
                gateway.listCalendars(targetAccountId),
                targetAccountId,
                shareRegistry,
                gateway,
                log,
            );
            const getShareTokenById = getCapability<
                (shareId: string) => Promise<{
                    accessControls?: { passwordProtected?: boolean };
                } | null>
            >("share:getTokenById");
            const calendarsWithShareAccess = await Promise.all(
                validatedCalendars.map(async (calendar) => {
                    if (calendar.visibility !== "shared") return calendar;
                    const shared = await shareRegistry.getByRecipientCalendarId(
                        calendar.id,
                    );
                    const token = shared?.shareTokenId
                        ? await getShareTokenById?.(shared.shareTokenId)
                        : null;
                    return {
                        ...calendar,
                        shareId: shared?.shareTokenId ?? null,
                        sharePasswordProtected:
                            token?.accessControls?.passwordProtected === true,
                    };
                }),
            );
            sendJson(res, 200, {
                data: calendarsWithShareAccess,
                meta: {
                    canInviteExternal: hasMinRole(claims.role, "admin"),
                    currentAccountId: targetAccountId,
                    requestedByAccountId: claims.sub,
                    jitsiAvailable,
                },
            });
            return true;
        }
        if (
            url.pathname === "/api/v1/calendar/invitations" &&
            req.method === "GET"
        ) {
            const claims = ctx.requireAuth(req, res, "user");
            if (!claims) return true;
            const requestedAccountId = String(
                url.searchParams.get("accountId") ?? "",
            ).trim();
            if (requestedAccountId && !hasMinRole(claims.role, "admin")) {
                sendCalendarError(
                    res,
                    "forbidden",
                    "Only administrators can list another account's invitations.",
                    403,
                );
                return true;
            }
            const targetAccountId = requestedAccountId || claims.sub;
            sendJson(res, 200, {
                data: gateway.listInvitedPendingEvents(targetAccountId),
            });
            return true;
        }
        if (
            url.pathname === "/api/v1/calendar/calendars" &&
            req.method === "POST"
        ) {
            const claims = ctx.requireAuth(req, res, "user");
            if (!claims) return true;
            const body = (await readJson(req)) as {
                name?: unknown;
                visibility?: unknown;
                color?: unknown;
                defaultReminderOffsetsMinutes?: unknown;
            };
            const name = String(body?.name ?? "").trim();
            if (!name) {
                sendCalendarError(
                    res,
                    "bad_request",
                    "Calendar name is required.",
                    400,
                );
                return true;
            }
            if (name.length > 30) {
                sendCalendarError(
                    res,
                    "validation_error",
                    "Calendar names are limited to 30 characters.",
                    400,
                );
                return true;
            }
            const requestedAccountId = String(
                url.searchParams.get("accountId") ?? "",
            ).trim();
            if (requestedAccountId && !hasMinRole(claims.role, "admin")) {
                sendCalendarError(
                    res,
                    "forbidden",
                    "Only administrators can create calendars for another account.",
                    403,
                );
                return true;
            }
            const targetAccountId = requestedAccountId || claims.sub;
            try {
                const created = gateway.createCalendar({
                    ownerAccountId: targetAccountId,
                    name,
                    visibility: normalizeVisibility(body?.visibility),
                    color:
                        body?.color === undefined
                            ? undefined
                            : String(body.color),
                    defaultReminderOffsetsMinutes: normalizeReminderOffsets(
                        body?.defaultReminderOffsetsMinutes,
                    ),
                });
                await gateway.flushStore();
                sendJson(res, 201, { data: created });
            } catch (error) {
                log?.("error", "Failed to create calendar.", {
                    component: "calendar-gateway",
                    accountId: claims.sub,
                    error:
                        error instanceof Error ? error.message : String(error),
                });
                sendCalendarError(
                    res,
                    "internal_error",
                    "Failed to create calendar.",
                    500,
                );
            }
            return true;
        }
        if (
            await handleCalendarMutationRoutes({
                req,
                res,
                url,
                ctx,
                gateway,
                shareRegistry,
                getCapability,
                clearScheduledReminderTimersForEvent,
                scheduleReminderNotificationsForEvent,
                dispatchNotification,
                resolveAccountId,
                resolveAccountDisplayName,
                log,
            })
        ) {
            return true;
        }
        if (
            url.pathname.match(/^\/api\/v1\/calendar\/calendars\/[^/]+\/share/)
        ) {
            const shareClaims = ctx.requireAuth(req, res, "user");
            if (!shareClaims) return true;
            const handledShareRoute = await handleCalendarShareRoutes({
                req,
                res,
                url,
                claims: { sub: shareClaims.sub },
                gateway,
                shareRegistry,
                buildAbsoluteUrl: buildShareAbsoluteUrl,
                resolveShareableUsers,
                dispatchNotification,
                log,
            });
            if (handledShareRoute) return true;
        }
        const eventsMatch = url.pathname.match(
            /^\/api\/v1\/calendar\/calendars\/([^/]+)\/events$/,
        );
        if (eventsMatch && req.method === "GET") {
            const claims = ctx.requireAuth(req, res, "user");
            if (!claims) return true;
            const calendarId = decodeURIComponent(eventsMatch[1]);
            const ownedCalendar = gateway.getOwnedCalendar(
                claims.sub,
                calendarId,
            );
            const sharedCalendar =
                await shareRegistry.getByRecipientCalendarId(calendarId);
            const activeSharedCalendar =
                sharedCalendar?.recipientAccountId === claims.sub
                    ? sharedCalendar
                    : null;
            if (
                activeSharedCalendar &&
                !(await requireSharedCalendarPassword({
                    req,
                    res,
                    shareTokenId: activeSharedCalendar.shareTokenId,
                    getCapability,
                }))
            ) {
                return true;
            }
            if (
                rejectInactiveSharedCalendar({
                    gateway,
                    accountId: claims.sub,
                    calendarId,
                    activeShare: activeSharedCalendar,
                    res,
                })
            ) {
                return true;
            }
            if (!ownedCalendar && !activeSharedCalendar) {
                sendCalendarError(res, "not_found", "Calendar not found.", 404);
                return true;
            }
            const sourceCalendarId =
                activeSharedCalendar?.ownerCalendarId ?? calendarId;
            sendJson(res, 200, {
                data: {
                    calendar: gateway.getCalendar(calendarId),
                    events: activeSharedCalendar
                        ? gateway.listEvents(sourceCalendarId).map((event) => ({
                              ...event,
                              calendarId,
                          }))
                        : gateway.listEvents(sourceCalendarId),
                },
            });
            return true;
        }

        if (eventsMatch && req.method === "POST") {
            const claims = ctx.requireAuth(req, res, "user");
            if (!claims) return true;
            const calendarId = decodeURIComponent(eventsMatch[1]);
            const body = (await readJson(req)) as Record<string, unknown>;
            const title = String(body?.title ?? "").trim();
            const startAt = String(body?.startAt ?? "").trim();
            const endAt = String(body?.endAt ?? "").trim();
            const inviteEmails = normalizeStringList(body.inviteEmails);
            const reminderOffsetsMinutes = normalizeReminderOffsets(
                body.reminderOffsetsMinutes,
            );
            const canInviteByEmail = hasMinRole(claims.role, "admin");
            if (!title || !startAt || !endAt) {
                sendCalendarError(
                    res,
                    "bad_request",
                    "title, startAt, and endAt are required.",
                    400,
                );
                return true;
            }
            if (inviteEmails.length > 0 && !canInviteByEmail) {
                sendCalendarError(
                    res,
                    "forbidden",
                    "Only founder or admin users can send email invites.",
                    403,
                );
                return true;
            }
            try {
                const sharedCalendar =
                    await shareRegistry.getByRecipientCalendarId(calendarId);
                const activeSharedCalendar =
                    sharedCalendar?.recipientAccountId === claims.sub
                        ? sharedCalendar
                        : null;
                if (
                    activeSharedCalendar &&
                    !(await requireSharedCalendarPassword({
                        req,
                        res,
                        shareTokenId: activeSharedCalendar.shareTokenId,
                        getCapability,
                    }))
                ) {
                    return true;
                }
                if (
                    rejectInactiveSharedCalendar({
                        gateway,
                        accountId: claims.sub,
                        calendarId,
                        activeShare: activeSharedCalendar,
                        res,
                    })
                ) {
                    return true;
                }
                const shared = activeSharedCalendar;
                if (shared?.permission === "read") {
                    throw new Error("calendar_forbidden");
                }
                const targetCalendarId = shared?.ownerCalendarId ?? calendarId;
                const attendees = await normalizeAttendeesForOwner(
                    body.attendees,
                    claims.sub,
                    resolveAccountId,
                );
                const sharedAudienceAttendees = shared
                    ? await includeSharedAudienceAttendees(
                          attendees,
                          shareRegistry,
                          shared.ownerAccountId,
                          shared.ownerCalendarId,
                      )
                    : attendees;
                const createdEvent = shared
                    ? gateway.addEventToCalendar({
                          calendarId: targetCalendarId,
                          title,
                          description:
                              typeof body.description === "string"
                                  ? body.description
                                  : null,
                          startAt,
                          endAt,
                          createdBy: claims.sub,
                          attendees: sharedAudienceAttendees,
                          inviteEmails,
                          reminderOffsetsMinutes,
                          meetingUrl:
                              typeof body.meetingUrl === "string"
                                  ? body.meetingUrl
                                  : null,
                          status: body.status === "free" ? "free" : "busy",
                          recurrence:
                              body.recurrence === "daily" ||
                              body.recurrence === "weekly" ||
                              body.recurrence === "monthly" ||
                              body.recurrence === "yearly"
                                  ? body.recurrence
                                  : "none",
                      })
                    : gateway.addEvent({
                          ownerAccountId: claims.sub,
                          calendarId,
                          title,
                          description:
                              typeof body.description === "string"
                                  ? body.description
                                  : null,
                          startAt,
                          endAt,
                          attendees: sharedAudienceAttendees,
                          inviteEmails,
                          reminderOffsetsMinutes,
                          meetingUrl:
                              typeof body.meetingUrl === "string"
                                  ? body.meetingUrl
                                  : null,
                          status: body.status === "free" ? "free" : "busy",
                          recurrence:
                              body.recurrence === "daily" ||
                              body.recurrence === "weekly" ||
                              body.recurrence === "monthly" ||
                              body.recurrence === "yearly"
                                  ? body.recurrence
                                  : "none",
                      });
                const createdSeries = resolveCreatedSeries(
                    gateway,
                    targetCalendarId,
                    createdEvent,
                );
                await gateway.flushStore();
                await dispatchInviteNotifications({
                    gateway,
                    event: createdEvent,
                    dispatchNotification,
                    shareRegistry,
                    canInviteByEmail,
                    externalHost,
                    inviterAccountId: claims.sub,
                    calendarId,
                    resolveAccountId,
                    resolveAccountDisplayName,
                    log,
                });
                createdSeries.forEach((event) => {
                    scheduleReminderNotificationsForEvent(event);
                });
                sendJson(res, 201, { data: createdEvent });
            } catch (error) {
                const message = errorMessage(error);
                if (message === "calendar_not_found") {
                    sendCalendarError(
                        res,
                        "not_found",
                        "Calendar not found.",
                        404,
                    );
                    return true;
                }
                if (message === "calendar_forbidden") {
                    sendCalendarError(
                        res,
                        "forbidden",
                        "Calendar is read-only.",
                        403,
                    );
                    return true;
                }
                if (message === "calendar_invalid_range") {
                    sendCalendarError(
                        res,
                        "bad_request",
                        "Event end time must be after start time.",
                        400,
                    );
                    return true;
                }
                if (message === "calendar_event_title_required") {
                    sendCalendarError(
                        res,
                        "bad_request",
                        "Event title is required.",
                        400,
                    );
                    return true;
                }
                log?.("error", "Failed to create event.", {
                    component: "calendar-gateway",
                    accountId: claims.sub,
                    calendarId,
                    error: message,
                });
                sendCalendarError(
                    res,
                    "internal_error",
                    "Failed to create event.",
                    500,
                );
            }
            return true;
        }

        if (
            await handleCalendarEventRoutes({
                req,
                res,
                url,
                ctx,
                gateway,
                shareRegistry,
                getCapability,
                clearScheduledReminderTimersForEvent,
                scheduleReminderNotificationsForEvent,
                dispatchNotification,
                resolveAccountId,
                resolveAccountDisplayName,
                log,
            })
        ) {
            return true;
        }

        const respondMatch = url.pathname.match(
            /^\/api\/v1\/calendar\/calendars\/([^/]+)\/events\/([^/]+)\/respond$/,
        );
        if (respondMatch && req.method === "POST") {
            const claims = ctx.requireAuth(req, res, "user");
            if (!claims) return true;
            const responseCalendarId = decodeURIComponent(respondMatch[1]);
            const responseSharedCalendar =
                await shareRegistry.getByRecipientCalendarId(
                    responseCalendarId,
                );
            if (
                responseSharedCalendar?.recipientAccountId === claims.sub &&
                !(await requireSharedCalendarPassword({
                    req,
                    res,
                    shareTokenId: responseSharedCalendar.shareTokenId,
                    getCapability,
                }))
            ) {
                return true;
            }
            await handleCalendarResponseRoute({
                req,
                res,
                url,
                claims,
                calendarId: responseCalendarId,
                eventId: decodeURIComponent(respondMatch[2]),
                gateway,
                shareRegistry,
                dispatchNotification,
                resolveAccountDisplayName:
                    resolveAccountDisplayName ?? undefined,
                onEventUpdatedForReminders:
                    scheduleReminderNotificationsForEvent,
                log,
            });
            return true;
        }
        const meetingAccessMatch = url.pathname.match(
            /^\/api\/v1\/calendar\/meeting-access\/([^/]+)$/,
        );
        if (meetingAccessMatch && req.method === "GET") {
            const token = decodeURIComponent(meetingAccessMatch[1]);
            const scopedToken = gateway.consumeScopedMeetingAccessToken(token);
            if (!scopedToken) {
                sendCalendarError(
                    res,
                    "not_found",
                    "Meeting access link is invalid or expired.",
                    404,
                );
                return true;
            }
            res.writeHead(302, { location: scopedToken.targetUrl });
            res.end();
            return true;
        }

        return false;
    };
}

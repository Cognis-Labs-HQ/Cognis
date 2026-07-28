import type { IncomingMessage, ServerResponse } from "node:http";
import { hasMinRole } from "@cognis/core";
import { readJson } from "../../../api/reuse/read-json.js";
import {
    resolveRouteContext,
    type RouteContext,
} from "../../../api/reuse/route-context.js";
import { normalizeCalendarColor } from "../color.js";
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
import { handleCalendarResponseRoute } from "./respond-route.js";
import { handleCalendarShareRoutes } from "./share-routes.js";
import type { CalendarShareRegistry } from "./share-registry.js";

function rejectInactiveSharedCalendar(input: {
    gateway: CoreCalendarGateway;
    accountId: string;
    calendarId: string;
    activeShare: unknown;
    res: ServerResponse;
}): boolean {
    const calendar = input.gateway.getOwnedCalendar(
        input.accountId,
        input.calendarId,
    );
    if (calendar?.visibility !== "shared" || input.activeShare) return false;
    sendCalendarError(
        input.res,
        "share_inactive",
        "This calendar share is no longer active.",
        410,
    );
    return true;
}
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
}: {
    gateway: CoreCalendarGateway;
    shareRegistry: CalendarShareRegistry;
    routeContext?: RouteContext;
    resolveMeetingsProviderAvailability:
        | ((providerId: string) => Promise<boolean> | boolean)
        | null;
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
            sendJson(res, 200, {
                data: validatedCalendars,
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
                    color: normalizeCalendarColor(body?.color),
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
        const patchCalendarMatch = url.pathname.match(
            /^\/api\/v1\/calendar\/calendars\/([^/]+)$/,
        );
        if (patchCalendarMatch && req.method === "PATCH") {
            const claims = ctx.requireAuth(req, res, "user");
            if (!claims) return true;
            const calendarId = decodeURIComponent(patchCalendarMatch[1]);
            const sharedCalendar =
                await shareRegistry.getByRecipientCalendarId(calendarId);
            if (
                rejectInactiveSharedCalendar({
                    gateway,
                    accountId: claims.sub,
                    calendarId,
                    activeShare:
                        sharedCalendar?.recipientAccountId === claims.sub
                            ? sharedCalendar
                            : null,
                    res,
                })
            ) {
                return true;
            }
            const body = await readJson(req);
            if (sharedCalendar?.recipientAccountId === claims.sub) {
                const requestedFields = Object.keys(body ?? {});
                if (
                    requestedFields.some(
                        (field) => field !== "color" && field !== "name",
                    )
                ) {
                    sendCalendarError(
                        res,
                        "forbidden",
                        "Only the local name and color of a shared calendar can be changed.",
                        403,
                    );
                    return true;
                }
                const currentCalendar = gateway.getOwnedCalendar(
                    claims.sub,
                    calendarId,
                );
                const suffixMatch = String(currentCalendar?.name ?? "").match(
                    /( \(Shared by .+\))$/,
                );
                const requestedName =
                    body.name === undefined
                        ? undefined
                        : String(body.name).trim();
                if (
                    requestedName !== undefined &&
                    (!requestedName || requestedName.length > 30)
                ) {
                    sendCalendarError(
                        res,
                        "validation_error",
                        "Calendar names must contain 1 to 30 characters.",
                        400,
                    );
                    return true;
                }
                const updated = gateway.updateCalendar({
                    ownerAccountId: claims.sub,
                    calendarId,
                    name:
                        requestedName === undefined
                            ? undefined
                            : `${requestedName}${suffixMatch?.[1] ?? ""}`,
                    color: normalizeCalendarColor(body.color),
                });
                await gateway.flushStore();
                sendJson(res, 200, {
                    data: {
                        ...updated,
                        sharedPermission: sharedCalendar.permission,
                    },
                });
                return true;
            }
            try {
                if (
                    body?.name !== undefined &&
                    String(body.name).trim().length > 30
                ) {
                    sendCalendarError(
                        res,
                        "validation_error",
                        "Calendar names are limited to 30 characters.",
                        400,
                    );
                    return true;
                }
                const updated = gateway.updateCalendar({
                    ownerAccountId: claims.sub,
                    calendarId,
                    name:
                        body?.name !== undefined
                            ? String(body.name)
                            : undefined,
                    visibility:
                        body?.visibility !== undefined
                            ? normalizeVisibility(body.visibility)
                            : undefined,
                    color:
                        body?.color !== undefined
                            ? normalizeCalendarColor(body.color)
                            : undefined,
                    defaultReminderOffsetsMinutes:
                        body?.defaultReminderOffsetsMinutes !== undefined
                            ? normalizeReminderOffsets(
                                  body.defaultReminderOffsetsMinutes,
                              )
                            : undefined,
                });
                await gateway.flushStore();
                sendJson(res, 200, { data: updated });
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
                if (message === "calendar_default_name_locked") {
                    sendCalendarError(
                        res,
                        "conflict",
                        "Default calendar name cannot be changed.",
                        409,
                    );
                    return true;
                }
                if (message === "calendar_name_required") {
                    sendCalendarError(
                        res,
                        "validation_error",
                        "Calendar name is required.",
                        400,
                    );
                    return true;
                }
                log?.("error", "Failed to update calendar.", {
                    component: "calendar-gateway",
                    accountId: claims.sub,
                    calendarId,
                    error: message,
                });
                sendCalendarError(
                    res,
                    "internal_error",
                    "Failed to update calendar.",
                    500,
                );
            }
            return true;
        }
        const deleteCalendarMatch = url.pathname.match(
            /^\/api\/v1\/calendar\/calendars\/([^/]+)$/,
        );
        if (deleteCalendarMatch && req.method === "DELETE") {
            const claims = ctx.requireAuth(req, res, "user");
            if (!claims) return true;
            const calendarId = decodeURIComponent(deleteCalendarMatch[1]);
            const sharedCalendar =
                await shareRegistry.getByRecipientCalendarId(calendarId);
            if (
                rejectInactiveSharedCalendar({
                    gateway,
                    accountId: claims.sub,
                    calendarId,
                    activeShare:
                        sharedCalendar?.recipientAccountId === claims.sub
                            ? sharedCalendar
                            : null,
                    res,
                })
            ) {
                return true;
            }
            if (sharedCalendar?.recipientAccountId === claims.sub) {
                const removeUserShareRecipient = getCapability<
                    (input: {
                        shareId: string;
                        recipientAccountId: string;
                    }) => Promise<"updated" | "deleted" | "not_found">
                >("share:removeUserRecipient");
                if (!removeUserShareRecipient) {
                    sendCalendarError(
                        res,
                        "service_unavailable",
                        "Share recipient removal is unavailable.",
                        503,
                    );
                    return true;
                }
                if (!sharedCalendar.shareTokenId) {
                    sendCalendarError(
                        res,
                        "not_found",
                        "Share token not found.",
                        404,
                    );
                    return true;
                }
                const removalResult = await removeUserShareRecipient({
                    shareId: sharedCalendar.shareTokenId,
                    recipientAccountId: claims.sub,
                });
                if (removalResult === "not_found") {
                    sendCalendarError(
                        res,
                        "not_found",
                        "Share not found.",
                        404,
                    );
                    return true;
                }
                await shareRegistry.deleteCalendarUserShare({
                    ownerAccountId: sharedCalendar.ownerAccountId,
                    ownerCalendarId: sharedCalendar.ownerCalendarId,
                    shareId: sharedCalendar.id,
                });
                gateway.deleteCalendar({
                    ownerAccountId: claims.sub,
                    calendarId,
                });
                await gateway.flushStore();
                log?.("info", "Calendar recipient left user share.", {
                    component: "calendar-gateway",
                    operation: "leave_calendar_share",
                    calendarId: sharedCalendar.ownerCalendarId,
                    recipientAccountId: claims.sub,
                    shareId: sharedCalendar.shareTokenId,
                    shareDeleted: removalResult === "deleted",
                });
                sendJson(res, 200, { data: { deleted: true } });
                return true;
            }
            try {
                const ownedCalendar = gateway.getOwnedCalendar(
                    claims.sub,
                    calendarId,
                );
                if (!ownedCalendar) {
                    sendCalendarError(
                        res,
                        "not_found",
                        "Calendar not found.",
                        404,
                    );
                    return true;
                }
                if (ownedCalendar.isDefault) {
                    sendCalendarError(
                        res,
                        "conflict",
                        "Default calendar cannot be deleted.",
                        409,
                    );
                    return true;
                }
                const deleteResourceShares = getCapability<
                    (input: {
                        ownerAccountId: string;
                        resourceType: string;
                        resourceId: string;
                    }) => Promise<number>
                >("share:deleteResourceShares");
                const userShares = await shareRegistry.listCalendarUserShares(
                    claims.sub,
                    calendarId,
                );
                for (const userShare of userShares) {
                    const recipientCalendar = gateway.getOwnedCalendar(
                        userShare.recipientAccountId,
                        userShare.recipientCalendarId,
                    );
                    if (recipientCalendar?.visibility === "shared") {
                        gateway.deleteCalendar({
                            ownerAccountId: userShare.recipientAccountId,
                            calendarId: userShare.recipientCalendarId,
                        });
                    }
                    await shareRegistry.deleteCalendarUserShare({
                        ownerAccountId: claims.sub,
                        ownerCalendarId: calendarId,
                        shareId: userShare.id,
                    });
                }
                const shareLinks = await shareRegistry.listShareLinks(
                    claims.sub,
                    calendarId,
                );
                await Promise.all(
                    shareLinks.map((shareLink) =>
                        shareRegistry.deleteShareLink({
                            ownerAccountId: claims.sub,
                            calendarId,
                            shareId: shareLink.id,
                        }),
                    ),
                );
                await deleteResourceShares?.({
                    ownerAccountId: claims.sub,
                    resourceType: "calendar",
                    resourceId: calendarId,
                });
                const deletedEventIds = gateway
                    .listEvents(calendarId)
                    .map((event) => event.id);
                deletedEventIds.forEach((eventId) => {
                    clearScheduledReminderTimersForEvent(eventId);
                });
                gateway.deleteCalendar({
                    ownerAccountId: claims.sub,
                    calendarId,
                });
                await gateway.flushStore();
                sendJson(res, 200, { data: { deleted: true } });
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
                if (message === "calendar_default_locked") {
                    sendCalendarError(
                        res,
                        "conflict",
                        "Default calendar cannot be deleted.",
                        409,
                    );
                    return true;
                }
                log?.("error", "Failed to delete calendar.", {
                    component: "calendar-gateway",
                    accountId: claims.sub,
                    calendarId,
                    error: message,
                });
                sendCalendarError(
                    res,
                    "internal_error",
                    "Failed to delete calendar.",
                    500,
                );
            }
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
                const sharedAudienceAttendees =
                    await includeSharedAudienceAttendees(
                        attendees,
                        shareRegistry,
                        shared?.ownerAccountId ?? claims.sub,
                        shared?.ownerCalendarId ?? calendarId,
                    );
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

        const eventMatch = url.pathname.match(
            /^\/api\/v1\/calendar\/calendars\/([^/]+)\/events\/([^/]+)$/,
        );
        if (eventMatch && req.method === "GET") {
            const claims = ctx.requireAuth(req, res, "user");
            if (!claims) return true;
            const calendarId = decodeURIComponent(eventMatch[1]);
            const eventId = decodeURIComponent(eventMatch[2]);
            const sharedCalendar =
                await shareRegistry.getByRecipientCalendarId(calendarId);
            const activeSharedCalendar =
                sharedCalendar?.recipientAccountId === claims.sub
                    ? sharedCalendar
                    : null;
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
            const ownedCalendar = activeSharedCalendar
                ? null
                : gateway.getOwnedCalendar(claims.sub, calendarId);
            const ownedEvent = ownedCalendar
                ? gateway.getEvent(calendarId, eventId)
                : activeSharedCalendar
                  ? gateway.getEvent(
                        activeSharedCalendar.ownerCalendarId,
                        eventId,
                    )
                  : null;
            let invitedEvent = null;
            if (!ownedCalendar && !activeSharedCalendar) {
                const fetchedEvent = gateway.getEvent(calendarId, eventId);
                invitedEvent = fetchedEvent?.attendees.includes(claims.sub)
                    ? fetchedEvent
                    : null;
            }
            const effectiveCalendar =
                ownedCalendar ?? gateway.getCalendar(calendarId);
            const effectiveEvent = ownedEvent ?? invitedEvent;
            if (!effectiveCalendar || !effectiveEvent) {
                sendCalendarError(res, "not_found", "Event not found.", 404);
                return true;
            }
            sendJson(res, 200, {
                data: {
                    calendar: effectiveCalendar,
                    event: effectiveEvent,
                    meta: resolveEventMeta(
                        effectiveEvent,
                        claims.sub,
                        gateway.getEventResponse(effectiveEvent.id, claims.sub),
                        activeSharedCalendar?.permission ?? null,
                    ),
                },
            });
            return true;
        }

        if (eventMatch && req.method === "PATCH") {
            const claims = ctx.requireAuth(req, res, "user");
            if (!claims) return true;
            const calendarId = decodeURIComponent(eventMatch[1]);
            const eventId = decodeURIComponent(eventMatch[2]);
            const sharedCalendar =
                await shareRegistry.getByRecipientCalendarId(calendarId);
            const activeSharedCalendar =
                sharedCalendar?.recipientAccountId === claims.sub
                    ? sharedCalendar
                    : null;
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
            const ownerAccountId =
                activeSharedCalendar?.ownerAccountId ?? claims.sub;
            const sourceCalendarId =
                activeSharedCalendar?.ownerCalendarId ?? calendarId;
            const body = (await readJson(req)) as Record<string, unknown>;
            if (
                activeSharedCalendar &&
                (body.attendees !== undefined ||
                    body.inviteEmails !== undefined)
            ) {
                sendCalendarError(
                    res,
                    "forbidden",
                    "Shared calendar recipients cannot change event participants or responses.",
                    403,
                );
                return true;
            }
            const inviteEmails = normalizeStringList(body.inviteEmails);
            const canInviteByEmail = hasMinRole(claims.role, "admin");
            if (inviteEmails.length > 0 && !canInviteByEmail) {
                sendCalendarError(
                    res,
                    "forbidden",
                    "Only founder or admin users can send email invites.",
                    403,
                );
                return true;
            }
            if (
                activeSharedCalendar &&
                !requireWritableSharedSourceEvent({
                    gateway,
                    sharedCalendar: activeSharedCalendar,
                    eventId,
                    res,
                })
            ) {
                return true;
            }
            if (
                !activeSharedCalendar &&
                !requireOrganizerOwnedSourceEvent({
                    gateway,
                    ownerAccountId: claims.sub,
                    calendarId,
                    eventId,
                    res,
                    actionVerb: "edit",
                })
            ) {
                return true;
            }
            try {
                const attendees = Array.isArray(body.attendees)
                    ? await normalizeAttendeesForOwner(
                          body.attendees,
                          claims.sub,
                          resolveAccountId,
                      )
                    : undefined;
                const updatedEvent = gateway.updateEvent({
                    ownerAccountId,
                    calendarId: sourceCalendarId,
                    eventId,
                    title:
                        typeof body.title === "string" ? body.title : undefined,
                    description:
                        typeof body.description === "string" ||
                        body.description === null
                            ? body.description
                            : undefined,
                    startAt:
                        typeof body.startAt === "string"
                            ? body.startAt
                            : undefined,
                    endAt:
                        typeof body.endAt === "string" ? body.endAt : undefined,
                    attendees,
                    inviteEmails: Array.isArray(body.inviteEmails)
                        ? inviteEmails
                        : undefined,
                    reminderOffsetsMinutes: Array.isArray(
                        body.reminderOffsetsMinutes,
                    )
                        ? normalizeReminderOffsets(body.reminderOffsetsMinutes)
                        : undefined,
                    meetingUrl:
                        typeof body.meetingUrl === "string" ||
                        body.meetingUrl === null
                            ? body.meetingUrl
                            : undefined,
                    status:
                        body.status === "free" || body.status === "busy"
                            ? body.status
                            : undefined,
                    recurrence:
                        body.recurrence === "daily" ||
                        body.recurrence === "weekly" ||
                        body.recurrence === "monthly" ||
                        body.recurrence === "yearly" ||
                        body.recurrence === "none"
                            ? body.recurrence
                            : undefined,
                    targetCalendarId:
                        !activeSharedCalendar &&
                        typeof body.calendarId === "string"
                            ? body.calendarId
                            : undefined,
                    updateAll: body.updateAll === true,
                });
                const updatedCalendarId =
                    !activeSharedCalendar &&
                    typeof body.calendarId === "string" &&
                    body.calendarId.trim().length > 0
                        ? body.calendarId.trim()
                        : sourceCalendarId;
                const updatedSeries = resolveCreatedSeries(
                    gateway,
                    updatedCalendarId,
                    updatedEvent,
                );
                await gateway.flushStore();
                updatedSeries.forEach((event) => {
                    scheduleReminderNotificationsForEvent(event);
                });
                sendJson(res, 200, { data: updatedEvent });
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
                if (message === "calendar_event_not_found") {
                    sendCalendarError(
                        res,
                        "not_found",
                        "Event not found.",
                        404,
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
                log?.("error", "Failed to update event.", {
                    component: "calendar-gateway",
                    accountId: claims.sub,
                    calendarId,
                    eventId,
                    error: message,
                });
                sendCalendarError(
                    res,
                    "internal_error",
                    "Failed to update event.",
                    500,
                );
            }
            return true;
        }

        if (eventMatch && req.method === "DELETE") {
            const claims = ctx.requireAuth(req, res, "user");
            if (!claims) return true;
            const calendarId = decodeURIComponent(eventMatch[1]);
            const eventId = decodeURIComponent(eventMatch[2]);
            const sharedCalendar =
                await shareRegistry.getByRecipientCalendarId(calendarId);
            const activeSharedCalendar =
                sharedCalendar?.recipientAccountId === claims.sub
                    ? sharedCalendar
                    : null;
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
            const ownerAccountId =
                activeSharedCalendar?.ownerAccountId ?? claims.sub;
            const sourceCalendarId =
                activeSharedCalendar?.ownerCalendarId ?? calendarId;
            try {
                if (
                    activeSharedCalendar &&
                    !requireWritableSharedSourceEvent({
                        gateway,
                        sharedCalendar: activeSharedCalendar,
                        eventId,
                        res,
                    })
                ) {
                    return true;
                }
                if (
                    !activeSharedCalendar &&
                    !requireOrganizerOwnedSourceEvent({
                        gateway,
                        ownerAccountId: claims.sub,
                        calendarId,
                        eventId,
                        res,
                        actionVerb: "delete",
                    })
                ) {
                    return true;
                }
                const deletedEvents = gateway.deleteEvent({
                    ownerAccountId,
                    calendarId: sourceCalendarId,
                    eventId,
                    deleteAll: url.searchParams.get("series") === "1",
                });
                deletedEvents.forEach((deletedEvent) => {
                    clearScheduledReminderTimersForEvent(deletedEvent.id);
                });
                await gateway.flushStore();
                await Promise.all(
                    deletedEvents.map((deletedEvent) =>
                        dispatchCancellationNotifications({
                            dispatchNotification,
                            event: deletedEvent,
                            resolveAccountId,
                            canInviteByEmail: hasMinRole(claims.role, "admin"),
                            log,
                        }),
                    ),
                );
                sendJson(res, 200, { data: { deleted: true } });
            } catch (error) {
                const message = errorMessage(error);
                if (message === "calendar_event_not_found") {
                    sendCalendarError(
                        res,
                        "not_found",
                        "Event not found.",
                        404,
                    );
                    return true;
                }
                log?.("error", "Failed to delete event.", {
                    component: "calendar-gateway",
                    accountId: claims.sub,
                    calendarId,
                    eventId,
                    error: message,
                });
                sendCalendarError(
                    res,
                    "internal_error",
                    "Failed to delete event.",
                    500,
                );
            }
            return true;
        }
        const respondMatch = url.pathname.match(
            /^\/api\/v1\/calendar\/calendars\/([^/]+)\/events\/([^/]+)\/respond$/,
        );
        if (respondMatch && req.method === "POST") {
            const claims = ctx.requireAuth(req, res, "user");
            if (!claims) return true;
            await handleCalendarResponseRoute({
                req,
                res,
                url,
                claims,
                calendarId: decodeURIComponent(respondMatch[1]),
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

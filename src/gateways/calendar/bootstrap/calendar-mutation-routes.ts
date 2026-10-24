import type { IncomingMessage, ServerResponse } from "node:http";
import type { RouteContext } from "../../../api/reuse/route-context.js";
import { readJson } from "../../../api/reuse/read-json.js";
import { normalizeCalendarColor } from "../color.js";
import type { CoreCalendarGateway } from "../gateway/index.js";
import type { CalendarEventRecord } from "../gateway/utils.js";
import {
    dispatchCancellationNotifications,
    dispatchInviteNotifications,
    errorMessage,
    normalizeAttendeesForOwner,
    normalizeReminderOffsets,
    normalizeStringList,
    normalizeVisibility,
    sendCalendarError,
    sendJson,
    type CalendarLogger,
    type NotificationDispatcher,
    type ResolveAccountDisplayName,
    type ResolveAccountId,
} from "./helpers.js";
import type { CalendarShareRegistry } from "./share-registry.js";
import { requireSharedCalendarPassword } from "./shared-password.js";
import { rejectInactiveSharedCalendar } from "./shared-calendar-guards.js";

export async function handleCalendarMutationRoutes({
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
}: {
    req: IncomingMessage;
    res: ServerResponse;
    url: URL;
    ctx: RouteContext;
    gateway: CoreCalendarGateway;
    shareRegistry: CalendarShareRegistry;
    getCapability: <T>(capabilityId: string) => T | undefined;
    clearScheduledReminderTimersForEvent: (eventId: string) => void;
    scheduleReminderNotificationsForEvent: (event: CalendarEventRecord) => void;
    dispatchNotification: NotificationDispatcher | null;
    resolveAccountId: ResolveAccountId | null;
    resolveAccountDisplayName: ResolveAccountDisplayName | null;
    log?: CalendarLogger;
}): Promise<boolean> {
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
                body.name === undefined ? undefined : String(body.name).trim();
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
                name: body?.name !== undefined ? String(body.name) : undefined,
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
                sendCalendarError(res, "not_found", "Calendar not found.", 404);
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
                sendCalendarError(res, "not_found", "Share not found.", 404);
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
                sendCalendarError(res, "not_found", "Calendar not found.", 404);
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
                sendCalendarError(res, "not_found", "Calendar not found.", 404);
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
    return false;
}

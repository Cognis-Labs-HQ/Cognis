import type { IncomingMessage, ServerResponse } from "node:http";
import { readJson } from "../../../api/reuse/read-json.js";
import type { CoreCalendarGateway } from "../gateway.js";
import {
    buildResponseNotificationBody,
    errorMessage,
    normalizeResponseValue,
    sendCalendarError,
    sendJson,
    type CalendarLogger,
    type NotificationDispatcher,
} from "./helpers.js";

export async function handleCalendarResponseRoute(input: {
    req: IncomingMessage;
    res: ServerResponse;
    url: URL;
    claims: { sub: string };
    calendarId: string;
    eventId: string;
    gateway: CoreCalendarGateway;
    dispatchNotification: NotificationDispatcher | null;
    log?: CalendarLogger;
}): Promise<void> {
    const calendar = input.gateway.getOwnedCalendar(
        input.claims.sub,
        input.calendarId,
    );
    const event = calendar
        ? input.gateway.getEvent(input.calendarId, input.eventId)
        : null;
    if (!calendar || !event) {
        sendCalendarError(input.res, "not_found", "Event not found.", 404);
        return;
    }
    const body = (await readJson(input.req)) as {
        response?: unknown;
        targetCalendarId?: unknown;
    };
    const targetCalendarId =
        typeof body.targetCalendarId === "string" &&
        body.targetCalendarId.trim()
            ? body.targetCalendarId.trim()
            : null;
    if (
        body.response !== "accepted" &&
        body.response !== "tentative" &&
        body.response !== "declined"
    ) {
        sendCalendarError(
            input.res,
            "bad_request",
            "Response must be accepted, tentative, or declined.",
            400,
        );
        return;
    }
    const response = normalizeResponseValue(body.response);
    const respondAll = input.url.searchParams.get("series") === "1";
    try {
        if (
            response === "accepted" &&
            targetCalendarId &&
            !input.gateway.getOwnedCalendar(input.claims.sub, targetCalendarId)
        ) {
            throw new Error("calendar_not_found");
        }
        const responseRecord = input.gateway.setEventResponse({
            eventId: input.eventId,
            accountId: input.claims.sub,
            response,
            respondAll,
        });
        if (response === "accepted" && targetCalendarId) {
            input.gateway.moveOwnedEvent({
                ownerAccountId: input.claims.sub,
                calendarId: input.calendarId,
                eventId: input.eventId,
                targetCalendarId,
                moveAll: respondAll,
            });
        }
        await input.gateway.flushStore();
        if (
            input.dispatchNotification &&
            event.createdBy !== input.claims.sub
        ) {
            try {
                await input.dispatchNotification({
                    category: "calendar",
                    recipientUsername: event.createdBy,
                    subject: `Calendar response: ${event.title}`,
                    body: buildResponseNotificationBody(
                        event,
                        input.claims.sub,
                        response,
                    ),
                    actionUrl: "/calendar",
                    metadata: {
                        eventId: event.id,
                        response,
                        attendee: input.claims.sub,
                    },
                });
            } catch (error) {
                input.log?.("error", "Calendar response notification failed.", {
                    component: "calendar-gateway",
                    eventId: input.eventId,
                    accountId: input.claims.sub,
                    error:
                        error instanceof Error ? error.message : String(error),
                });
            }
        }
        sendJson(input.res, 200, { data: responseRecord });
    } catch (error) {
        const message = errorMessage(error);
        if (message === "calendar_response_forbidden") {
            sendCalendarError(
                input.res,
                "forbidden",
                "Only invited attendees can respond to this event.",
                403,
            );
            return;
        }
        if (message === "calendar_event_not_found") {
            sendCalendarError(input.res, "not_found", "Event not found.", 404);
            return;
        }
        if (message === "calendar_not_found") {
            sendCalendarError(
                input.res,
                "not_found",
                "Calendar not found.",
                404,
            );
            return;
        }
        input.log?.("error", "Failed to update event response.", {
            component: "calendar-gateway",
            eventId: input.eventId,
            accountId: input.claims.sub,
            error: message,
        });
        sendCalendarError(
            input.res,
            "internal_error",
            "Failed to update event response.",
            500,
        );
    }
}

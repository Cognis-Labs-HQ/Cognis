import type { CalendarEventRecord } from "../gateway/index.js";
import {
    dispatchReminderNotifications,
    normalizeReminderOffsets,
    type CalendarLogger,
    type NotificationDispatcher,
    type ResolveAccountId,
} from "./helpers.js";

const MAX_SET_TIMEOUT_DELAY_MILLISECONDS = 2 ** 31 - 1;

export function createReminderScheduler(input: {
    getDispatchNotification: () => NotificationDispatcher | null;
    resolveAccountId: ResolveAccountId | null;
    log?: CalendarLogger;
}) {
    const scheduledReminderTimers = new Map<string, NodeJS.Timeout>();
    const reminderKeysByEventId = new Map<string, Set<string>>();

    const removeReminderKey = (eventId: string, reminderKey: string) => {
        const reminderKeys = reminderKeysByEventId.get(eventId);
        if (!reminderKeys) return;
        reminderKeys.delete(reminderKey);
        if (reminderKeys.size === 0) {
            reminderKeysByEventId.delete(eventId);
        }
    };

    const clearScheduledReminderTimersForEvent = (eventId: string) => {
        const reminderKeys = reminderKeysByEventId.get(eventId);
        if (!reminderKeys) return;
        for (const reminderKey of reminderKeys) {
            const timer = scheduledReminderTimers.get(reminderKey);
            if (!timer) continue;
            clearTimeout(timer);
            scheduledReminderTimers.delete(reminderKey);
            removeReminderKey(eventId, reminderKey);
        }
    };

    const detachReminderTimer = (timer: NodeJS.Timeout) => {
        if (typeof timer.unref === "function") timer.unref();
    };

    const scheduleReminderNotificationsForEvent = (
        event: CalendarEventRecord,
    ) => {
        clearScheduledReminderTimersForEvent(event.id);
        const reminderOffsets = normalizeReminderOffsets(
            event.reminderOffsetsMinutes,
        );
        if (reminderOffsets.length === 0 || event.attendees.length === 0)
            return;
        const eventStartAtMilliseconds = Date.parse(event.startAt);
        if (!Number.isFinite(eventStartAtMilliseconds)) return;
        for (const attendee of event.attendees) {
            for (const reminderOffsetMinutes of reminderOffsets) {
                const reminderAtMilliseconds =
                    eventStartAtMilliseconds - reminderOffsetMinutes * 60_000;
                const initialDelayMilliseconds =
                    reminderAtMilliseconds - Date.now();
                if (
                    !Number.isFinite(initialDelayMilliseconds) ||
                    initialDelayMilliseconds <= 0
                ) {
                    input.log?.(
                        "warn",
                        "Skipped scheduling calendar reminder in the past.",
                        {
                            component: "calendar-gateway",
                            eventId: event.id,
                            attendee,
                            reminderOffsetMinutes,
                            reminderAt: new Date(
                                reminderAtMilliseconds,
                            ).toISOString(),
                            startAt: event.startAt,
                        },
                    );
                    continue;
                }
                const reminderKey = JSON.stringify([
                    event.id,
                    attendee,
                    reminderOffsetMinutes,
                ]);
                const scheduleDispatch = (
                    remainingDelayMilliseconds: number,
                ) => {
                    const delayMilliseconds = Math.min(
                        remainingDelayMilliseconds,
                        MAX_SET_TIMEOUT_DELAY_MILLISECONDS,
                    );
                    const timer = setTimeout(async () => {
                        if (!scheduledReminderTimers.has(reminderKey)) return;
                        if (
                            remainingDelayMilliseconds >
                            MAX_SET_TIMEOUT_DELAY_MILLISECONDS
                        ) {
                            scheduleDispatch(
                                remainingDelayMilliseconds -
                                    MAX_SET_TIMEOUT_DELAY_MILLISECONDS,
                            );
                            return;
                        }
                        scheduledReminderTimers.delete(reminderKey);
                        removeReminderKey(event.id, reminderKey);
                        const dispatchNotification =
                            input.getDispatchNotification();
                        if (!dispatchNotification) return;
                        await dispatchReminderNotifications({
                            dispatchNotification,
                            event: {
                                ...event,
                                attendees: [attendee],
                                reminderOffsetsMinutes: [reminderOffsetMinutes],
                            },
                            resolveAccountId: input.resolveAccountId,
                            log: input.log,
                        });
                    }, delayMilliseconds);
                    detachReminderTimer(timer);
                    scheduledReminderTimers.set(reminderKey, timer);
                    const eventReminderKeys =
                        reminderKeysByEventId.get(event.id) ?? new Set();
                    eventReminderKeys.add(reminderKey);
                    reminderKeysByEventId.set(event.id, eventReminderKeys);
                };
                scheduleDispatch(initialDelayMilliseconds);
            }
        }
    };

    return {
        clearScheduledReminderTimersForEvent,
        scheduleReminderNotificationsForEvent,
    };
}

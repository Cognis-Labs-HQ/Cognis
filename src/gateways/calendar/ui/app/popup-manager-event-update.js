/**
 * Creates the Calendar event update action used by the popup manager.
 * Public export: createCalendarEventUpdate(dependencies) returns updateExistingEvent(payload).
 * @example const updateEvent = createCalendarEventUpdate(dependencies); await updateEvent(eventChanges);
 */
import { findOverlappingEvents } from "./popup-manager-event-utils.js";

/** @param {object} dependencies Calendar UI facade, current events, translations, feedback and selection callbacks. @returns {Function} Updates an event and refreshes Calendar selection on success. */
export function createCalendarEventUpdate({
    getEventsByCalendar,
    calendarUi,
    showToast,
    i18n,
    reloadState,
    setSelectedCalendarId,
}) {
    return async function updateExistingEvent({
        sourceCalendarId,
        sourceEventId,
        calendarId,
        title,
        description,
        startAt,
        endAt,
        attendees,
        inviteEmails,
        reminderOffsetsMinutes,
        status,
        recurrence,
        meetingUrl,
        updateAll,
    }) {
        const targetCalendarId = String(calendarId ?? "").trim();
        const overlaps = findOverlappingEvents(getEventsByCalendar(), {
            calendarId: targetCalendarId,
            startAt: new Date(startAt).toISOString(),
            endAt: new Date(endAt).toISOString(),
            excludedEventId: sourceEventId,
        });
        if (overlaps.length > 0) {
            showToast(i18n.t("gateway.calendar.overlap_warning"), "warning");
        }
        const response = await calendarUi.updateEvent(
            sourceCalendarId,
            sourceEventId,
            {
                title,
                description,
                startAt: new Date(startAt).toISOString(),
                endAt: new Date(endAt).toISOString(),
                attendees,
                inviteEmails,
                reminderOffsetsMinutes,
                meetingUrl,
                status,
                recurrence,
                calendarId: targetCalendarId,
                updateAll,
            },
        );
        if (!response.ok) {
            showToast(i18n.t("gateway.calendar.update_event_failed"), "error");
            return false;
        }
        await reloadState();
        setSelectedCalendarId(targetCalendarId);
        showToast(i18n.t("gateway.calendar.update_event_success"), "success");
        return true;
    };
}

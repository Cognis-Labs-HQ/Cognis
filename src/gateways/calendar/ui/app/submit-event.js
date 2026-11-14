import { findOverlappingEvents } from "./popup-manager-event-utils.js";

export function createSubmitEvent({
    getMeetingsAvailable,
    signal,
    calendarUi,
    showToast,
    i18n,
    getEventsByCalendar,
    reloadState,
    setSelectedCalendarId,
    syncRouteSelection,
}) {
    let pending;
    async function submitEvent({
        calendarId,
        title,
        description,
        startAt,
        endAt,
        attendees,
        inviteEmails,
        reminderOffsetsMinutes,
        createMeeting,
        status,
        recurrence,
        allowConflict = false,
    }) {
        if (signal?.aborted) return false;
        const targetCalendarId = String(calendarId ?? "").trim();
        if (!targetCalendarId) return false;
        let meetingUrl = null;
        if (createMeeting && getMeetingsAvailable()) {
            try {
                meetingUrl = await calendarUi.createMeeting(attendees, {
                    scheduledAt: startAt,
                    signal,
                });
            } catch {
                if (signal?.aborted) return false;
                showToast(
                    i18n.t("gateway.calendar.create_meeting_failed"),
                    "error",
                );
                return false;
            }
        }
        if (signal?.aborted) return false;
        const overlaps = findOverlappingEvents(getEventsByCalendar(), {
            calendarId: targetCalendarId,
            startAt: new Date(startAt).toISOString(),
            endAt: new Date(endAt).toISOString(),
        });
        if (overlaps.length > 0 && !allowConflict) {
            showToast(
                i18n.t("gateway.calendar.overlap_warning_confirm"),
                "warning",
            );
            return "conflict";
        }
        const response = await calendarUi.createEvent(targetCalendarId, {
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
        });
        if (!response.ok) {
            showToast(i18n.t("gateway.calendar.create_event_failed"), "error");
            return false;
        }
        const payload = await response.json().catch(() => ({}));
        const createdEventId = String(payload?.data?.id ?? "");
        try {
            await reloadState();
        } catch (error) {
            console.error("[calendar] saved event view refresh failed", {
                operation: "refreshAfterCreate",
                errorName: error?.name,
            });
        }
        setSelectedCalendarId(targetCalendarId);
        syncRouteSelection();
        showToast(i18n.t("gateway.calendar.create_event_success"), "success");
        return createdEventId !== "" ? createdEventId : true;
    }
    return (input) => {
        pending ??= submitEvent(input).finally(() => {
            pending = undefined;
        });
        return pending;
    };
}

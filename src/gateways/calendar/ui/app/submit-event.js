import { findOverlappingEvents } from "./popup-manager-event-utils.js";

export function createSubmitEvent({
    getJitsiAvailable,
    calendarUi,
    showToast,
    i18n,
    getEventsByCalendar,
    apiFetch,
    reloadState,
    setSelectedCalendarId,
    syncRouteSelection,
}) {
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
        const targetCalendarId = String(calendarId ?? "").trim();
        if (!targetCalendarId) return false;
        let meetingUrl = null;
        if (createMeeting && getJitsiAvailable()) {
            try {
                meetingUrl = await calendarUi.createJitsiMeeting(attendees, {
                    scheduledAt: startAt,
                });
            } catch {
                showToast(
                    i18n.t("gateway.calendar.create_meeting_failed"),
                    "error",
                );
                return false;
            }
        }
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
        const response = await apiFetch(
            `/api/v1/calendar/calendars/${encodeURIComponent(targetCalendarId)}/events`,
            {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({
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
                }),
            },
        );
        if (!response.ok) {
            showToast(i18n.t("gateway.calendar.create_event_failed"), "error");
            return false;
        }
        const payload = await response.json().catch(() => ({}));
        const createdEventId = String(payload?.data?.id ?? "");
        await reloadState();
        setSelectedCalendarId(targetCalendarId);
        syncRouteSelection();
        showToast(i18n.t("gateway.calendar.create_event_success"), "success");
        return createdEventId !== "" ? createdEventId : true;
    }
    return submitEvent;
}

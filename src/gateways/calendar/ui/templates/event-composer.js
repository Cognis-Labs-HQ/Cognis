import { renderReminderField } from "../app/popup-manager-reminders.js";

export function renderEventComposerBody({
    popupBuilder,
    i18n,
    escapeHtml,
    startsAsAllDay,
    showMeetingToggle,
    eventData,
    calendars,
    selectedCalendarId,
}) {
    const reminderOffsets =
        eventData?.event?.reminderOffsetsMinutes ??
        calendars.find(
            (calendar) =>
                calendar.id === (eventData?.calendar?.id ?? selectedCalendarId),
        )?.defaultReminderOffsetsMinutes ??
        [];
    return `
    <div class="calendar-event-composer">
      ${popupBuilder.render()}
      <label class="calendar-checkbox-row calendar-checkbox-row--styled calendar-all-day-toggle">
        <input id="calendar-popup-all-day" type="checkbox"${startsAsAllDay ? " checked" : ""} />
        <span>${escapeHtml(i18n.t("gateway.calendar.all_day"))}</span>
      </label>
      <div class="calendar-participants-row">
        <label for="calendar-popup-participant-search">${escapeHtml(i18n.t("gateway.calendar.attendees_label"))}</label>
        <input id="calendar-popup-participant-search" type="text" placeholder="${escapeHtml(i18n.t("gateway.calendar.attendees_placeholder"))}" autocomplete="off" />
        <div id="calendar-popup-participant-options" class="calendar-participant-options"></div>
        <div id="calendar-popup-participant-chips" class="calendar-participant-list"></div>
      </div>
      ${showMeetingToggle ? `<label class="calendar-checkbox-row calendar-checkbox-row--styled"><input id="calendar-popup-create-meeting" type="checkbox" /> <span>${escapeHtml(i18n.t("gateway.calendar.create_meeting"))}</span></label>` : ""}
      ${renderReminderField({ i18n, escapeHtml, selectedOffsets: reminderOffsets })}
      ${eventData?.event?.recurrence && eventData.event.recurrence !== "none" ? `<label class="calendar-checkbox-row calendar-checkbox-row--styled"><input id="calendar-popup-update-all" type="checkbox" /> <span>${escapeHtml(i18n.t("gateway.calendar.update_series"))}</span></label>` : ""}
    </div>
  `;
}

import { formatDate, formatDateTime } from "/static/reuse/timestamp.js";

export function renderReadOnlyEventPopupBody({
    eventData,
    i18n,
    escapeHtml,
    calendarUi,
    participantDirectory,
    renderParticipantName,
    buildParticipantCardHtml,
    isAllDay,
}) {
    const responseClassByValue = {
        accepted: "btn-confirm",
        declined: "btn-cancel",
        tentative: "btn-neutral",
        pending: "btn-neutral",
    };
    const participantIds = Array.from(
        new Set([
            ...(Array.isArray(eventData.event.attendees)
                ? eventData.event.attendees
                : []),
            ...Object.keys(eventData.event.responses ?? {}),
        ]),
    );
    const attendeeMarkup = participantIds.length
        ? `<div class="calendar-participant-list">${participantIds
              .map((attendee) => {
                  const response = String(
                      eventData.event.responses?.[attendee] ?? "pending",
                  );
                  const responseClass =
                      responseClassByValue[response] ?? "btn-neutral";
                  const responseHtml = `<button type="button" class="calendar-participant-response ${responseClass}" disabled>${escapeHtml(i18n.t(calendarUi.getResponseLabelKey(response)))}</button>`;
                  return buildParticipantCardHtml(
                      {
                          type: "user",
                          value: attendee,
                          label: renderParticipantName(attendee),
                          avatarKey:
                              participantDirectory.get(attendee)?.avatarKey ??
                              "",
                      },
                      {
                          escapeHtml,
                          i18n,
                          removable: false,
                          participantKey: () => attendee,
                          responseHtml,
                      },
                  );
              })
              .join("")}</div>`
        : `<p class="calendar-empty">${escapeHtml(i18n.t("gateway.calendar.no_attendees"))}</p>`;
    const endDateForAllDay = new Date(eventData.event.endAt);
    if (isAllDay && !Number.isNaN(endDateForAllDay.getTime())) {
        // All-day events store endAt as an exclusive boundary (next day at midnight).
        endDateForAllDay.setDate(endDateForAllDay.getDate() - 1);
    }
    const eventDateRows = `<dt>${escapeHtml(i18n.t("gateway.calendar.event_start"))}</dt>
              <dd>${escapeHtml(isAllDay ? formatDate(eventData.event.startAt) : formatDateTime(eventData.event.startAt))}</dd>
              <dt>${escapeHtml(i18n.t("gateway.calendar.event_end"))}</dt>
              <dd>${escapeHtml(isAllDay ? formatDate(endDateForAllDay.toISOString()) : formatDateTime(eventData.event.endAt))}</dd>`;
    return `
          <div class="calendar-event-details">
            <dl class="calendar-event-detail-list">
              <dt>${escapeHtml(i18n.t("gateway.calendar.event_calendar"))}</dt>
              <dd>${escapeHtml(eventData.calendar.name)}</dd>
              ${eventDateRows}
              <dt>${escapeHtml(i18n.t("gateway.calendar.event_status"))}</dt>
              <dd>${escapeHtml(i18n.t(calendarUi.getStatusLabelKey(eventData.event.status)))}</dd>
              <dt>${escapeHtml(i18n.t("gateway.calendar.event_recurrence"))}</dt>
              <dd>${escapeHtml(i18n.t(calendarUi.getRecurrenceLabelKey(eventData.event.recurrence)))}</dd>
            </dl>
            <div class="calendar-event-detail-badges">${calendarUi.renderEventBadges(eventData.event, i18n)}</div>
            ${eventData.event.description ? `<p class="calendar-event-detail-description">${escapeHtml(eventData.event.description)}</p>` : `<p class="calendar-empty">${escapeHtml(i18n.t("gateway.calendar.no_description"))}</p>`}
            <section class="calendar-event-detail-section">
              <h4>${escapeHtml(i18n.t("gateway.calendar.attendees_label"))}</h4>
              ${attendeeMarkup}
            </section>
          </div>
        `;
}

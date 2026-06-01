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
    const attendeeMarkup = eventData.event.attendees?.length
        ? `<div class="calendar-participant-list">${eventData.event.attendees
              .map((attendee) =>
                  buildParticipantCardHtml(
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
                      },
                  ),
              )
              .join("")}</div>`
        : `<p class="calendar-empty">${escapeHtml(i18n.t("gateway.calendar.no_attendees"))}</p>`;
    const eventDateRows = isAllDay
        ? ""
        : `<dt>${escapeHtml(i18n.t("gateway.calendar.event_start"))}</dt>
              <dd>${escapeHtml(new Date(eventData.event.startAt).toLocaleString())}</dd>
              <dt>${escapeHtml(i18n.t("gateway.calendar.event_end"))}</dt>
              <dd>${escapeHtml(new Date(eventData.event.endAt).toLocaleString())}</dd>`;
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
            <section class="calendar-event-detail-section">
              <h4>${escapeHtml(i18n.t("gateway.calendar.responses_title"))}</h4>
              ${calendarUi.renderResponseSummary(eventData.event, i18n, participantDirectory) || `<p class="calendar-empty">${escapeHtml(i18n.t("gateway.calendar.no_responses"))}</p>`}
            </section>
          </div>
        `;
}

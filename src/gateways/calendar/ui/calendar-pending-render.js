const PENDING_ACTION_ICONS = {
    accepted: "✓",
    tentative: "?",
    declined: "✗",
};

const PENDING_ACTION_CLASSES = {
    accepted: "btn-confirm btn-animated calendar-pending-action",
    tentative: "popup-action-btn--neutral btn-animated calendar-pending-action",
    declined: "btn-cancel btn-animated calendar-pending-action",
};

export function createRenderPendingEvents({
    escapeHtml,
    formatDateTime,
    normalizeHexColor,
    EVENT_RESPONSE_OPTIONS,
    getResponseActionLabelKey,
}) {
    return function renderPendingEvents(events, i18n) {
        if (!events.length) {
            return "";
        }
        return `<section class="calendar-toolbar-subsection">
      <h4>${escapeHtml(i18n.t("gateway.calendar.pending_events"))}</h4>
      <ul class="calendar-events-list calendar-events-list--compact">${events
          .map(
              (
                  event,
              ) => `<li class="calendar-upcoming-item" style="--calendar-event-stripe:${escapeHtml(normalizeHexColor(event.calendarColor))}">
          <button type="button" class="calendar-upcoming-button" data-calendar-event="${escapeHtml(event.id)}" data-calendar-id="${escapeHtml(event.calendarId)}">
            <strong>${escapeHtml(event.title)}</strong>
            <div>${formatDateTime(event.startAt)}</div>
          </button>
          <div class="calendar-pending-actions">
            ${EVENT_RESPONSE_OPTIONS.map(
                (responseOption) =>
                    `<button type="button" class="${escapeHtml(PENDING_ACTION_CLASSES[responseOption] ?? "calendar-pending-action")}" data-calendar-pending-response="${escapeHtml(responseOption)}" data-calendar-event="${escapeHtml(event.id)}" data-calendar-id="${escapeHtml(event.calendarId)}" aria-label="${escapeHtml(i18n.t(getResponseActionLabelKey(responseOption)))}" title="${escapeHtml(i18n.t(getResponseActionLabelKey(responseOption)))}">${PENDING_ACTION_ICONS[responseOption] ?? responseOption}</button>`,
            ).join("")}
          </div>
        </li>`,
          )
          .join("")}</ul>
    </section>`;
    };
}

/**
 * Compact calendar days with complete event lists and an explicit creation action.
 * @param {object[]} days Dates and their events.
 * @param {object} i18n Localizer.
 * @param {Function} renderEvent Owner event renderer.
 * @param {{canCreate?: boolean}} options Effective write permission.
 * @returns {string} Agenda markup.
 */
import { formatDate } from "/static/reuse/timestamp.js";
import { escapeHtml } from "/static/reuse/escape-html.js";

export function renderCalendarAgenda(
    days,
    i18n,
    renderEvent,
    { canCreate = true } = {},
) {
    return `<div class="calendar-agenda">${days
        .map(({ date, events }) => {
            const start = new Date(date);
            start.setHours(9, 0, 0, 0);
            const end = new Date(start);
            end.setHours(10);
            return `<section class="calendar-agenda-day">
            <header class="calendar-agenda-heading"><h3>${escapeHtml(formatDate(date))}</h3>
            ${canCreate ? `<button type="button" class="btn-neutral calendar-agenda-add" aria-label="${escapeHtml(i18n.t("gateway.calendar.add_event"))}" title="${escapeHtml(i18n.t("gateway.calendar.add_event"))}" data-timeslot-add data-slot-start="${start.toISOString()}" data-slot-end="${end.toISOString()}"><span class="calendar-agenda-add-icon" aria-hidden="true"></span></button>` : ""}</header>
            ${
                events.length
                    ? `<div class="calendar-agenda-events">${[...events]
                          .sort(
                              (first, second) =>
                                  new Date(first.startAt) -
                                  new Date(second.startAt),
                          )
                          .map(renderEvent)
                          .join("")}</div>`
                    : `<p class="calendar-empty">${escapeHtml(i18n.t("gateway.calendar.no_events"))}</p>`
            }
        </section>`;
        })
        .join("")}</div>`;
}

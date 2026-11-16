import { toDateTimeLocalValue } from "./calendar-ui-helpers.js";
/**
 * Shared view choices for the calendar workspace and shared calendars.
 * @param {string[]} views Registered Calendar views.
 * @param {string} selectedView Current view.
 * @param {object} i18n Localizer.
 * @param {Date} activeDate Focused date.
 * @returns {string} Compact and wide view controls.
 */
import { escapeHtml } from "/static/reuse/escape-html.js";

export function renderCalendarViewSwitcher(
    views,
    selectedView,
    i18n,
    activeDate,
) {
    const label = (view) => escapeHtml(i18n.t(`gateway.calendar.view_${view}`));
    return `<div class="calendar-view-switcher">
        <select class="theme-select calendar-view-select" data-calendar-view-select aria-label="${escapeHtml(i18n.t("gateway.calendar.calendar_view"))}">${views.map((view) => `<option value="${view}"${view === selectedView ? " selected" : ""}>${label(view)}</option>`).join("")}</select>
        <input type="date" class="calendar-date-select" data-calendar-date value="${escapeHtml(toDateTimeLocalValue(activeDate).slice(0, 10))}" aria-label="${escapeHtml(i18n.t("ui.reuse.date"))}">
        ${views.map((view) => `<button type="button" data-calendar-view="${view}" class="${selectedView === view ? "active" : ""}" aria-pressed="${selectedView === view}">${label(view)}</button>`).join("")}
    </div>`;
}

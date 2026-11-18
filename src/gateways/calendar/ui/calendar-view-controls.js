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

/**
 * Binds native date and view controls for signed-in and shared Calendar pages.
 * @param {HTMLElement} root Calendar page root.
 * @param {object} options Allowed views, state callbacks and page lifetime.
 * @returns {void}
 */
export function mountCalendarViewControls(
    root,
    { views, onDateChange, onViewChange, signal },
) {
    if (signal?.aborted) return;
    root.addEventListener(
        "change",
        (event) => {
            const dateInput = event.target.closest("[data-calendar-date]");
            if (dateInput) {
                const date = new Date(dateInput.value + "T12:00:00");
                if (Number.isFinite(date.getTime())) onDateChange(date);
                return;
            }
            const select = event.target.closest("[data-calendar-view-select]");
            if (select && views.includes(select.value))
                onViewChange(select.value);
        },
        { signal },
    );
}

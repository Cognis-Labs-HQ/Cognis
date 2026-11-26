import {
    getISOWeekNumber,
    toDateTimeLocalValue,
} from "./calendar-ui-helpers.js";
/**
 * Shared view choices for the calendar workspace and shared calendars.
 * @param {string[]} views Registered Calendar views.
 * @param {string} selectedView Current view.
 * @param {object} i18n Localizer.
 * @param {Date} activeDate Focused date.
 * @returns {string} Compact and wide view controls.
 */
import { escapeHtml } from "/static/reuse/escape-html.js";
import { formatMonthYear } from "/static/reuse/timestamp.js";

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
        ${views.map((view) => `<button type="button" data-calendar-view="${view}" class="btn-neutral${selectedView === view ? " active" : ""}" aria-pressed="${selectedView === view}">${label(view)}</button>`).join("")}
    </div>`;
}

export function getCalendarPeriodLabels(view, date, i18n) {
    const current = i18n.t(
        `gateway.calendar.${view === "day" ? "today" : "this_" + view}`,
    );
    const week =
        view === "week"
            ? ` · ${i18n.t("gateway.calendar.week_number_prefix")}${getISOWeekNumber(date)}`
            : "";
    const period =
        view === "year"
            ? String(date.getFullYear())
            : formatMonthYear(date) + week;
    return { current, period };
}

export function renderCalendarNavigation(view, date, i18n) {
    const { current, period } = getCalendarPeriodLabels(view, date, i18n);
    const label = escapeHtml(current);
    return `<div class="calendar-view-nav">
        <button type="button" class="btn-neutral" data-calendar-nav="prev" aria-label="${escapeHtml(i18n.t("gateway.calendar.previous"))}">&lt;</button>
        <button type="button" class="btn-neutral" data-calendar-nav="today" aria-label="${label}" title="${label}">${label}</button>
        <button type="button" class="btn-neutral" data-calendar-nav="next" aria-label="${escapeHtml(i18n.t("gateway.calendar.next"))}">&gt;</button>
        <span class="calendar-nav-month-label">${escapeHtml(period)}</span>
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
    {
        views,
        getActiveDate,
        getSelectedView,
        getCurrentDate = () => new Date(),
        onDateChange,
        onViewChange,
        signal,
    },
) {
    if (signal?.aborted) return;
    root.addEventListener(
        "click",
        (event) => {
            const viewButton = event.target?.closest?.("[data-calendar-view]");
            if (viewButton) {
                const view = viewButton.getAttribute("data-calendar-view");
                if (!views.includes(view)) return;
                event.preventDefault();
                event.stopPropagation();
                onViewChange(view);
                return;
            }
            const navigation = event.target?.closest?.("[data-calendar-nav]");
            if (navigation) {
                const direction = navigation.getAttribute("data-calendar-nav");
                if (!["prev", "next", "today"].includes(direction)) return;
                const view = getSelectedView();
                if (!views.includes(view)) return;
                let date = new Date(getActiveDate());
                const step = direction === "next" ? 1 : -1;
                if (direction === "today") date = getCurrentDate();
                else if (view === "day" || view === "week")
                    date.setDate(
                        date.getDate() + step * (view === "week" ? 7 : 1),
                    );
                else if (view === "month")
                    date = new Date(
                        date.getFullYear(),
                        date.getMonth() + step,
                        1,
                    );
                else date = new Date(date.getFullYear() + step, 0, 1);
                if (!Number.isFinite(date.getTime())) return;
                event.preventDefault();
                event.stopPropagation();
                onDateChange(date);
                return;
            }
            for (const [attribute, view] of [
                ["data-year-month-index", "month"],
                ["data-week-row-date", "week"],
                ["data-day-dot-date", "day"],
            ]) {
                const control = event.target?.closest?.(`[${attribute}]`);
                if (!control || !views.includes(view)) continue;
                const value = control.getAttribute(attribute);
                let date;
                if (view === "month") {
                    if (!/^(?:[0-9]|1[01])$/.test(value ?? "")) return;
                    date = new Date(
                        getActiveDate().getFullYear(),
                        Number(value),
                        1,
                    );
                } else {
                    date = new Date(value ?? "");
                }
                if (!Number.isFinite(date.getTime())) return;
                event.preventDefault();
                event.stopPropagation();
                onViewChange(view, date);
                return;
            }
        },
        { signal },
    );
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

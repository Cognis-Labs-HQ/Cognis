import { apiFetch } from "/static/reuse/api-client.js";
import { formatDateTime } from "/static/reuse/timestamp.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { createFormBuilder } from "/static/reuse/form-builder.js";
import { normalizeCalendarColor } from "/static/gateways/calendar/color.js";

const HALF_HOUR_MS = 30 * 60 * 1000;
const CALENDAR_VIEWS = ["day", "week", "month", "year"];

function parseCalendarSelection() {
    const query = new URLSearchParams(window.location.search);
    return query.get("calendarId");
}

function startOfDay(value) {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
}

function startOfWeek(value) {
    const date = startOfDay(value);
    date.setDate(date.getDate() - date.getDay());
    return date;
}

function startOfMonth(value) {
    const date = startOfDay(value);
    date.setDate(1);
    return date;
}

function startOfYear(value) {
    const date = startOfDay(value);
    date.setMonth(0, 1);
    return date;
}

function addDays(value, days) {
    const date = new Date(value);
    date.setDate(date.getDate() + days);
    return date;
}

function toDateTimeLocalValue(value) {
    const date = new Date(value);
    const year = String(date.getFullYear());
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function normalizeHexColor(value) {
    return normalizeCalendarColor(value);
}

function splitHandles(value) {
    return Array.from(
        new Set(
            String(value ?? "")
                .split(/[\n,]+/)
                .map((entry) => entry.trim().replace(/^@/, "").toLowerCase())
                .filter(Boolean),
        ),
    );
}

function splitInviteEmails(value) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
    return Array.from(
        new Set(
            String(value ?? "")
                .split(/[\n,]+/)
                .map((entry) => entry.trim().toLowerCase())
                .filter((entry) => emailPattern.test(entry)),
        ),
    );
}

function collectUpcomingEvents(
    eventsByCalendar,
    calendars,
    selectedCalendarId,
) {
    const calendarById = new Map(
        calendars.map((calendar) => [calendar.id, calendar]),
    );
    return Object.entries(eventsByCalendar)
        .flatMap(([calendarId, events]) =>
            events.map((event) => ({
                ...event,
                calendarId,
                calendarColor: normalizeHexColor(
                    calendarById.get(calendarId)?.color,
                ),
            })),
        )
        .sort((left, right) => left.startAt.localeCompare(right.startAt))
        .filter((event) => new Date(event.endAt).getTime() >= Date.now())
        .filter(
            (event) =>
                !selectedCalendarId || event.calendarId === selectedCalendarId,
        );
}

async function fetchCalendarState() {
    const response = await apiFetch("/api/v1/calendar/calendars");
    if (!response.ok) throw new Error("calendar_load_failed");
    const payload = await response.json();
    return {
        calendars: Array.isArray(payload?.data) ? payload.data : [],
        meta:
            payload && typeof payload.meta === "object" && payload.meta
                ? payload.meta
                : {},
    };
}

async function fetchEvents(calendarId) {
    const response = await apiFetch(
        `/api/v1/calendar/calendars/${encodeURIComponent(calendarId)}/events`,
    );
    if (!response.ok) throw new Error("calendar_events_failed");
    const payload = await response.json();
    return Array.isArray(payload?.data?.events) ? payload.data.events : [];
}

async function probeJitsiAvailability() {
    const response = await apiFetch("/api/v1/modules/jitsi-meet/ping");
    if (!response.ok) return false;
    const payload = await response.json();
    return (
        Boolean(payload?.data?.ready) && Boolean(payload?.data?.configComplete)
    );
}

async function createJitsiMeeting(attendees) {
    const response = await apiFetch(
        "/api/v1/modules/jitsi-meet/meetings/create",
        {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({ participants: attendees }),
        },
    );
    if (!response.ok) throw new Error("meeting_create_failed");
    const payload = await response.json();
    return payload?.data?.meetingUrl ? String(payload.data.meetingUrl) : null;
}

function renderCalendarToolbarList(calendars, selectedCalendarId, i18n) {
    if (!calendars.length) {
        return `<p class="calendar-empty">${i18n.t("gateway.calendar.no_calendars")}</p>`;
    }
    return `<ul class="calendar-calendars-list">${calendars
        .map(
            (calendar) => `<li>
        <button type="button" class="calendar-select-link" data-calendar-select="${escapeHtml(calendar.id)}" ${selectedCalendarId === calendar.id ? 'aria-current="page"' : ""}>
          <span class="calendar-select-dot" aria-hidden="true" style="background:${escapeHtml(normalizeHexColor(calendar.color))}; border-color:${escapeHtml(normalizeHexColor(calendar.color))}"></span>
          <span class="calendar-select-label">${escapeHtml(calendar.name)}</span>
        </button>
        <div class="calendar-visibility">${i18n.t(calendar.visibility === "public" ? "gateway.calendar.visibility_public" : "gateway.calendar.visibility_private")}</div>
      </li>`,
        )
        .join("")}</ul>`;
}

function renderToolbarSummary(summary, i18n) {
    if (!summary.length) {
        return `<p class="calendar-empty">${i18n.t("gateway.calendar.no_events")}</p>`;
    }
    return `<ul class="calendar-events-list calendar-events-list--compact">${summary
        .slice(0, 5)
        .map(
            (
                event,
            ) => `<li class="calendar-upcoming-item" style="--calendar-event-stripe:${escapeHtml(normalizeHexColor(event.calendarColor))}">
        <strong>${escapeHtml(event.title)}</strong>
        <div>${formatDateTime(event.startAt)}</div>
      </li>`,
        )
        .join("")}</ul>`;
}

function renderUpcomingEvents(events, i18n) {
    if (!events.length) {
        return `<p class="calendar-empty">${i18n.t("gateway.calendar.no_events")}</p>`;
    }
    return `<ul class="calendar-events-list">${events
        .map(
            (
                event,
            ) => `<li class="calendar-upcoming-item" style="--calendar-event-stripe:${escapeHtml(normalizeHexColor(event.calendarColor))}">
        <strong>${escapeHtml(event.title)}</strong>
        <div>${formatDateTime(event.startAt)} - ${formatDateTime(event.endAt)}</div>
        ${event.description ? `<div>${escapeHtml(event.description)}</div>` : ""}
        ${event.meetingUrl ? `<div><a href="${escapeHtml(event.meetingUrl)}" target="_blank" rel="noreferrer noopener">${i18n.t("gateway.calendar.event_meeting_link")}</a></div>` : ""}
      </li>`,
        )
        .join("")}</ul>`;
}

function listEventsInWindow(events, startDate, endDate) {
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();
    return events.filter((event) => {
        const eventStart = new Date(event.startAt).getTime();
        const eventEnd = new Date(event.endAt).getTime();
        return eventStart < endTime && eventEnd > startTime;
    });
}

function renderDaySlots(events, day, i18n) {
    const slots = [];
    for (let slotIndex = 0; slotIndex < 48; slotIndex += 1) {
        const start = new Date(day.getTime() + slotIndex * HALF_HOUR_MS);
        const end = new Date(start.getTime() + HALF_HOUR_MS);
        const hasEvent = events.some((event) => {
            const eventStart = new Date(event.startAt).getTime();
            const eventEnd = new Date(event.endAt).getTime();
            return eventStart < end.getTime() && eventEnd > start.getTime();
        });
        slots.push(`<button type="button" class="calendar-slot-btn" data-slot-start="${start.toISOString()}" data-slot-end="${end.toISOString()}">
      <span>${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
      ${hasEvent ? `<span class="calendar-slot-indicator">${i18n.t("gateway.calendar.slot_busy")}</span>` : ""}
    </button>`);
    }
    return `<div class="calendar-slot-grid">${slots.join("")}</div>`;
}

function renderWeekSlots(events, weekStart, i18n) {
    const days = Array.from({ length: 7 }, (_, offset) =>
        addDays(weekStart, offset),
    );
    return `<div class="calendar-week-grid">${days
        .map((day) => {
            const dayStart = startOfDay(day);
            const dayEnd = addDays(dayStart, 1);
            const dayEvents = listEventsInWindow(events, dayStart, dayEnd);
            return `<section class="calendar-week-day">
        <h4>${day.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</h4>
        ${renderDaySlots(dayEvents, dayStart, i18n)}
      </section>`;
        })
        .join("")}</div>`;
}

function renderMonthGrid(events, currentDate, i18n) {
    const monthStart = startOfMonth(currentDate);
    const gridStart = startOfWeek(monthStart);
    const rows = [];
    for (let weekIndex = 0; weekIndex < 6; weekIndex += 1) {
        const weekStart = addDays(gridStart, weekIndex * 7);
        const weekEnd = addDays(weekStart, 7);
        rows.push(`<div class="calendar-month-row">
      <button type="button" class="calendar-week-jump" data-week-row-date="${weekStart.toISOString()}">${i18n.t("gateway.calendar.open_week_view")}</button>
      ${Array.from({ length: 7 }, (_, dayIndex) => {
          const day = addDays(weekStart, dayIndex);
          const dayStart = startOfDay(day);
          const dayEnd = addDays(dayStart, 1);
          const dayEvents = listEventsInWindow(events, dayStart, dayEnd);
          return `<article class="calendar-month-day${day.getMonth() === monthStart.getMonth() ? "" : " calendar-month-day--outside"}">
          <header>
            <span>${day.getDate()}</span>
            <button type="button" class="calendar-day-jump" data-day-dot-date="${dayStart.toISOString()}">•</button>
          </header>
          <button type="button" class="calendar-all-day-create" data-month-create-date="${dayStart.toISOString()}">${i18n.t("gateway.calendar.create_all_day")}</button>
          <div class="calendar-month-event-count">${dayEvents.length > 0 ? `${dayEvents.length} ${escapeHtml(i18n.t("gateway.calendar.events_count_suffix"))}` : ""}</div>
        </article>`;
      }).join("")}
    </div>`);
        if (weekEnd.getMonth() > monthStart.getMonth() && weekEnd.getDate() > 7)
            break;
    }
    return `<div class="calendar-month-grid">${rows.join("")}</div>`;
}

function renderYearGrid(currentDate) {
    const yearStart = startOfYear(currentDate);
    return `<div class="calendar-year-grid">${Array.from(
        { length: 12 },
        (_, monthIndex) => {
            const monthDate = new Date(yearStart);
            monthDate.setMonth(monthIndex);
            return `<button type="button" class="calendar-year-month" data-year-month-index="${monthIndex}">${monthDate.toLocaleDateString(undefined, { month: "long" })}</button>`;
        },
    ).join("")}</div>`;
}

function renderCalendarView(events, selectedView, activeDate, i18n) {
    if (selectedView === "day") {
        const dayStart = startOfDay(activeDate);
        const dayEnd = addDays(dayStart, 1);
        return renderDaySlots(
            listEventsInWindow(events, dayStart, dayEnd),
            dayStart,
            i18n,
        );
    }
    if (selectedView === "week") {
        const weekStart = startOfWeek(activeDate);
        const weekEnd = addDays(weekStart, 7);
        return renderWeekSlots(
            listEventsInWindow(events, weekStart, weekEnd),
            weekStart,
            i18n,
        );
    }
    if (selectedView === "year") {
        return renderYearGrid(activeDate);
    }
    return renderMonthGrid(events, activeDate, i18n);
}

/**
 * Builds the reusable event composer form configuration for inline and popup flows.
 *
 * @param {{
 *   i18n: { t: (key: string) => string },
 *   defaultValues?: Record<string, string>,
 *   canInviteExternal: boolean,
 *   submitLabelKey: string,
 * }} input
 * @returns {{
 *   render: () => string,
 *   attach: (formElement: HTMLFormElement, attachOptions?: { signal?: AbortSignal }) => {
 *     validateField: (fieldName: string, forceTouched?: boolean) => boolean,
 *     validateAll: (forceTouched?: boolean) => boolean,
 *     getValues: () => Record<string, string>,
 *     detach: () => void,
 *   },
 * }}
 */
function createEventComposerBuilder({
    i18n,
    defaultValues = {},
    canInviteExternal,
    submitLabelKey,
}) {
    const fields = [
        {
            name: "title",
            labelKey: "gateway.calendar.event_title",
            required: true,
            value: String(defaultValues.title ?? ""),
            criteria: [
                {
                    id: "event-title-max",
                    type: "maxLength",
                    value: 120,
                    messageKey: "gateway.calendar.event_title_max",
                },
            ],
        },
        {
            name: "description",
            labelKey: "gateway.calendar.event_description",
            type: "textarea",
            value: String(defaultValues.description ?? ""),
        },
        {
            name: "startAt",
            labelKey: "gateway.calendar.event_start",
            type: "datetime-local",
            required: true,
            value: String(defaultValues.startAt ?? ""),
        },
        {
            name: "endAt",
            labelKey: "gateway.calendar.event_end",
            type: "datetime-local",
            required: true,
            value: String(defaultValues.endAt ?? ""),
            criteria: [
                {
                    id: "event-range",
                    type: "custom",
                    mode: "submit",
                    test: (value, fieldValues) =>
                        new Date(value).getTime() >
                        new Date(fieldValues.startAt ?? "").getTime(),
                    messageKey: "gateway.calendar.event_end_after_start",
                },
            ],
        },
        {
            name: "attendees",
            labelKey: "gateway.calendar.attendees_label",
            type: "textarea",
            value: String(defaultValues.attendees ?? ""),
            attributes: {
                placeholder: i18n.t("gateway.calendar.attendees_placeholder"),
            },
        },
    ];

    if (canInviteExternal) {
        fields.push({
            name: "inviteEmails",
            labelKey: "gateway.calendar.invite_emails",
            type: "textarea",
            value: String(defaultValues.inviteEmails ?? ""),
            attributes: {
                placeholder: i18n.t(
                    "gateway.calendar.invite_emails_placeholder",
                ),
            },
        });
    }

    return createFormBuilder(
        {
            i18n,
            escapeHtml,
        },
        {
            formId: "calendar-event-form",
            submitLabelKey,
            fields,
            submitButtonClassName: "btn-confirm",
            formClassName: "calendar-event-form-builder",
        },
    );
}

function renderFloatingCreatorPanel(floatingCreator, i18n) {
    if (!floatingCreator) return "";
    return `<div class="calendar-floating-create">
      <h4>${i18n.t("gateway.calendar.quick_create")}</h4>
      <label><span>${i18n.t("gateway.calendar.event_title")}</span><input id="calendar-floating-title" type="text" required /></label>
      <label><span>${i18n.t("gateway.calendar.event_start")}</span><input id="calendar-floating-start" type="datetime-local" value="${escapeHtml(toDateTimeLocalValue(floatingCreator.startAt))}" required /></label>
      <label><span>${i18n.t("gateway.calendar.event_end")}</span><input id="calendar-floating-end" type="datetime-local" value="${escapeHtml(toDateTimeLocalValue(floatingCreator.endAt))}" required /></label>
      <div class="calendar-floating-actions">
        <button type="button" class="btn-confirm" data-floating-create="submit">${i18n.t("gateway.calendar.create_event")}</button>
        <button type="button" data-floating-create="details">${i18n.t("gateway.calendar.more_details")}</button>
        <button type="button" data-floating-create="close">${i18n.t("ui.reuse.cancel")}</button>
      </div>
    </div>`;
}

export {
    CALENDAR_VIEWS,
    parseCalendarSelection,
    addDays,
    toDateTimeLocalValue,
    normalizeHexColor,
    splitHandles,
    splitInviteEmails,
    collectUpcomingEvents,
    fetchCalendarState,
    fetchEvents,
    probeJitsiAvailability,
    createJitsiMeeting,
    renderCalendarToolbarList,
    renderToolbarSummary,
    renderUpcomingEvents,
    renderCalendarView,
    renderFloatingCreatorPanel,
    createEventComposerBuilder,
};

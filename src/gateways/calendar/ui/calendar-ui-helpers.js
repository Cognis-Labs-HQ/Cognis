import { apiFetch } from "/static/reuse/api-client.js";
import { formatDateTime } from "/static/reuse/timestamp.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { createFormBuilder } from "/static/reuse/form-builder.js";
import { normalizeCalendarColor } from "/static/gateways/calendar/color.js";

const HALF_HOUR_MS = 30 * 60 * 1000;
const CALENDAR_VIEWS = ["day", "week", "month", "year"];
const EVENT_RESPONSE_OPTIONS = ["accepted", "tentative", "declined"];
const EVENT_STATUS_OPTIONS = ["busy", "free"];
const EVENT_RECURRENCE_OPTIONS = [
    "none",
    "daily",
    "weekly",
    "monthly",
    "yearly",
];
const ISO_WEEK_THURSDAY_OFFSET = 4;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[a-zA-Z0-9]{2,}$/;

function parseCalendarSelection() {
    const query = new URLSearchParams(window.location.search);
    return query.get("calendarId");
}

function parseEventSelection() {
    const query = new URLSearchParams(window.location.search);
    return query.get("eventId");
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
    return Array.from(
        new Set(
            String(value ?? "")
                .split(/[\n,]+/)
                .map((entry) => entry.trim().toLowerCase())
                .filter((entry) => EMAIL_PATTERN.test(entry)),
        ),
    );
}

function matchesEmailPattern(value) {
    return EMAIL_PATTERN.test(String(value ?? "").trim());
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
                calendarName: String(calendarById.get(calendarId)?.name ?? ""),
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

async function fetchEvent(calendarId, eventId) {
    const response = await apiFetch(
        `/api/v1/calendar/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    );
    if (!response.ok) throw new Error("calendar_event_failed");
    const payload = await response.json();
    return payload?.data ?? null;
}

async function updateEvent(calendarId, eventId, payload) {
    return apiFetch(
        `/api/v1/calendar/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
        {
            method: "PATCH",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify(payload),
        },
    );
}

async function deleteEvent(calendarId, eventId, { deleteAll = false } = {}) {
    const query = deleteAll ? "?series=1" : "";
    return apiFetch(
        `/api/v1/calendar/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}${query}`,
        {
            method: "DELETE",
        },
    );
}

async function respondToEvent(calendarId, eventId, response) {
    return apiFetch(
        `/api/v1/calendar/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}/respond`,
        {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({ response }),
        },
    );
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

function visibilityIcon(visibility) {
    return visibility === "public" ? "🌐" : "🔒";
}

function getStatusLabelKey(status) {
    return status === "free"
        ? "gateway.calendar.status_free"
        : "gateway.calendar.status_busy";
}

function getRecurrenceLabelKey(recurrence) {
    return `gateway.calendar.recurrence_${EVENT_RECURRENCE_OPTIONS.includes(recurrence) ? recurrence : "none"}`;
}

function getResponseLabelKey(response) {
    return `gateway.calendar.response_${EVENT_RESPONSE_OPTIONS.includes(response) ? response : "pending"}`;
}

function renderCalendarToolbarList(calendars, selectedCalendarId, i18n) {
    if (!calendars.length) {
        return `<p class="calendar-empty">${i18n.t("gateway.calendar.no_calendars")}</p>`;
    }
    return `<ul class="calendar-calendars-list">${calendars
        .map(
            (calendar) => `<li>
        <button type="button" class="calendar-select-link" data-calendar-select="${escapeHtml(calendar.id)}" ${selectedCalendarId === calendar.id ? 'aria-current="page"' : ""} title="${escapeHtml(i18n.t(calendar.visibility === "public" ? "gateway.calendar.visibility_public" : "gateway.calendar.visibility_private"))}">
          <span class="calendar-select-dot" aria-hidden="true" style="background:${escapeHtml(normalizeHexColor(calendar.color))}; border-color:${escapeHtml(normalizeHexColor(calendar.color))}"></span>
          <span class="calendar-select-label">${escapeHtml(calendar.name)}</span>
          <span class="calendar-visibility-icon" aria-hidden="true">${visibilityIcon(calendar.visibility)}</span>
        </button>
      </li>`,
        )
        .join("")}</ul>`;
}

function renderEventBadges(event, i18n) {
    const badges = [
        `<span class="calendar-event-badge calendar-event-badge--status">${escapeHtml(i18n.t(getStatusLabelKey(event.status)))}</span>`,
    ];
    if (event.recurrence && event.recurrence !== "none") {
        badges.push(
            `<span class="calendar-event-badge calendar-event-badge--recurrence">${escapeHtml(i18n.t(getRecurrenceLabelKey(event.recurrence)))}</span>`,
        );
    }
    return badges.join("");
}

function renderResponseSummary(event, i18n) {
    const responseEntries = Object.entries(event.responses ?? {});
    if (!responseEntries.length) return "";
    return `<ul class="calendar-response-list">${responseEntries
        .map(
            ([accountId, response]) => `<li>
        <span>${escapeHtml(accountId)}</span>
        <strong>${escapeHtml(i18n.t(getResponseLabelKey(response)))}</strong>
      </li>`,
        )
        .join("")}</ul>`;
}

function renderEventButton(event, locale, i18n) {
    return `<button type="button" class="calendar-slot-event${event.status === "free" ? " calendar-slot-event--free" : ""}" data-calendar-event="${escapeHtml(event.id)}" data-calendar-id="${escapeHtml(event.calendarId)}" style="--calendar-event-stripe:${escapeHtml(event.calendarColor ?? "#1f8ceb")}">
      <span class="calendar-slot-event-time">${escapeHtml(
          formatEventTimeRange(event.startAt, event.endAt, locale),
      )}</span>
      <strong class="calendar-slot-event-title">${escapeHtml(event.title)}</strong>
      ${event.recurrence && event.recurrence !== "none" ? `<span class="calendar-slot-event-mark">${escapeHtml(i18n.t("gateway.calendar.recurring_short"))}</span>` : ""}
      ${event.status === "free" ? `<span class="calendar-slot-event-mark">${escapeHtml(i18n.t("gateway.calendar.free_short"))}</span>` : ""}
    </button>`;
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
        <button type="button" class="calendar-upcoming-button" data-calendar-event="${escapeHtml(event.id)}" data-calendar-id="${escapeHtml(event.calendarId)}">
          <strong>${escapeHtml(event.title)}</strong>
          <div>${formatDateTime(event.startAt)}</div>
        </button>
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
        <button type="button" class="calendar-upcoming-button" data-calendar-event="${escapeHtml(event.id)}" data-calendar-id="${escapeHtml(event.calendarId)}">
          <strong>${escapeHtml(event.title)}</strong>
          <div>${formatDateTime(event.startAt)} - ${formatDateTime(event.endAt)}</div>
          <div>${renderEventBadges(event, i18n)}</div>
          ${event.calendarName ? `<div>${escapeHtml(event.calendarName)}</div>` : ""}
        </button>
        ${event.description ? `<div>${escapeHtml(event.description)}</div>` : ""}
        ${event.meetingUrl ? `<div><a href="${escapeHtml(event.meetingUrl)}" target="_blank" rel="noreferrer noopener">${i18n.t("gateway.calendar.event_meeting_link")}</a></div>` : ""}
      </li>`,
        )
        .join("")}</ul>`;
}

function formatEventTimeRange(startAt, endAt, locale) {
    const formatOptions = {
        hour: "numeric",
        minute: "2-digit",
    };
    const startText = new Date(startAt).toLocaleTimeString(
        locale ?? undefined,
        formatOptions,
    );
    const endText = new Date(endAt).toLocaleTimeString(
        locale ?? undefined,
        formatOptions,
    );
    return `${startText} - ${endText}`;
}

function renderSlotEvents(slotEvents, locale, i18n) {
    return slotEvents
        .map((event) => renderEventButton(event, locale, i18n))
        .join("");
}

function renderSlotCreateButton(start, end, i18n) {
    return `<button type="button" class="calendar-timeslot-hover-add" data-timeslot-add data-slot-start="${start.toISOString()}" data-slot-end="${end.toISOString()}" aria-label="${escapeHtml(i18n.t("gateway.calendar.add_event"))}">+</button>`;
}

function getISOWeekNumber(date) {
    const thursday = new Date(date);
    thursday.setDate(
        date.getDate() -
            ((date.getDay() + 6) % 7) +
            ISO_WEEK_THURSDAY_OFFSET -
            1,
    );
    const yearStart = new Date(thursday.getFullYear(), 0, 1);
    return Math.ceil(((thursday - yearStart) / 86400000 + 1) / 7);
}

function shouldStopRenderingWeeks(weekEnd, monthStart) {
    return weekEnd.getMonth() > monthStart.getMonth() && weekEnd.getDate() > 7;
}

function renderDayView(events, day, i18n) {
    const dayLabel = day.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
    });
    const slots = [];
    for (let slotIndex = 0; slotIndex < 48; slotIndex += 1) {
        const start = new Date(day.getTime() + slotIndex * HALF_HOUR_MS);
        const end = new Date(start.getTime() + HALF_HOUR_MS);
        const slotEvents = listEventsInWindow(events, start, end);
        const timeLabel = start.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        });
        const eventCells = slotEvents.length
            ? renderSlotEvents(slotEvents, i18n?.locale, i18n)
            : "";
        slots.push(`<div class="calendar-timeslot-row">
      <span class="calendar-timeslot-label">${escapeHtml(timeLabel)}</span>
      <div class="calendar-timeslot-events" data-timeslot-events data-slot-start="${start.toISOString()}" data-slot-end="${end.toISOString()}">${eventCells}${renderSlotCreateButton(start, end, i18n)}</div>
    </div>`);
    }
    return `<div class="calendar-day-view">
  <h4 class="calendar-day-heading">${escapeHtml(dayLabel)}</h4>
  <div class="calendar-timeslot-grid">${slots.join("")}</div>
</div>`;
}

function renderWeekView(events, weekStart, i18n) {
    const days = Array.from({ length: 7 }, (_, offset) =>
        addDays(weekStart, offset),
    );
    const dayHeaders = days
        .map((day) => {
            const dayStart = startOfDay(day);
            return `<button type="button" class="calendar-week-day-header" data-day-dot-date="${dayStart.toISOString()}">
        <span class="calendar-week-day-name">${day.toLocaleDateString(undefined, { weekday: "short" })}</span>
        <span class="calendar-week-day-date">${day.toLocaleDateString(undefined, { month: "numeric", day: "numeric" })}</span>
      </button>`;
        })
        .join("");
    const allDayCells = days
        .map((day) => {
            const dayStart = startOfDay(day);
            const dayEnd = addDays(dayStart, 1);
            const dayEvents = listEventsInWindow(events, dayStart, dayEnd);
            return `<div class="calendar-week-all-day-cell calendar-timeslot-events" data-timeslot-events data-slot-start="${dayStart.toISOString()}" data-slot-end="${dayEnd.toISOString()}">${dayEvents.length ? renderSlotEvents(dayEvents.slice(0, 2), i18n?.locale, i18n) : ""}${renderSlotCreateButton(dayStart, dayEnd, i18n)}</div>`;
        })
        .join("");
    const slotRows = [];
    for (let slotIndex = 0; slotIndex < 48; slotIndex += 1) {
        const slotCells = days
            .map((day) => {
                const dayStart = startOfDay(day);
                const start = new Date(
                    dayStart.getTime() + slotIndex * HALF_HOUR_MS,
                );
                const end = new Date(start.getTime() + HALF_HOUR_MS);
                const slotEvents = listEventsInWindow(events, start, end);
                const eventCells = slotEvents.length
                    ? renderSlotEvents(slotEvents, i18n?.locale, i18n)
                    : "";
                return `<div class="calendar-week-slot calendar-timeslot-events" data-timeslot-events data-slot-start="${start.toISOString()}" data-slot-end="${end.toISOString()}">${eventCells}${renderSlotCreateButton(start, end, i18n)}</div>`;
            })
            .join("");
        const timeLabel = new Date(
            startOfDay(weekStart).getTime() + slotIndex * HALF_HOUR_MS,
        ).toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
        });
        slotRows.push(`<div class="calendar-week-timeslot-row">
      <span class="calendar-week-timeslot-label">${escapeHtml(timeLabel)}</span>
      ${slotCells}
    </div>`);
    }
    return `<div class="calendar-week-view">
  <div class="calendar-week-grid calendar-week-grid--header">
    <span class="calendar-week-axis-label">&nbsp;</span>
    ${dayHeaders}
  </div>
  <div class="calendar-week-all-day-row">
    <span class="calendar-week-axis-label">${escapeHtml(i18n.t("gateway.calendar.all_day"))}</span>
    ${allDayCells}
  </div>
  <div class="calendar-week-scroll-grid">
    ${slotRows.join("")}
  </div>
</div>`;
}

function renderMonthGrid(events, currentDate, i18n) {
    const monthStart = startOfMonth(currentDate);
    const gridStart = startOfWeek(monthStart);
    const rows = [];
    for (let weekIndex = 0; weekIndex < 6; weekIndex += 1) {
        const weekStart = addDays(gridStart, weekIndex * 7);
        const weekEnd = addDays(weekStart, 7);
        const weekNumber = getISOWeekNumber(weekStart);
        rows.push(`<div class="calendar-month-row">
      <button type="button" class="calendar-week-jump" data-week-row-date="${weekStart.toISOString()}" title="${escapeHtml(i18n.t("gateway.calendar.open_week_view"))}">${i18n.t("gateway.calendar.week_number_prefix")}${weekNumber}</button>
      ${Array.from({ length: 7 }, (_, dayIndex) => {
          const day = addDays(weekStart, dayIndex);
          const dayStart = startOfDay(day);
          const dayEnd = addDays(dayStart, 1);
          const dayEvents = listEventsInWindow(events, dayStart, dayEnd);
          const previewMarkup = dayEvents
              .slice(0, 3)
              .map((event) => renderEventButton(event, i18n?.locale, i18n))
              .join("");
          return `<article class="calendar-month-day${day.getMonth() === monthStart.getMonth() ? "" : " calendar-month-day--outside"}">
          <header>
            <button type="button" class="calendar-day-jump" data-day-dot-date="${dayStart.toISOString()}">${day.getDate()}</button>
            <button type="button" class="calendar-all-day-create" data-month-create-date="${dayStart.toISOString()}">+</button>
          </header>
          <div class="calendar-month-event-count">${dayEvents.length > 0 ? `${dayEvents.length} ${escapeHtml(i18n.t("gateway.calendar.events_count_suffix"))}` : ""}</div>
          <div class="calendar-month-event-preview">${previewMarkup}</div>
        </article>`;
      }).join("")}
    </div>`);
        if (shouldStopRenderingWeeks(weekEnd, monthStart)) break;
    }
    return `<div class="calendar-month-grid">${rows.join("")}</div>`;
}

function renderYearMonthMiniGrid(monthDate, events, i18n) {
    const monthStart = startOfMonth(monthDate);
    const gridStart = startOfWeek(monthStart);
    const weekdayInitials = Array.from({ length: 7 }, (_, dayOffset) =>
        addDays(gridStart, dayOffset).toLocaleDateString(undefined, {
            weekday: "narrow",
        }),
    );
    const rows = [];
    for (let weekIndex = 0; weekIndex < 6; weekIndex += 1) {
        const weekStart = addDays(gridStart, weekIndex * 7);
        const weekEnd = addDays(weekStart, 7);
        const weekNumber = getISOWeekNumber(weekStart);
        rows.push(`<div class="calendar-year-month-mini-row">
      <span class="calendar-year-mini-week">${weekNumber}</span>
      ${Array.from({ length: 7 }, (_, dayIndex) => {
          const day = addDays(weekStart, dayIndex);
          const isOutsideMonth = day.getMonth() !== monthStart.getMonth();
          const dayLabel = day.toLocaleDateString(undefined, {
              dateStyle: "long",
          });
          const dayStart = startOfDay(day);
          const dayEnd = addDays(dayStart, 1);
          const dayEvents = listEventsInWindow(events, dayStart, dayEnd);
          return `<button type="button" class="calendar-year-day-dot${isOutsideMonth ? " calendar-year-day-dot--outside" : ""}${dayEvents.length > 0 ? " calendar-year-day-dot--active" : ""}" data-day-dot-date="${dayStart.toISOString()}" style="--calendar-density:${Math.min(dayEvents.length, 4)}" aria-label="${escapeHtml(dayLabel)}">${day.getDate()}</button>`;
      }).join("")}
    </div>`);
        if (shouldStopRenderingWeeks(weekEnd, monthStart)) break;
    }
    const monthLabel = monthStart.toLocaleDateString(undefined, {
        month: "long",
    });
    const openMonthLabel = `${i18n.t("gateway.calendar.open_month_view")} ${monthLabel}`;
    return `<article class="calendar-year-month">
    <button type="button" class="calendar-year-month-title" data-year-month-index="${monthStart.getMonth()}" aria-label="${escapeHtml(openMonthLabel)}">${escapeHtml(monthLabel)}</button>
    <div class="calendar-year-mini-grid">
      <div class="calendar-year-mini-header">
        <span class="calendar-year-mini-week-header">${escapeHtml(i18n.t("gateway.calendar.week_short"))}</span>
        ${weekdayInitials.map((label) => `<span class="calendar-year-mini-day-initial">${escapeHtml(label)}</span>`).join("")}
      </div>
      ${rows.join("")}
    </div>
  </article>`;
}

function renderYearGrid(events, currentDate, i18n) {
    const yearStart = startOfYear(currentDate);
    return `<div class="calendar-year-grid">${Array.from(
        { length: 12 },
        (_, monthIndex) => {
            const monthDate = new Date(yearStart);
            monthDate.setMonth(monthIndex);
            return renderYearMonthMiniGrid(monthDate, events, i18n);
        },
    ).join("")}</div>`;
}

function renderCalendarView(events, selectedView, activeDate, i18n) {
    if (selectedView === "day") {
        const dayStart = startOfDay(activeDate);
        const dayEnd = addDays(dayStart, 1);
        return renderDayView(
            listEventsInWindow(events, dayStart, dayEnd),
            dayStart,
            i18n,
        );
    }
    if (selectedView === "week") {
        const weekStart = startOfWeek(activeDate);
        const weekEnd = addDays(weekStart, 7);
        return renderWeekView(
            listEventsInWindow(events, weekStart, weekEnd),
            weekStart,
            i18n,
        );
    }
    if (selectedView === "year") {
        return renderYearGrid(events, activeDate, i18n);
    }
    return renderMonthGrid(events, activeDate, i18n);
}

function createEventComposerBuilder({
    i18n,
    defaultValues = {},
    calendars = [],
    selectedCalendarId = "",
    readOnly = false,
}) {
    const calendarOptions = Array.isArray(calendars)
        ? calendars.map((calendar) => ({
              value: String(calendar?.id ?? ""),
              label: String(calendar?.name ?? ""),
          }))
        : [];
    const fields = [
        {
            name: "title",
            labelKey: "gateway.calendar.event_title",
            required: true,
            value: String(defaultValues.title ?? ""),
            disabled: readOnly,
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
            disabled: readOnly,
        },
        {
            name: "startAt",
            labelKey: "gateway.calendar.event_start",
            type: "datetime-local",
            required: true,
            value: String(defaultValues.startAt ?? ""),
            disabled: readOnly,
        },
        {
            name: "endAt",
            labelKey: "gateway.calendar.event_end",
            type: "datetime-local",
            required: true,
            value: String(defaultValues.endAt ?? ""),
            disabled: readOnly,
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
            name: "status",
            labelKey: "gateway.calendar.event_status",
            type: "select",
            value: String(defaultValues.status ?? "busy"),
            disabled: readOnly,
            options: EVENT_STATUS_OPTIONS.map((status) => ({
                value: status,
                label: i18n.t(getStatusLabelKey(status)),
            })),
        },
        {
            name: "recurrence",
            labelKey: "gateway.calendar.event_recurrence",
            type: "select",
            value: String(defaultValues.recurrence ?? "none"),
            disabled: readOnly,
            options: EVENT_RECURRENCE_OPTIONS.map((recurrence) => ({
                value: recurrence,
                label: i18n.t(getRecurrenceLabelKey(recurrence)),
            })),
        },
        {
            name: "calendarId",
            labelKey: "gateway.calendar.event_calendar",
            type: "select",
            required: true,
            value: String(defaultValues.calendarId ?? selectedCalendarId ?? ""),
            options:
                calendarOptions.length > 0
                    ? calendarOptions
                    : [
                          {
                              value: "",
                              label: i18n.t("gateway.calendar.no_calendars"),
                              disabled: true,
                          },
                      ],
            disabled: readOnly || calendarOptions.length === 0,
        },
    ];

    return createFormBuilder(
        {
            i18n,
            escapeHtml,
        },
        {
            formId: "calendar-event-form",
            fields,
            submitButtonClassName: "btn-confirm",
            formClassName: "calendar-event-form-builder",
            includeSubmitButton: false,
        },
    );
}

export {
    CALENDAR_VIEWS,
    EVENT_RECURRENCE_OPTIONS,
    EVENT_RESPONSE_OPTIONS,
    EVENT_STATUS_OPTIONS,
    parseCalendarSelection,
    parseEventSelection,
    addDays,
    toDateTimeLocalValue,
    normalizeHexColor,
    splitHandles,
    splitInviteEmails,
    matchesEmailPattern,
    listEventsInWindow,
    collectUpcomingEvents,
    fetchCalendarState,
    fetchEvents,
    fetchEvent,
    updateEvent,
    deleteEvent,
    respondToEvent,
    probeJitsiAvailability,
    createJitsiMeeting,
    getStatusLabelKey,
    getRecurrenceLabelKey,
    getResponseLabelKey,
    renderEventBadges,
    renderResponseSummary,
    renderCalendarToolbarList,
    renderToolbarSummary,
    renderUpcomingEvents,
    renderCalendarView,
    createEventComposerBuilder,
};

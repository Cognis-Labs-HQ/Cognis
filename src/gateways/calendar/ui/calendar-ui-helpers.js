import { apiFetch } from "/static/reuse/api-client.js";
import {
    formatDateTime,
    getEffectiveTimezone,
} from "/static/reuse/timestamp.js";
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

async function respondToEvent(
    calendarId,
    eventId,
    response,
    { respondAll = false } = {},
) {
    const query = respondAll ? "?series=1" : "";
    return apiFetch(
        `/api/v1/calendar/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}/respond${query}`,
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

function getResponseActionLabelKey(response) {
    return `gateway.calendar.response_action_${EVENT_RESPONSE_OPTIONS.includes(response) ? response : "pending"}`;
}

function renderCalendarToolbarList(calendars, selectedCalendarId, i18n) {
    if (!calendars.length) {
        return `<p class="calendar-empty">${i18n.t("gateway.calendar.no_calendars")}</p>`;
    }
    return `<ul class="calendar-calendars-list">${calendars
        .map(
            (calendar) => `<li>
        <button type="button" class="calendar-item-btn" data-calendar-edit="${escapeHtml(calendar.id)}" ${selectedCalendarId === calendar.id ? 'data-current="true"' : ""} title="${escapeHtml(i18n.t("gateway.calendar.edit_calendar"))}">
          <span class="calendar-select-dot" aria-hidden="true" style="background:${escapeHtml(normalizeHexColor(calendar.color))}; border-color:${escapeHtml(normalizeHexColor(calendar.color))}"></span>
          <span class="calendar-item-label">${escapeHtml(calendar.name)}</span>
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

function renderResponseSummary(event, i18n, participantDirectory = null) {
    const responseEntries = Object.entries(event.responses ?? {});
    if (!responseEntries.length) return "";
    const resolveParticipantLabel = (participantId) => {
        if (!participantDirectory) return participantId;
        const profile = participantDirectory.get(participantId);
        if (!profile) return participantId;
        return profile.displayName || profile.username || participantId;
    };
    return `<ul class="calendar-response-list">${responseEntries
        .map(
            ([accountId, response]) => `<li>
        <span>${escapeHtml(resolveParticipantLabel(accountId))}</span>
        <strong>${escapeHtml(i18n.t(getResponseLabelKey(response)))}</strong>
      </li>`,
        )
        .join("")}</ul>`;
}

function renderEventButton(event) {
    return `<button type="button" class="calendar-slot-event${event.status === "free" ? " calendar-slot-event--free" : ""}" data-calendar-event="${escapeHtml(event.id)}" data-calendar-id="${escapeHtml(event.calendarId)}" style="--calendar-event-stripe:${escapeHtml(event.calendarColor ?? "#1f8ceb")}" title="${escapeHtml(event.title)}">
      <strong class="calendar-slot-event-title">${escapeHtml(event.title)}</strong>
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

function renderSlotEvents(slotEvents) {
    return slotEvents.map((event) => renderEventButton(event)).join("");
}

function renderSlotCreateButton(start, end, i18n) {
    return `<button type="button" class="calendar-timeslot-hover-add btn-no-animation" data-timeslot-add data-slot-start="${start.toISOString()}" data-slot-end="${end.toISOString()}" aria-label="${escapeHtml(i18n.t("gateway.calendar.add_event"))}">+</button>`;
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

function isAllDayEvent(event) {
    const start = new Date(event.startAt);
    const end = new Date(event.endAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;
    if (end.getTime() <= start.getTime()) return false;
    const startsAtMidnight =
        start.getHours() === 0 &&
        start.getMinutes() === 0 &&
        start.getSeconds() === 0 &&
        start.getMilliseconds() === 0;
    const endsAtMidnight =
        end.getHours() === 0 &&
        end.getMinutes() === 0 &&
        end.getSeconds() === 0 &&
        end.getMilliseconds() === 0;
    return startsAtMidnight && endsAtMidnight;
}

function resolveRenderedEventSpan(event, dayStart, dayEnd) {
    const start = Math.max(new Date(event.startAt).getTime(), dayStart.getTime());
    const end = Math.min(new Date(event.endAt).getTime(), dayEnd.getTime());
    const duration = Math.max(end - start, HALF_HOUR_MS);
    return Math.max(1, Math.ceil(duration / HALF_HOUR_MS));
}

function renderDayView(events, day, i18n) {
    const dayLabel = day.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
    });
    const slots = [];
    const timezone = getEffectiveTimezone();
    const now = new Date();
    const nowFormatter = new Intl.DateTimeFormat("sv-SE", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
    const todayInTimezone = nowFormatter.format(now);
    const dayStart = startOfDay(day);
    const dayEnd = addDays(dayStart, 1);
    const allDayEvents = listEventsInWindow(events, dayStart, dayEnd).filter(
        (event) => isAllDayEvent(event),
    );
    const timedEvents = listEventsInWindow(events, dayStart, dayEnd).filter(
        (event) => !isAllDayEvent(event),
    );
    const allDayRow = `<tr class="calendar-day-all-day-row">
  <th scope="row" class="calendar-day-all-day-label">${escapeHtml(i18n.t("gateway.calendar.all_day"))}</th>
  <td class="calendar-timeslot-events" data-timeslot-events data-slot-start="${dayStart.toISOString()}" data-slot-end="${dayEnd.toISOString()}">${allDayEvents.length ? renderSlotEvents(allDayEvents.slice(0, 3)) : ""}${renderSlotCreateButton(dayStart, dayEnd, i18n)}</td>
</tr>`;
    let occupiedRowsRemaining = 0;
    for (let slotIndex = 0; slotIndex < 48; slotIndex += 1) {
        const start = new Date(dayStart.getTime() + slotIndex * HALF_HOUR_MS);
        const end = new Date(start.getTime() + HALF_HOUR_MS);
        const slotEvents = listEventsInWindow(timedEvents, start, end);
        const timeLabel = start.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        });
        const isCurrentSlot =
            nowFormatter.format(start) === todayInTimezone &&
            now.getTime() >= start.getTime() &&
            now.getTime() < end.getTime();
        let eventsCellMarkup = "";
        if (occupiedRowsRemaining > 0) {
            occupiedRowsRemaining -= 1;
        } else {
            const firstSpanningEvent = slotEvents[0] ?? null;
            if (firstSpanningEvent) {
                const dayEndBoundary = addDays(dayStart, 1);
                const spanRows = resolveRenderedEventSpan(
                    firstSpanningEvent,
                    dayStart,
                    dayEndBoundary,
                );
                occupiedRowsRemaining = Math.max(0, spanRows - 1);
                const overflowCount = Math.max(0, slotEvents.length - 1);
                eventsCellMarkup = `<td class="calendar-timeslot-events${isCurrentSlot ? " calendar-timeslot-events--current" : ""}" data-timeslot-events data-slot-start="${start.toISOString()}" data-slot-end="${end.toISOString()}" rowspan="${spanRows}">
      ${renderEventButton(firstSpanningEvent)}
      ${overflowCount > 0 ? `<span class="calendar-slot-event-overflow">+${overflowCount}</span>` : ""}
      ${renderSlotCreateButton(start, end, i18n)}
    </td>`;
            } else {
                eventsCellMarkup = `<td class="calendar-timeslot-events${isCurrentSlot ? " calendar-timeslot-events--current" : ""}" data-timeslot-events data-slot-start="${start.toISOString()}" data-slot-end="${end.toISOString()}">${renderSlotCreateButton(start, end, i18n)}</td>`;
            }
        }
        slots.push(`<tr class="calendar-timeslot-row${isCurrentSlot ? " calendar-timeslot-row--current" : ""}">
      <th scope="row" class="calendar-timeslot-label">${escapeHtml(timeLabel)}</th>
      ${eventsCellMarkup}
    </tr>`);
    }
    return `<div class="calendar-day-view">
  <h4 class="calendar-day-heading">${escapeHtml(dayLabel)}</h4>
  <table class="calendar-timeslot-table" role="presentation">
    <tbody>
      ${allDayRow}
    </tbody>
  </table>
  <div class="calendar-timeslot-grid">
    <table class="calendar-timeslot-table" role="presentation">
      <tbody>${slots.join("")}</tbody>
    </table>
  </div>
</div>`;
}

function renderWeekView(events, weekStart, i18n) {
    const days = Array.from({ length: 7 }, (_, offset) =>
        addDays(weekStart, offset),
    );
    const dayHeaders = days
        .map((day) => {
            const dayStart = startOfDay(day);
            return `<th scope="col"><button type="button" class="calendar-week-day-header" data-day-dot-date="${dayStart.toISOString()}">
        <span class="calendar-week-day-name">${day.toLocaleDateString(undefined, { weekday: "short" })}</span>
        <span class="calendar-week-day-date">${day.toLocaleDateString(undefined, { month: "numeric", day: "numeric" })}</span>
      </button></th>`;
        })
        .join("");
    const allDayCells = days
        .map((day) => {
            const dayStart = startOfDay(day);
            const dayEnd = addDays(dayStart, 1);
            const dayEvents = listEventsInWindow(events, dayStart, dayEnd).filter(
                (event) => isAllDayEvent(event),
            );
            return `<td class="calendar-week-all-day-cell calendar-timeslot-events" data-timeslot-events data-slot-start="${dayStart.toISOString()}" data-slot-end="${dayEnd.toISOString()}">${dayEvents.length ? renderSlotEvents(dayEvents.slice(0, 2)) : ""}${renderSlotCreateButton(dayStart, dayEnd, i18n)}</td>`;
        })
        .join("");
    const slotRows = [];
    const timedEvents = events.filter((event) => !isAllDayEvent(event));
    for (let slotIndex = 0; slotIndex < 48; slotIndex += 1) {
        const slotCells = days
            .map((day) => {
                const dayStart = startOfDay(day);
                const start = new Date(
                    dayStart.getTime() + slotIndex * HALF_HOUR_MS,
                );
                const end = new Date(start.getTime() + HALF_HOUR_MS);
                const slotEvents = listEventsInWindow(timedEvents, start, end);
                const eventCells = slotEvents.length ? renderSlotEvents(slotEvents) : "";
                return `<td class="calendar-week-slot calendar-timeslot-events" data-timeslot-events data-slot-start="${start.toISOString()}" data-slot-end="${end.toISOString()}">${eventCells}${renderSlotCreateButton(start, end, i18n)}</td>`;
            })
            .join("");
        const timeLabel = new Date(
            startOfDay(weekStart).getTime() + slotIndex * HALF_HOUR_MS,
        ).toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
        });
        slotRows.push(`<tr class="calendar-week-timeslot-row">
      <th scope="row" class="calendar-week-timeslot-label">${escapeHtml(timeLabel)}</th>
      ${slotCells}
    </tr>`);
    }
    return `<div class="calendar-week-view">
  <table class="calendar-week-table" role="presentation">
    <thead>
      <tr class="calendar-week-grid calendar-week-grid--header">
        <th class="calendar-week-axis-label" scope="col">&nbsp;</th>
        ${dayHeaders}
      </tr>
      <tr class="calendar-week-all-day-row">
        <th class="calendar-week-axis-label" scope="row">${escapeHtml(i18n.t("gateway.calendar.all_day"))}</th>
        ${allDayCells}
      </tr>
    </thead>
  </table>
  <div class="calendar-week-scroll-grid">
    <table class="calendar-week-table" role="presentation">
      <tbody>${slotRows.join("")}</tbody>
    </table>
  </div>
</div>`;
}

function renderMonthGrid(events, currentDate, i18n) {
    const monthStart = startOfMonth(currentDate);
    const gridStart = startOfWeek(monthStart);
    const weekdayHeaders = Array.from({ length: 7 }, (_, dayIndex) => {
        const day = addDays(gridStart, dayIndex);
        const dayLabel = day.toLocaleDateString(undefined, {
            weekday: "short",
        });
        return `<th scope="col"><span class="calendar-month-header-day">${escapeHtml(dayLabel)}</span><span class="calendar-month-header-index">x${dayIndex}</span></th>`;
    }).join("");
    const rows = [];
    for (let weekIndex = 0; weekIndex < 6; weekIndex += 1) {
        const weekStart = addDays(gridStart, weekIndex * 7);
        const weekEnd = addDays(weekStart, 7);
        const weekNumber = getISOWeekNumber(weekStart);
        rows.push(`<tr class="calendar-month-row">
      <th scope="row"><button type="button" class="calendar-week-jump" data-week-row-date="${weekStart.toISOString()}" title="${escapeHtml(i18n.t("gateway.calendar.open_week_view"))}">${i18n.t("gateway.calendar.week_number_prefix")}${weekNumber}</button></th>
      ${Array.from({ length: 7 }, (_, dayIndex) => {
          const day = addDays(weekStart, dayIndex);
          const dayStart = startOfDay(day);
          const dayEnd = addDays(dayStart, 1);
          const dayEvents = listEventsInWindow(events, dayStart, dayEnd);
          const previewMarkup = dayEvents
              .slice(0, 3)
              .map((event) => renderEventButton(event))
              .join("");
          return `<td><article class="calendar-month-day${day.getMonth() === monthStart.getMonth() ? "" : " calendar-month-day--outside"}">
          <header>
            <button type="button" class="calendar-day-jump" data-day-dot-date="${dayStart.toISOString()}">${day.getDate()}</button>
            <button type="button" class="calendar-all-day-create" data-month-create-date="${dayStart.toISOString()}">+</button>
          </header>
          <div class="calendar-month-event-count">${dayEvents.length > 0 ? `${dayEvents.length} ${escapeHtml(i18n.t("gateway.calendar.events_count_suffix"))}` : ""}</div>
          <div class="calendar-month-event-preview">${previewMarkup}</div>
        </article></td>`;
      }).join("")}
    </tr>`);
        if (shouldStopRenderingWeeks(weekEnd, monthStart)) break;
    }
    return `<table class="calendar-month-table" role="presentation">
  <thead>
    <tr>
      <th scope="col">${escapeHtml(i18n.t("gateway.calendar.week_short"))}</th>
      ${weekdayHeaders}
    </tr>
  </thead>
  <tbody>${rows.join("")}</tbody>
</table>`;
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
    getResponseActionLabelKey,
    renderEventBadges,
    renderResponseSummary,
    renderCalendarToolbarList,
    renderToolbarSummary,
    renderUpcomingEvents,
    renderCalendarView,
    createEventComposerBuilder,
};

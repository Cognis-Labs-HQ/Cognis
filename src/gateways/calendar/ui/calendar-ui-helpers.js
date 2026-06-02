import { apiFetch } from "/static/reuse/api-client.js";
import { formatDateTime, formatTime } from "/static/reuse/timestamp.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { createFormBuilder } from "/static/reuse/form-builder.js";
import { normalizeCalendarColor } from "/static/gateways/calendar/color.js";
import {
    renderTimeAxisRows,
    renderTimedEventLayer,
} from "./calendar-timed-grid.js";

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
const TIMESLOT_EVENT_PREVIEW_LIMIT = 2;
const MONTH_EVENT_PREVIEW_LIMIT = 3;

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

/**
 * Returns upcoming events for the signed-in attendee whose response is still pending.
 * Missing account ids intentionally produce no quick-response entries until auth-backed
 * calendar metadata is available.
 */
function collectPendingEvents(
    eventsByCalendar,
    calendars,
    selectedCalendarId,
    currentAccountId,
) {
    if (!currentAccountId) return [];
    return collectUpcomingEvents(
        eventsByCalendar,
        calendars,
        selectedCalendarId,
    )
        .filter((event) => Array.isArray(event.attendees))
        .filter((event) => event.attendees.includes(currentAccountId))
        .filter(
            (event) =>
                String(event.responses?.[currentAccountId] ?? "pending") ===
                "pending",
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
    { respondAll = false, targetCalendarId = null } = {},
) {
    const query = respondAll ? "?series=1" : "";
    return apiFetch(
        `/api/v1/calendar/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}/respond${query}`,
        {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({
                response,
                ...(targetCalendarId ? { targetCalendarId } : {}),
            }),
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
    const meetingId = String(payload?.data?.id ?? "").trim();
    if (meetingId) {
        // Prefer the in-app Meetings route so join flows stay within Cognis UI.
        return `${window.location.origin}/meetings?meetingId=${encodeURIComponent(meetingId)}`;
    }
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

function formatEventTimeLabel(event, { allDayLabel = "" } = {}) {
    if (isAllDayEvent(event)) {
        return allDayLabel;
    }
    const startLabel = formatTime(event.startAt, "");
    const endLabel = formatTime(event.endAt, "");
    if (!startLabel) return "";
    if (!endLabel || startLabel === endLabel) {
        return startLabel;
    }
    return `${startLabel} – ${endLabel}`;
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

function renderEventButton(
    event,
    { compact = false, showTime = false, i18n = null } = {},
) {
    const allDayLabel = i18n?.t("gateway.calendar.all_day") ?? "";
    const timeLabel = isAllDayEvent(event)
        ? allDayLabel
        : showTime
          ? formatEventTimeLabel(event, {
                allDayLabel,
            })
          : "";
    const meetingIcon = event.meetingUrl
        ? `<span class="calendar-slot-event-video-icon" title="${escapeHtml(i18n?.t("gateway.calendar.event_meeting_link") ?? "Meeting")}" aria-hidden="true">🎥</span>`
        : "";
    const eventAriaLabel = event.meetingUrl
        ? `${event.title} — ${i18n?.t("gateway.calendar.event_meeting_link") ?? "Meeting"}`
        : event.title;
    return `<button type="button" class="calendar-slot-event${event.status === "free" ? " calendar-slot-event--free" : ""}${compact ? " calendar-slot-event--compact" : ""}" data-calendar-event="${escapeHtml(event.id)}" data-calendar-id="${escapeHtml(event.calendarId)}" style="--calendar-event-stripe:${escapeHtml(event.calendarColor ?? "#1f8ceb")}" title="${escapeHtml(event.title)}" aria-label="${escapeHtml(eventAriaLabel)}">
      ${timeLabel ? `<span class="calendar-slot-event-time">${escapeHtml(timeLabel)}</span>` : ""}
      <strong class="calendar-slot-event-title">${meetingIcon}${escapeHtml(event.title)}</strong>
    </button>`;
}

function renderPendingEvents(events, i18n) {
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
                    `<button type="button" class="calendar-pending-action calendar-pending-action--${escapeHtml(responseOption)}" data-calendar-pending-response="${escapeHtml(responseOption)}" data-calendar-event="${escapeHtml(event.id)}" data-calendar-id="${escapeHtml(event.calendarId)}">${escapeHtml(i18n.t(getResponseActionLabelKey(responseOption)))}</button>`,
            ).join("")}
          </div>
        </li>`,
          )
          .join("")}</ul>
    </section>`;
}

function renderToolbarSummary(summary, pendingEvents, i18n) {
    if (!summary.length && !pendingEvents.length) {
        return `<p class="calendar-empty">${i18n.t("gateway.calendar.no_events")}</p>`;
    }
    const upcomingMarkup = summary.length
        ? `<ul class="calendar-events-list calendar-events-list--compact">${summary
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
              .join("")}</ul>`
        : `<p class="calendar-empty">${i18n.t("gateway.calendar.no_events")}</p>`;
    return `${upcomingMarkup}${renderPendingEvents(pendingEvents, i18n)}`;
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
        <button type="button" class="calendar-upcoming-button" data-calendar-event="${escapeHtml(event.id)}" data-calendar-id="${escapeHtml(event.calendarId)}" aria-label="${escapeHtml(event.meetingUrl ? `${event.title} — ${i18n.t("gateway.calendar.event_meeting_link")}` : event.title)}">
          <strong>${event.meetingUrl ? `<span class="calendar-slot-event-video-icon" title="${escapeHtml(i18n.t("gateway.calendar.event_meeting_link"))}" aria-hidden="true">🎥</span>` : ""}${escapeHtml(event.title)}</strong>
          <div>${formatDateTime(event.startAt)} - ${formatDateTime(event.endAt)}</div>
          <div>${renderEventBadges(event, i18n)}</div>
          ${event.calendarName ? `<div>${escapeHtml(event.calendarName)}</div>` : ""}
        </button>
        ${event.description ? `<div>${escapeHtml(event.description)}</div>` : ""}
      </li>`,
        )
        .join("")}</ul>`;
}

function renderSlotEvents(
    slotEvents,
    {
        previewLimit = TIMESLOT_EVENT_PREVIEW_LIMIT,
        compact = false,
        showTime = false,
        i18n = null,
    } = {},
) {
    if (!slotEvents.length) return "";
    const visibleEvents = slotEvents.slice(0, previewLimit);
    const overflowCount = Math.max(0, slotEvents.length - visibleEvents.length);
    return `<div class="calendar-slot-event-stack${compact ? " calendar-slot-event-stack--compact" : ""}">
      ${visibleEvents
          .map((event) => renderEventButton(event, { compact, showTime, i18n }))
          .join("")}
      ${overflowCount > 0 ? `<span class="calendar-slot-event-overflow-badge">+${overflowCount}</span>` : ""}
    </div>`;
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
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()))
        return false;
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

function renderDayView(events, day, i18n) {
    const dayLabel = day.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
    });
    const dayStart = startOfDay(day);
    const dayEnd = addDays(dayStart, 1);
    const allDayEvents = listEventsInWindow(events, dayStart, dayEnd).filter(
        (event) => isAllDayEvent(event),
    );
    const timedEvents = listEventsInWindow(events, dayStart, dayEnd).filter(
        (event) => !isAllDayEvent(event),
    );
    const allDayRow = `<div class="calendar-day-all-day-row">
  <div class="calendar-timeslot-label calendar-day-all-day-label">${escapeHtml(i18n.t("gateway.calendar.all_day"))}</div>
  <div class="calendar-timeslot-events calendar-timeslot-events--click-add calendar-day-all-day-slot" data-timeslot-events data-slot-start="${dayStart.toISOString()}" data-slot-end="${dayEnd.toISOString()}">${allDayEvents.length ? renderSlotEvents(allDayEvents, { previewLimit: MONTH_EVENT_PREVIEW_LIMIT, compact: true, i18n }) : ""}</div>
</div>`;
    const timedRows = renderTimeAxisRows(dayStart, {
        slotClassName:
            "calendar-day-timed-slot calendar-timeslot-events calendar-timeslot-events--click-add",
        labelClassName: "calendar-timeslot-label",
        currentSlotClassName: "calendar-timeslot-events--current",
        currentLabelClassName: "calendar-timeslot-row--current",
        includeDayData: true,
    });
    return `<div class="calendar-day-view">
  <h4 class="calendar-day-heading">${escapeHtml(dayLabel)}</h4>
  ${allDayRow}
  <div class="calendar-timeslot-grid calendar-day-timed-grid">
    <div class="calendar-day-timed-axis">${timedRows
        .map((row) => row.labelMarkup)
        .join("")}</div>
    <div class="calendar-day-timed-lane">
      <div class="calendar-day-timed-slots">${timedRows
          .map((row) => row.slotMarkup)
          .join("")}</div>
      ${renderTimedEventLayer(timedEvents, dayStart, dayEnd, {
          i18n,
          renderEventButton,
      })}
    </div>
  </div>
</div>`;
}

function renderWeekView(events, weekStart, i18n) {
    const days = Array.from({ length: 7 }, (_, offset) =>
        addDays(weekStart, offset),
    );
    const todayStart = startOfDay(new Date()).getTime();
    const dayHeaders = days
        .map((day) => {
            const dayStart = startOfDay(day);
            const isCurrentDay = dayStart.getTime() === todayStart;
            return `<button type="button" class="calendar-week-day-header${isCurrentDay ? " calendar-week-day-header--current" : ""}" data-day-dot-date="${dayStart.toISOString()}">
        <span class="calendar-week-day-name">${day.toLocaleDateString(undefined, { weekday: "short" })}</span>
        <span class="calendar-week-day-date">${day.toLocaleDateString(undefined, { month: "numeric", day: "numeric" })}</span>
      </button>`;
        })
        .join("");
    const allDayCells = days
        .map((day) => {
            const dayStart = startOfDay(day);
            const dayEnd = addDays(dayStart, 1);
            const dayEvents = listEventsInWindow(
                events,
                dayStart,
                dayEnd,
            ).filter((event) => isAllDayEvent(event));
            const isCurrentDay = dayStart.getTime() === todayStart;
            return `<div class="calendar-week-all-day-cell calendar-timeslot-events${isCurrentDay ? " calendar-week-slot--current-day" : ""}" data-timeslot-events data-slot-start="${dayStart.toISOString()}" data-slot-end="${dayEnd.toISOString()}">${dayEvents.length ? renderSlotEvents(dayEvents, { compact: true, i18n }) : ""}</div>`;
        })
        .join("");
    const timedEvents = events.filter((event) => !isAllDayEvent(event));
    const axisRows = renderTimeAxisRows(startOfDay(weekStart), {
        slotClassName: "calendar-week-time-axis-spacer",
        labelClassName: "calendar-week-timeslot-label",
        currentLabelClassName: "calendar-week-timeslot-label--current",
    });
    return `<div class="calendar-week-view" data-calendar-week-view>
  <div class="calendar-week-header-grid" data-calendar-week-header>
    <div class="calendar-week-axis-label calendar-week-axis-label--corner" aria-hidden="true"></div>
    ${dayHeaders}
  </div>
  <div class="calendar-week-all-day-grid">
    <div class="calendar-week-axis-label">${escapeHtml(i18n.t("gateway.calendar.all_day"))}</div>
    ${allDayCells}
  </div>
  <div class="calendar-week-scroll-grid" data-calendar-week-scroll-grid>
    <div class="calendar-week-timed-grid">
      <div class="calendar-week-time-axis">${axisRows
          .map((row) => row.labelMarkup)
          .join("")}</div>
      <div class="calendar-week-day-columns">${days
          .map((day) => {
              const dayStart = startOfDay(day);
              const dayEnd = addDays(dayStart, 1);
              const isCurrentDay = dayStart.getTime() === todayStart;
              const timedRows = renderTimeAxisRows(dayStart, {
                  slotClassName: "calendar-week-slot calendar-timeslot-events",
                  labelClassName: "calendar-week-timeslot-label",
                  currentSlotClassName: "calendar-week-slot--current-time",
                  includeDayData: true,
              });
              const timedSlotMarkup = timedRows
                  .map((row) => {
                      const hasEvents =
                          listEventsInWindow(timedEvents, row.start, row.end)
                              .length > 0;
                      return row.slotMarkup.replace(
                          "calendar-week-slot calendar-timeslot-events",
                          `calendar-week-slot calendar-timeslot-events${!hasEvents ? " calendar-timeslot-events--click-add" : ""}${isCurrentDay ? " calendar-week-slot--current-day" : ""}`,
                      );
                  })
                  .join("");
              const dayTimedEvents = listEventsInWindow(
                  timedEvents,
                  dayStart,
                  dayEnd,
              );
              return `<div class="calendar-week-day-lane${isCurrentDay ? " calendar-week-day-lane--current" : ""}">
            <div class="calendar-week-day-slots">${timedSlotMarkup}</div>
            ${renderTimedEventLayer(dayTimedEvents, dayStart, dayEnd, {
                i18n,
                renderEventButton,
            })}
          </div>`;
          })
          .join("")}</div>
    </div>
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
        return `<th scope="col"><span class="calendar-month-header-day">${escapeHtml(dayLabel)}</span></th>`;
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
              .slice(0, MONTH_EVENT_PREVIEW_LIMIT)
              .map((event) =>
                  renderEventButton(event, {
                      compact: true,
                      showTime: !isAllDayEvent(event),
                      i18n,
                  }),
              )
              .join("");
          const placeholderCount = Math.max(
              0,
              MONTH_EVENT_PREVIEW_LIMIT -
                  Math.min(dayEvents.length, MONTH_EVENT_PREVIEW_LIMIT),
          );
          const placeholders = Array.from(
              { length: placeholderCount },
              () =>
                  '<span class="calendar-month-event-placeholder" aria-hidden="true"></span>',
          ).join("");
          const overflowCount = dayEvents.length - MONTH_EVENT_PREVIEW_LIMIT;
          return `<td><article class="calendar-month-day${day.getMonth() === monthStart.getMonth() ? "" : " calendar-month-day--outside"}">
          <header>
            <button type="button" class="calendar-day-jump" data-day-dot-date="${dayStart.toISOString()}">${day.getDate()}</button>
            <button type="button" class="calendar-all-day-create" data-month-create-date="${dayStart.toISOString()}">+</button>
          </header>
          <div class="calendar-month-event-preview">${previewMarkup}${placeholders}${overflowCount > 0 ? `<div class="calendar-month-event-overflow">…</div>` : ""}</div>
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
      <button type="button" class="calendar-year-mini-week-jump" data-week-row-date="${weekStart.toISOString()}" title="${escapeHtml(i18n.t("gateway.calendar.open_week_view"))}">${weekNumber}</button>
      ${Array.from({ length: 7 }, (_, dayIndex) => {
          const day = addDays(weekStart, dayIndex);
          const isOutsideMonth = day.getMonth() !== monthStart.getMonth();
          const dayLabel = day.toLocaleDateString(undefined, {
              dateStyle: "long",
          });
          const dayStart = startOfDay(day);
          const dayEnd = addDays(dayStart, 1);
          const dayEvents = listEventsInWindow(events, dayStart, dayEnd);
          const styleProperties = [
              `--calendar-density:${Math.min(dayEvents.length, 4)}`,
          ];
          const dayHighlightColor = normalizeHexColor(
              dayEvents[0]?.calendarColor,
          );
          if (dayHighlightColor) {
              styleProperties.push(
                  `--calendar-day-color:${escapeHtml(dayHighlightColor)}`,
              );
          }
          return `<button type="button" class="calendar-year-day-dot${isOutsideMonth ? " calendar-year-day-dot--outside" : ""}${dayEvents.length > 0 ? " calendar-year-day-dot--active" : ""}" data-day-dot-date="${dayStart.toISOString()}" style="${styleProperties.join(";")}" aria-label="${escapeHtml(dayLabel)}">${day.getDate()}</button>`;
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
            maxCharacters: 120,
            value: String(defaultValues.title ?? ""),
            disabled: readOnly,
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
                    test: (value, fieldValues) => {
                        const endValue = String(value ?? "");
                        const startValue = String(fieldValues.startAt ?? "");
                        const endTime = new Date(endValue).getTime();
                        const startTime = new Date(startValue).getTime();
                        if (Number.isNaN(endTime) || Number.isNaN(startTime)) {
                            return false;
                        }
                        if (endTime > startTime) return true;
                        const isDateOnlyRange =
                            !startValue.includes("T") &&
                            !endValue.includes("T");
                        return isDateOnlyRange && endTime === startTime;
                    },
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
    collectPendingEvents,
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
    renderPendingEvents,
    renderToolbarSummary,
    renderUpcomingEvents,
    renderCalendarView,
    getISOWeekNumber,
    createEventComposerBuilder,
};

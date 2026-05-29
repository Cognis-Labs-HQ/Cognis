import { apiFetch } from '/static/reuse/api-client.js';
import { applyDocumentTitle, createI18n } from '/static/reuse/i18n.js';
import { createPageComposer } from '/static/reuse/page-composer/init.js';
import { mountWhenDirect } from '/static/reuse/page-entry.js';
import { showToast } from '/static/reuse/toast.js';
import { formatDateTime } from '/static/reuse/timestamp.js';
import { escapeHtml } from '/static/reuse/escape-html.js';
import { openPopup } from '/static/reuse/popup.js';
import { createFormBuilder } from '/static/reuse/form-builder.js';

const HALF_HOUR_MS = 30 * 60 * 1000;
const CALENDAR_VIEWS = ['day', 'week', 'month', 'year'];

function parseCalendarSelection() {
  const query = new URLSearchParams(window.location.search);
  return query.get('calendarId');
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
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function normalizeHexColor(value) {
  const color = String(value ?? '').trim();
  return /^#([0-9a-fA-F]{6})$/.test(color) ? color.toLowerCase() : '#1f8ceb';
}

function splitHandles(value) {
  return Array.from(
    new Set(
      String(value ?? '')
        .split(/[\n,]+/)
        .map((entry) => entry.trim().replace(/^@/, '').toLowerCase())
        .filter(Boolean),
    ),
  );
}

function splitInviteEmails(value) {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
  return Array.from(
    new Set(
      String(value ?? '')
        .split(/[\n,]+/)
        .map((entry) => entry.trim().toLowerCase())
        .filter((entry) => emailPattern.test(entry)),
    ),
  );
}

function collectUpcomingEvents(eventsByCalendar, calendars, selectedCalendarId) {
  const calendarById = new Map(calendars.map((calendar) => [calendar.id, calendar]));
  return Object.entries(eventsByCalendar)
    .flatMap(([calendarId, events]) =>
      events.map((event) => ({
        ...event,
        calendarId,
        calendarColor: normalizeHexColor(calendarById.get(calendarId)?.color),
      })),
    )
    .sort((left, right) => left.startAt.localeCompare(right.startAt))
    .filter((event) => new Date(event.endAt).getTime() >= Date.now())
    .filter((event) => !selectedCalendarId || event.calendarId === selectedCalendarId);
}

async function fetchCalendarState() {
  const response = await apiFetch('/api/v1/calendar/calendars');
  if (!response.ok) throw new Error('calendar_load_failed');
  const payload = await response.json();
  return {
    calendars: Array.isArray(payload?.data) ? payload.data : [],
    meta: payload && typeof payload.meta === 'object' && payload.meta ? payload.meta : {},
  };
}

async function fetchEvents(calendarId) {
  const response = await apiFetch(`/api/v1/calendar/calendars/${encodeURIComponent(calendarId)}/events`);
  if (!response.ok) throw new Error('calendar_events_failed');
  const payload = await response.json();
  return Array.isArray(payload?.data?.events) ? payload.data.events : [];
}

async function probeJitsiAvailability() {
  const response = await apiFetch('/api/v1/modules/jitsi-meet/ping');
  if (!response.ok) return false;
  const payload = await response.json();
  return Boolean(payload?.data?.ready) && Boolean(payload?.data?.configComplete);
}

async function createJitsiMeeting(attendees) {
  const response = await apiFetch('/api/v1/modules/jitsi-meet/meetings/create', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ participants: attendees }),
  });
  if (!response.ok) throw new Error('meeting_create_failed');
  const payload = await response.json();
  return payload?.data?.meetingUrl ? String(payload.data.meetingUrl) : null;
}

function renderCalendarToolbarList(calendars, selectedCalendarId, i18n) {
  if (!calendars.length) {
    return `<p class="calendar-empty">${i18n.t('gateway.calendar.no_calendars')}</p>`;
  }
  return `<ul class="calendar-calendars-list">${calendars
    .map(
      (calendar) => `<li>
        <button type="button" class="calendar-select-link" data-calendar-select="${escapeHtml(calendar.id)}" ${selectedCalendarId === calendar.id ? 'aria-current="page"' : ''}>
          <span class="calendar-select-dot" aria-hidden="true" style="background:${escapeHtml(normalizeHexColor(calendar.color))}; border-color:${escapeHtml(normalizeHexColor(calendar.color))}"></span>
          <span class="calendar-select-label">${escapeHtml(calendar.name)}</span>
        </button>
        <div class="calendar-visibility">${i18n.t(calendar.visibility === 'public' ? 'gateway.calendar.visibility_public' : 'gateway.calendar.visibility_private')}</div>
      </li>`,
    )
    .join('')}</ul>`;
}

function renderToolbarSummary(summary, i18n) {
  if (!summary.length) {
    return `<p class="calendar-empty">${i18n.t('gateway.calendar.no_events')}</p>`;
  }
  return `<ul class="calendar-events-list calendar-events-list--compact">${summary
    .slice(0, 5)
    .map(
      (event) => `<li class="calendar-upcoming-item" style="--calendar-event-stripe:${escapeHtml(normalizeHexColor(event.calendarColor))}">
        <strong>${escapeHtml(event.title)}</strong>
        <div>${formatDateTime(event.startAt)}</div>
      </li>`,
    )
    .join('')}</ul>`;
}

function renderUpcomingEvents(events, i18n) {
  if (!events.length) {
    return `<p class="calendar-empty">${i18n.t('gateway.calendar.no_events')}</p>`;
  }
  return `<ul class="calendar-events-list">${events
    .map(
      (event) => `<li class="calendar-upcoming-item" style="--calendar-event-stripe:${escapeHtml(normalizeHexColor(event.calendarColor))}">
        <strong>${escapeHtml(event.title)}</strong>
        <div>${formatDateTime(event.startAt)} - ${formatDateTime(event.endAt)}</div>
        ${event.description ? `<div>${escapeHtml(event.description)}</div>` : ''}
        ${event.meetingUrl ? `<div><a href="${escapeHtml(event.meetingUrl)}" target="_blank" rel="noreferrer noopener">${i18n.t('gateway.calendar.event_meeting_link')}</a></div>` : ''}
      </li>`,
    )
    .join('')}</ul>`;
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
      <span>${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      ${hasEvent ? `<span class="calendar-slot-indicator">${i18n.t('gateway.calendar.slot_busy')}</span>` : ''}
    </button>`);
  }
  return `<div class="calendar-slot-grid">${slots.join('')}</div>`;
}

function renderWeekSlots(events, weekStart, i18n) {
  const days = Array.from({ length: 7 }, (_, offset) => addDays(weekStart, offset));
  return `<div class="calendar-week-grid">${days
    .map((day) => {
      const dayStart = startOfDay(day);
      const dayEnd = addDays(dayStart, 1);
      const dayEvents = listEventsInWindow(events, dayStart, dayEnd);
      return `<section class="calendar-week-day">
        <h4>${day.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</h4>
        ${renderDaySlots(dayEvents, dayStart, i18n)}
      </section>`;
    })
    .join('')}</div>`;
}

function renderMonthGrid(events, currentDate, i18n) {
  const monthStart = startOfMonth(currentDate);
  const gridStart = startOfWeek(monthStart);
  const rows = [];
  for (let weekIndex = 0; weekIndex < 6; weekIndex += 1) {
    const weekStart = addDays(gridStart, weekIndex * 7);
    const weekEnd = addDays(weekStart, 7);
    rows.push(`<div class="calendar-month-row">
      <button type="button" class="calendar-week-jump" data-week-row-date="${weekStart.toISOString()}">${i18n.t('gateway.calendar.open_week_view')}</button>
      ${Array.from({ length: 7 }, (_, dayIndex) => {
        const day = addDays(weekStart, dayIndex);
        const dayStart = startOfDay(day);
        const dayEnd = addDays(dayStart, 1);
        const dayEvents = listEventsInWindow(events, dayStart, dayEnd);
        return `<article class="calendar-month-day${day.getMonth() === monthStart.getMonth() ? '' : ' calendar-month-day--outside'}">
          <header>
            <span>${day.getDate()}</span>
            <button type="button" class="calendar-day-jump" data-day-dot-date="${dayStart.toISOString()}">•</button>
          </header>
          <button type="button" class="calendar-all-day-create" data-month-create-date="${dayStart.toISOString()}">${i18n.t('gateway.calendar.create_all_day')}</button>
          <div class="calendar-month-event-count">${dayEvents.length > 0 ? `${dayEvents.length} ${escapeHtml(i18n.t('gateway.calendar.events_count_suffix'))}` : ''}</div>
        </article>`;
      }).join('')}
    </div>`);
    if (weekEnd.getMonth() > monthStart.getMonth() && weekEnd.getDate() > 7) break;
  }
  return `<div class="calendar-month-grid">${rows.join('')}</div>`;
}

function renderYearGrid(currentDate) {
  const yearStart = startOfYear(currentDate);
  return `<div class="calendar-year-grid">${Array.from({ length: 12 }, (_, monthIndex) => {
    const monthDate = new Date(yearStart);
    monthDate.setMonth(monthIndex);
    return `<button type="button" class="calendar-year-month" data-year-month-index="${monthIndex}">${monthDate.toLocaleDateString(undefined, { month: 'long' })}</button>`;
  }).join('')}</div>`;
}

function renderCalendarView(events, selectedView, activeDate, i18n) {
  if (selectedView === 'day') {
    const dayStart = startOfDay(activeDate);
    const dayEnd = addDays(dayStart, 1);
    return renderDaySlots(listEventsInWindow(events, dayStart, dayEnd), dayStart, i18n);
  }
  if (selectedView === 'week') {
    const weekStart = startOfWeek(activeDate);
    const weekEnd = addDays(weekStart, 7);
    return renderWeekSlots(listEventsInWindow(events, weekStart, weekEnd), weekStart, i18n);
  }
  if (selectedView === 'year') {
    return renderYearGrid(activeDate);
  }
  return renderMonthGrid(events, activeDate, i18n);
}

function createEventComposerBuilder({ i18n, defaultValues = {}, canInviteExternal, submitLabelKey }) {
  const fields = [
    {
      name: 'title',
      labelKey: 'gateway.calendar.event_title',
      required: true,
      value: String(defaultValues.title ?? ''),
      criteria: [
        {
          id: 'event-title-max',
          type: 'maxLength',
          value: 120,
          messageKey: 'gateway.calendar.event_title_max',
        },
      ],
    },
    {
      name: 'description',
      labelKey: 'gateway.calendar.event_description',
      type: 'textarea',
      value: String(defaultValues.description ?? ''),
    },
    {
      name: 'startAt',
      labelKey: 'gateway.calendar.event_start',
      type: 'datetime-local',
      required: true,
      value: String(defaultValues.startAt ?? ''),
    },
    {
      name: 'endAt',
      labelKey: 'gateway.calendar.event_end',
      type: 'datetime-local',
      required: true,
      value: String(defaultValues.endAt ?? ''),
      criteria: [
        {
          id: 'event-range',
          type: 'custom',
          mode: 'submit',
          test: (value, fieldValues) => new Date(value).getTime() > new Date(fieldValues.startAt ?? '').getTime(),
          messageKey: 'gateway.calendar.event_end_after_start',
        },
      ],
    },
    {
      name: 'attendees',
      labelKey: 'gateway.calendar.attendees_label',
      type: 'textarea',
      value: String(defaultValues.attendees ?? ''),
      attributes: {
        placeholder: i18n.t('gateway.calendar.attendees_placeholder'),
      },
    },
  ];

  if (canInviteExternal) {
    fields.push({
      name: 'inviteEmails',
      labelKey: 'gateway.calendar.invite_emails',
      type: 'textarea',
      value: String(defaultValues.inviteEmails ?? ''),
      attributes: {
        placeholder: i18n.t('gateway.calendar.invite_emails_placeholder'),
      },
    });
  }

  return createFormBuilder(
    {
      i18n,
      escapeHtml,
    },
    {
      formId: 'calendar-event-form',
      submitLabelKey,
      fields,
      submitButtonClassName: 'btn-confirm',
      formClassName: 'calendar-event-form-builder',
    },
  );
}

export async function mount(root, { signal } = {}) {
  const i18n = await createI18n({
    componentStringBaseUrls: ['/static/gateways/calendar/ui/languages'],
  });
  applyDocumentTitle(i18n, 'gateway.calendar.page_title');

  let calendars = [];
  let selectedCalendarId = parseCalendarSelection();
  let eventsByCalendar = {};
  let canInviteExternal = false;
  let jitsiAvailable = false;
  let selectedView = 'month';
  let activeDate = new Date();
  let floatingCreator = null;

  async function reloadState() {
    const calendarState = await fetchCalendarState();
    calendars = calendarState.calendars;
    canInviteExternal = Boolean(calendarState.meta?.canInviteExternal);
    if (!selectedCalendarId && calendars[0]) {
      selectedCalendarId = calendars[0].id;
    }
    const eventEntries = await Promise.all(
      calendars.map(async (calendar) => [calendar.id, await fetchEvents(calendar.id)]),
    );
    eventsByCalendar = Object.fromEntries(eventEntries);
  }

  try {
    await reloadState();
    jitsiAvailable = await probeJitsiAvailability();
  } catch {
    showToast(i18n.t('gateway.calendar.load_failed'), 'error');
  }

  const eventComposerBuilder = createEventComposerBuilder({
    i18n,
    canInviteExternal,
    submitLabelKey: 'gateway.calendar.create_event',
  });

  function selectedEvents() {
    return selectedCalendarId ? eventsByCalendar[selectedCalendarId] ?? [] : [];
  }

  function allUpcomingEvents() {
    return collectUpcomingEvents(eventsByCalendar, calendars, selectedCalendarId);
  }

  function syncCalendarSelectionToUrl() {
    const query = new URLSearchParams(window.location.search);
    if (selectedCalendarId) {
      query.set('calendarId', selectedCalendarId);
    } else {
      query.delete('calendarId');
    }
    const nextPath = `/calendar${query.toString() ? `?${query.toString()}` : ''}`;
    window.history.replaceState(null, '', nextPath);
  }

  async function submitEvent({
    title,
    description,
    startAt,
    endAt,
    attendees,
    inviteEmails,
    createMeeting,
  }) {
    if (!selectedCalendarId) return false;
    let meetingUrl = null;
    if (createMeeting && jitsiAvailable) {
      try {
        meetingUrl = await createJitsiMeeting(attendees);
      } catch {
        showToast(i18n.t('gateway.calendar.create_meeting_failed'), 'error');
        return false;
      }
    }
    const response = await apiFetch(`/api/v1/calendar/calendars/${encodeURIComponent(selectedCalendarId)}/events`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        title,
        description,
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
        attendees,
        inviteEmails,
        meetingUrl,
      }),
    });
    if (!response.ok) {
      showToast(i18n.t('gateway.calendar.create_event_failed'), 'error');
      return false;
    }
    eventsByCalendar[selectedCalendarId] = await fetchEvents(selectedCalendarId);
    showToast(i18n.t('gateway.calendar.create_event_success'), 'success');
    return true;
  }

  const composer = createPageComposer(root, {
    allowCustomization: true,
    elements: [
      {
        id: 'calendar-view',
        label: i18n.t('gateway.calendar.calendar_view'),
        pinned: true,
        gridSize: { default: [12, 9], min: [6, 6], max: 'full' },
        render: () => `
          <section class="calendar-section">
            <header class="calendar-view-header">
              <h3>${i18n.t('gateway.calendar.calendar_view')}</h3>
              <div class="calendar-view-switcher">
                ${CALENDAR_VIEWS.map((view) => `<button type="button" data-calendar-view="${view}" class="${selectedView === view ? 'active' : ''}">${i18n.t(`gateway.calendar.view_${view}`)}</button>`).join('')}
              </div>
              <div class="calendar-view-nav">
                <button type="button" data-calendar-nav="prev">${i18n.t('gateway.calendar.previous')}</button>
                <button type="button" data-calendar-nav="today">${i18n.t('gateway.calendar.today')}</button>
                <button type="button" data-calendar-nav="next">${i18n.t('gateway.calendar.next')}</button>
              </div>
            </header>
            <div class="calendar-view-canvas">${renderCalendarView(allUpcomingEvents(), selectedView, activeDate, i18n)}</div>
            ${floatingCreator
              ? `<div class="calendar-floating-create">
                  <h4>${i18n.t('gateway.calendar.quick_create')}</h4>
                  <label><span>${i18n.t('gateway.calendar.event_title')}</span><input id="calendar-floating-title" type="text" required /></label>
                  <label><span>${i18n.t('gateway.calendar.event_start')}</span><input id="calendar-floating-start" type="datetime-local" value="${escapeHtml(toDateTimeLocalValue(floatingCreator.startAt))}" required /></label>
                  <label><span>${i18n.t('gateway.calendar.event_end')}</span><input id="calendar-floating-end" type="datetime-local" value="${escapeHtml(toDateTimeLocalValue(floatingCreator.endAt))}" required /></label>
                  <div class="calendar-floating-actions">
                    <button type="button" class="btn-confirm" data-floating-create="submit">${i18n.t('gateway.calendar.create_event')}</button>
                    <button type="button" data-floating-create="details">${i18n.t('gateway.calendar.more_details')}</button>
                    <button type="button" data-floating-create="close">${i18n.t('ui.reuse.cancel')}</button>
                  </div>
                </div>`
              : ''}
          </section>
        `,
        onRender: () => {
          root.querySelectorAll('[data-calendar-view]').forEach((button) => {
            button.addEventListener(
              'click',
              () => {
                const nextView = String(button.getAttribute('data-calendar-view') ?? 'month');
                if (!CALENDAR_VIEWS.includes(nextView)) return;
                selectedView = nextView;
                floatingCreator = null;
                composer.refresh();
              },
              { signal },
            );
          });

          root.querySelectorAll('[data-calendar-nav]').forEach((button) => {
            button.addEventListener(
              'click',
              () => {
                const nav = button.getAttribute('data-calendar-nav');
                if (nav === 'today') {
                  activeDate = new Date();
                } else if (selectedView === 'day') {
                  activeDate = addDays(activeDate, nav === 'next' ? 1 : -1);
                } else if (selectedView === 'week') {
                  activeDate = addDays(activeDate, nav === 'next' ? 7 : -7);
                } else if (selectedView === 'month') {
                  activeDate = new Date(activeDate.getFullYear(), activeDate.getMonth() + (nav === 'next' ? 1 : -1), 1);
                } else {
                  activeDate = new Date(activeDate.getFullYear() + (nav === 'next' ? 1 : -1), 0, 1);
                }
                floatingCreator = null;
                composer.refresh();
              },
              { signal },
            );
          });

          root.querySelectorAll('[data-slot-start]').forEach((button) => {
            button.addEventListener(
              'click',
              () => {
                if (selectedView === 'year' || selectedView === 'month') return;
                const startAt = new Date(String(button.getAttribute('data-slot-start') ?? ''));
                const endAt = new Date(String(button.getAttribute('data-slot-end') ?? ''));
                if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) return;
                floatingCreator = { startAt, endAt };
                composer.refresh();
              },
              { signal },
            );
          });

          root.querySelectorAll('[data-month-create-date]').forEach((button) => {
            button.addEventListener(
              'click',
              () => {
                const startAt = new Date(String(button.getAttribute('data-month-create-date') ?? ''));
                if (Number.isNaN(startAt.getTime())) return;
                const endAt = new Date(startAt.getTime() + 24 * 60 * 60 * 1000);
                floatingCreator = { startAt, endAt };
                composer.refresh();
              },
              { signal },
            );
          });

          root.querySelectorAll('[data-year-month-index]').forEach((button) => {
            button.addEventListener(
              'click',
              () => {
                const monthIndex = Number.parseInt(String(button.getAttribute('data-year-month-index') ?? '0'), 10);
                activeDate = new Date(activeDate.getFullYear(), monthIndex, 1);
                selectedView = 'month';
                composer.refresh();
              },
              { signal },
            );
          });

          root.querySelectorAll('[data-week-row-date]').forEach((button) => {
            button.addEventListener(
              'click',
              () => {
                activeDate = new Date(String(button.getAttribute('data-week-row-date') ?? ''));
                selectedView = 'week';
                composer.refresh();
              },
              { signal },
            );
          });

          root.querySelectorAll('[data-day-dot-date]').forEach((button) => {
            button.addEventListener(
              'click',
              () => {
                activeDate = new Date(String(button.getAttribute('data-day-dot-date') ?? ''));
                selectedView = 'day';
                composer.refresh();
              },
              { signal },
            );
          });

          const floatingSubmit = root.querySelector('[data-floating-create="submit"]');
          floatingSubmit?.addEventListener(
            'click',
            async () => {
              const title = String(root.querySelector('#calendar-floating-title')?.value ?? '').trim();
              const startAt = String(root.querySelector('#calendar-floating-start')?.value ?? '').trim();
              const endAt = String(root.querySelector('#calendar-floating-end')?.value ?? '').trim();
              if (!title || !startAt || !endAt) return;
              const created = await submitEvent({
                title,
                description: '',
                startAt,
                endAt,
                attendees: [],
                inviteEmails: [],
                createMeeting: false,
              });
              if (!created) return;
              floatingCreator = null;
              composer.refresh();
            },
            { signal },
          );

          const floatingClose = root.querySelector('[data-floating-create="close"]');
          floatingClose?.addEventListener(
            'click',
            () => {
              floatingCreator = null;
              composer.refresh();
            },
            { signal },
          );

          const floatingDetails = root.querySelector('[data-floating-create="details"]');
          floatingDetails?.addEventListener(
            'click',
            async () => {
              if (!floatingCreator) return;
              const detailBuilder = createEventComposerBuilder({
                i18n,
                canInviteExternal,
                submitLabelKey: 'gateway.calendar.create_event',
                defaultValues: {
                  startAt: toDateTimeLocalValue(floatingCreator.startAt),
                  endAt: toDateTimeLocalValue(floatingCreator.endAt),
                },
              });
              let detailController = null;
              await openPopup({
                title: i18n.t('gateway.calendar.event_composer'),
                body: () => `
                  ${detailBuilder.render()}
                  ${jitsiAvailable ? `<label class="calendar-checkbox-row"><input id="calendar-popup-create-meeting" type="checkbox" /> ${i18n.t('gateway.calendar.create_meeting')}</label>` : ''}
                `,
                closeProtection: true,
                actions: [
                  { id: 'save', label: i18n.t('gateway.calendar.create_event'), variant: 'confirm' },
                  { id: 'cancel', label: i18n.t('ui.reuse.cancel'), variant: 'cancel' },
                ],
                onOpen: (overlay) => {
                  const formElement = overlay.querySelector('#calendar-event-form');
                  if (formElement instanceof HTMLFormElement) {
                    detailController = detailBuilder.attach(formElement, { signal });
                  }
                },
                onAction: async (actionId, overlay) => {
                  if (actionId !== 'save') return true;
                  if (!detailController?.validateAll(true)) return false;
                  const values = detailController.getValues();
                  const createMeeting = Boolean(overlay.querySelector('#calendar-popup-create-meeting')?.checked);
                  const created = await submitEvent({
                    title: values.title,
                    description: values.description,
                    startAt: values.startAt,
                    endAt: values.endAt,
                    attendees: splitHandles(values.attendees),
                    inviteEmails: canInviteExternal ? splitInviteEmails(values.inviteEmails) : [],
                    createMeeting,
                  });
                  if (!created) return false;
                  floatingCreator = null;
                  composer.refresh();
                  return true;
                },
              });
            },
            { signal },
          );
        },
      },
      {
        id: 'event-composer',
        label: i18n.t('gateway.calendar.event_composer'),
        gridSize: { default: [12, 5], min: [6, 4], max: 'full' },
        render: () => `
          <section class="calendar-section">
            <h3>${i18n.t('gateway.calendar.event_composer')}</h3>
            ${eventComposerBuilder.render()}
            ${jitsiAvailable ? `<label class="calendar-checkbox-row"><input id="calendar-event-create-meeting" type="checkbox" /> ${i18n.t('gateway.calendar.create_meeting')}</label>` : ''}
          </section>
        `,
        onRender: () => {
          const eventForm = root.querySelector('#calendar-event-form');
          if (!(eventForm instanceof HTMLFormElement)) return;
          const controller = eventComposerBuilder.attach(eventForm, { signal });
          eventForm.addEventListener(
            'submit',
            async (event) => {
              event.preventDefault();
              if (!controller.validateAll(true)) return;
              const values = controller.getValues();
              const created = await submitEvent({
                title: values.title,
                description: values.description,
                startAt: values.startAt,
                endAt: values.endAt,
                attendees: splitHandles(values.attendees),
                inviteEmails: canInviteExternal ? splitInviteEmails(values.inviteEmails) : [],
                createMeeting: Boolean(root.querySelector('#calendar-event-create-meeting')?.checked),
              });
              if (!created) return;
              composer.refresh();
            },
            { signal },
          );
        },
      },
      {
        id: 'upcoming-events',
        label: i18n.t('gateway.calendar.upcoming_events'),
        gridSize: { default: [12, 4], min: [6, 4], max: 'full' },
        render: () => `
          <section class="calendar-section">
            <h3>${i18n.t('gateway.calendar.upcoming_events')}</h3>
            ${renderUpcomingEvents(allUpcomingEvents(), i18n)}
          </section>
        `,
      },
    ],
    toolbar: [
      {
        id: 'calendar-manager',
        label: i18n.t('gateway.calendar.my_calendars'),
        render: () => `
          <section class="toolbar-section calendar-toolbar-section">
            <h3>${i18n.t('gateway.calendar.my_calendars')}</h3>
            <form id="calendar-create-form" class="calendar-inline-form">
              <input id="calendar-name" type="text" placeholder="${i18n.t('gateway.calendar.calendar_name_placeholder')}" required />
              <select id="calendar-visibility">
                <option value="private">${i18n.t('gateway.calendar.visibility_private')}</option>
                <option value="public">${i18n.t('gateway.calendar.visibility_public')}</option>
              </select>
              <label class="calendar-color-field"><span>${i18n.t('gateway.calendar.calendar_color')}</span><input id="calendar-color" type="color" value="#1f8ceb" /></label>
              <button type="submit" class="btn-confirm">${i18n.t('gateway.calendar.create_calendar')}</button>
            </form>
            <div id="calendar-toolbar-list">${renderCalendarToolbarList(calendars, selectedCalendarId, i18n)}</div>
          </section>
          <section class="toolbar-section calendar-toolbar-section">
            <h3>${i18n.t('gateway.calendar.upcoming_summary')}</h3>
            <div id="calendar-toolbar-summary">${renderToolbarSummary(allUpcomingEvents(), i18n)}</div>
          </section>
        `,
      },
    ],
    preferenceKey: 'calendar-layout',
    i18n,
    pageContext: {
      title: i18n.t('gateway.calendar.page_title'),
      subtitle: i18n.t('gateway.calendar.page_subtitle'),
    },
    onRender: () => {
      const createForm = root.querySelector('#calendar-create-form');
      createForm?.addEventListener(
        'submit',
        async (event) => {
          event.preventDefault();
          const name = String(root.querySelector('#calendar-name')?.value ?? '').trim();
          const visibility = String(root.querySelector('#calendar-visibility')?.value ?? 'private');
          const color = normalizeHexColor(root.querySelector('#calendar-color')?.value);
          if (!name) return;
          const response = await apiFetch('/api/v1/calendar/calendars', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
            },
            body: JSON.stringify({ name, visibility, color }),
          });
          if (!response.ok) {
            showToast(i18n.t('gateway.calendar.create_calendar_failed'), 'error');
            return;
          }
          await reloadState();
          syncCalendarSelectionToUrl();
          showToast(i18n.t('gateway.calendar.create_calendar_success'), 'success');
          composer.refresh();
        },
        { signal },
      );

      root.querySelectorAll('[data-calendar-select]').forEach((button) => {
        button.addEventListener(
          'click',
          () => {
            selectedCalendarId = String(button.getAttribute('data-calendar-select') ?? '').trim();
            syncCalendarSelectionToUrl();
            composer.refresh();
          },
          { signal },
        );
      });

      const toolbarList = root.querySelector('#calendar-toolbar-list');
      if (toolbarList) {
        toolbarList.innerHTML = renderCalendarToolbarList(calendars, selectedCalendarId, i18n);
      }
      const toolbarSummary = root.querySelector('#calendar-toolbar-summary');
      if (toolbarSummary) {
        toolbarSummary.innerHTML = renderToolbarSummary(allUpcomingEvents(), i18n);
      }
    },
  });

  await composer.init();
}

await mountWhenDirect(mount);

import { createFormBuilder } from "/static/reuse/form-builder.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { openPopup } from "/static/reuse/popup.js";
import { showToast } from "/static/reuse/toast.js";
import { formatMonthYear } from "/static/reuse/timestamp.js";
import {
    CALENDAR_VIEWS,
    addDays,
    renderCalendarView,
    toDateTimeLocalValue,
} from "./calendar-ui-helpers.js";

function shiftActiveDate(activeDate, selectedView, direction) {
    const shiftedDate = new Date(activeDate);
    if (selectedView === "day") return addDays(shiftedDate, direction);
    if (selectedView === "week") return addDays(shiftedDate, direction * 7);
    if (selectedView === "year") {
        shiftedDate.setFullYear(shiftedDate.getFullYear() + direction);
        return shiftedDate;
    }
    shiftedDate.setMonth(shiftedDate.getMonth() + direction);
    return shiftedDate;
}

function buildEventFormMarkup(i18n, event = {}, slot = {}) {
    return createFormBuilder(
        { i18n, escapeHtml },
        {
            formId: "shared-calendar-event-form",
            formClassName: "shared-calendar-event-form",
            includeSubmitButton: false,
            fields: [
                {
                    name: "title",
                    labelKey: "gateway.calendar.event_title",
                    required: true,
                    value: event.title ?? "",
                },
                {
                    name: "description",
                    labelKey: "gateway.calendar.event_description",
                    value: event.description ?? "",
                },
                {
                    name: "startAt",
                    labelKey: "gateway.calendar.event_start",
                    type: "datetime-local",
                    required: true,
                    value: toDateTimeLocalValue(
                        event.startAt ?? slot.startAt ?? new Date(),
                    ),
                },
                {
                    name: "endAt",
                    labelKey: "gateway.calendar.event_end",
                    type: "datetime-local",
                    required: true,
                    value: toDateTimeLocalValue(
                        event.endAt ??
                            slot.endAt ??
                            new Date(Date.now() + 60 * 60 * 1000),
                    ),
                },
            ],
        },
    ).render();
}

async function mutateSharedEvent({
    calendarId,
    guestAccessToken,
    method,
    body,
}) {
    return fetch(
        `/api/v1/calendar/shared/${encodeURIComponent(calendarId)}/events`,
        {
            method,
            headers: {
                "content-type": "application/json",
                authorization: `Bearer ${guestAccessToken}`,
            },
            body: JSON.stringify(body),
        },
    );
}

async function openEventEditor({
    calendarId,
    event,
    slot,
    guestAccessToken,
    i18n,
    onChanged,
}) {
    let form = null;
    const isEditing = Boolean(event?.id);
    const action = await openPopup({
        title: i18n.t(
            isEditing
                ? "gateway.calendar.edit_event"
                : "gateway.calendar.create_event",
        ),
        body: buildEventFormMarkup(i18n, event, slot),
        actions: [
            {
                id: "save",
                label: i18n.t(
                    isEditing
                        ? "gateway.calendar.save_event"
                        : "gateway.calendar.create_event",
                ),
                variant: "confirm",
            },
            ...(isEditing
                ? [
                      {
                          id: "delete",
                          label: i18n.t("gateway.calendar.delete_event"),
                          variant: "danger",
                      },
                  ]
                : []),
            {
                id: "cancel",
                label: i18n.t("ui.reuse.cancel"),
                variant: "cancel",
            },
        ],
        onOpen: (overlay) => {
            form = overlay.querySelector("#shared-calendar-event-form");
        },
        onAction: (actionId) =>
            actionId !== "save" || form?.reportValidity() === true,
    });
    if (action !== "save" && action !== "delete") return;
    if (!(form instanceof HTMLFormElement)) return;
    const formData = Object.fromEntries(new FormData(form));
    const response = await mutateSharedEvent({
        calendarId,
        guestAccessToken,
        method: action === "delete" ? "DELETE" : isEditing ? "PATCH" : "POST",
        body:
            action === "delete"
                ? { eventId: event.id }
                : { ...formData, eventId: event?.id },
    });
    const successKey =
        action === "delete"
            ? "gateway.calendar.delete_event_success"
            : isEditing
              ? "gateway.calendar.update_event_success"
              : "gateway.calendar.create_event_success";
    const failureKey =
        action === "delete"
            ? "gateway.calendar.delete_event_failed"
            : isEditing
              ? "gateway.calendar.update_event_failed"
              : "gateway.calendar.create_event_failed";
    showToast(i18n.t(response.ok ? successKey : failureKey), {
        variant: response.ok ? "success" : "error",
    });
    if (response.ok) await onChanged();
}

export async function mount(
    root,
    { shareContext, i18n, signal = new AbortController().signal } = {},
) {
    const calendar = shareContext?.payload?.calendar ?? {};
    let events = Array.isArray(shareContext?.payload?.events)
        ? shareContext.payload.events
        : [];
    let selectedView = "day";
    let activeDate = new Date();
    const canWrite =
        shareContext?.grantedCapabilities?.includes("calendar:write");
    const calendarId = String(calendar.id ?? "");
    const guestAccessToken = String(shareContext?.guestAccessToken ?? "");
    root.classList.add("calendar-share-page");
    signal.addEventListener(
        "abort",
        () => root.classList.remove("calendar-share-page"),
        { once: true },
    );

    const reloadEvents = async () => {
        const response = await fetch(
            `/api/v1/calendar/shared/${encodeURIComponent(calendarId)}/events`,
            { headers: { authorization: `Bearer ${guestAccessToken}` } },
        );
        if (!response.ok) {
            showToast(i18n.t("gateway.calendar.load_failed"), {
                variant: "error",
            });
            return;
        }
        const payload = await response.json();
        events = Array.isArray(payload?.data) ? payload.data : [];
        renderCalendar();
    };

    function renderCalendar() {
        const periodLabel =
            selectedView === "year"
                ? String(activeDate.getFullYear())
                : formatMonthYear(activeDate);
        root.innerHTML = `<section class="calendar-section shared-calendar" data-shared-calendar-id="${escapeHtml(calendarId)}">
                <h2 class="shared-calendar-title">${escapeHtml(calendar.name || i18n.t("gateway.calendar.page_title"))}</h2>
                <header class="calendar-view-header">
                    <div class="calendar-view-nav">
                        <button type="button" data-calendar-nav="prev" aria-label="${escapeHtml(i18n.t("gateway.calendar.previous"))}">&lt;</button>
                        <button type="button" data-calendar-nav="today">${escapeHtml(i18n.t("gateway.calendar.today"))}</button>
                        <button type="button" data-calendar-nav="next" aria-label="${escapeHtml(i18n.t("gateway.calendar.next"))}">&gt;</button>
                        <span class="calendar-nav-month-label">${escapeHtml(periodLabel)}</span>
                    </div>
                    <div class="calendar-view-switcher">
                        ${CALENDAR_VIEWS.map((view) => `<button type="button" data-calendar-view="${view}" class="${selectedView === view ? "active" : ""}">${escapeHtml(i18n.t(`gateway.calendar.view_${view}`))}</button>`).join("")}
                    </div>
                </header>
                <div class="calendar-view-canvas">${renderCalendarView(events, selectedView, activeDate, i18n)}</div>
            </section>`;
    }

    root.addEventListener(
        "click",
        (clickEvent) => {
            if (!(clickEvent.target instanceof Element)) return;
            const viewButton = clickEvent.target.closest(
                "[data-calendar-view]",
            );
            if (viewButton instanceof HTMLElement) {
                const requestedView = String(
                    viewButton.dataset.calendarView ?? "",
                );
                if (!CALENDAR_VIEWS.includes(requestedView)) return;
                selectedView = requestedView;
                renderCalendar();
                return;
            }
            const navigationButton = clickEvent.target.closest(
                "[data-calendar-nav]",
            );
            if (navigationButton instanceof HTMLElement) {
                const direction = navigationButton.dataset.calendarNav;
                activeDate =
                    direction === "today"
                        ? new Date()
                        : shiftActiveDate(
                              activeDate,
                              selectedView,
                              direction === "next" ? 1 : -1,
                          );
                renderCalendar();
                return;
            }
            if (!canWrite) return;
            const target = clickEvent.target.closest(
                "[data-calendar-event], [data-timeslot-add]",
            );
            if (!(target instanceof HTMLElement)) return;
            const selectedEvent = events.find(
                (candidate) =>
                    String(candidate.id) === target.dataset.calendarEvent,
            );
            void openEventEditor({
                calendarId,
                event: selectedEvent,
                slot: {
                    startAt: target.dataset.slotStart,
                    endAt: target.dataset.slotEnd,
                },
                guestAccessToken,
                i18n,
                onChanged: reloadEvents,
            });
        },
        { signal },
    );

    renderCalendar();
}

import { createFormBuilder } from "/static/reuse/form-builder.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { openPopup } from "/static/reuse/popup.js";
import { createPageComposer } from "/static/reuse/page-composer/index.js";
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
    let composer;
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
        composer.refresh([buildCalendarElement()]);
        requestAnimationFrame(scrollTimedViewsToCurrentSlot);
    }

    function scrollTimedViewsToCurrentSlot() {
        root.querySelectorAll(".calendar-day-timed-lane").forEach((lane) => {
            if (!(lane instanceof HTMLElement)) return;
            const currentSlot = lane.querySelector(
                ".calendar-timeslot-events--current",
            );
            if (!(currentSlot instanceof HTMLElement)) return;
            lane.scrollTop = Math.max(
                0,
                currentSlot.offsetTop - lane.clientHeight * 0.3,
            );
        });
        root.querySelectorAll("[data-calendar-week-scroll-grid]").forEach(
            (grid) => {
                if (!(grid instanceof HTMLElement)) return;
                const currentSlot = grid.querySelector(
                    ".calendar-week-slot--current-time",
                );
                if (!(currentSlot instanceof HTMLElement)) return;
                grid.scrollTop = Math.max(
                    0,
                    currentSlot.offsetTop - grid.clientHeight * 0.3,
                );
            },
        );
    }

    function buildCalendarElement() {
        const periodLabel =
            selectedView === "year"
                ? String(activeDate.getFullYear())
                : formatMonthYear(activeDate);
        return {
            id: "shared-calendar",
            label: calendar.name || i18n.t("gateway.calendar.page_title"),
            pinned: true,
            gridSize: {
                default: [12, 10],
                min: [8, 5],
                max: ["fill", "fill"],
            },
            render: () => `<section class="calendar-section shared-calendar" data-shared-calendar-id="${escapeHtml(calendarId)}">
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
            </section>`,
        };
    }

    document.addEventListener(
        "click",
        (clickEvent) => {
            if (!(clickEvent.target instanceof Element)) return;
            const sharedCalendar = clickEvent.target.closest(
                "[data-shared-calendar-id]",
            );
            if (!sharedCalendar || !root.contains(sharedCalendar)) return;
            const viewButton = clickEvent.target.closest(
                "[data-calendar-view]",
            );
            if (viewButton instanceof HTMLElement) {
                clickEvent.preventDefault();
                clickEvent.stopPropagation();
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
                clickEvent.preventDefault();
                clickEvent.stopPropagation();
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
        { capture: true, signal },
    );

    composer = createPageComposer(root, {
        allowCustomization: false,
        enableDomParking: true,
        elements: [buildCalendarElement()],
        preferenceKey: "shared-calendar-layout",
        i18n,
        pageContext: {
            title: i18n.t("gateway.calendar.page_title"),
            subtitle: i18n.t("gateway.calendar.page_subtitle"),
        },
        showTopbar: true,
        showNavbar: false,
        showFooter: true,
        showThemeToggle: true,
        persistLayoutPreferences: false,
        frameless: false,
        requireAccountSession: false,
    });

    await composer.init();
    requestAnimationFrame(scrollTimedViewsToCurrentSlot);
}

import {
    renderCalendarViewSwitcher,
    mountCalendarViewControls,
} from "./calendar-view-controls.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";
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

const log = (operation, error) =>
    console.error("Shared calendar request failed.", {
        component: "calendar",
        operation,
        errorName: error instanceof Error ? error.name : "UnknownError",
    });

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

async function openEventEditor({
    calendarId,
    event,
    slot,
    guestAccessToken,
    i18n,
    onChanged,
    canWrite,
    signal,
    client,
}) {
    let form = null;
    const isEditing = Boolean(event?.id);
    const action = await openPopup({
        signal,
        title: i18n.t(
            isEditing
                ? "gateway.calendar.edit_event"
                : "gateway.calendar.create_event",
        ),
        body: buildEventFormMarkup(i18n, event, slot),
        actions: canWrite
            ? [
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
              ]
            : [
                  {
                      id: "close",
                      label: i18n.t("ui.reuse.close"),
                      variant: "neutral",
                  },
              ],
        onOpen: (overlay) => {
            form = overlay.querySelector("#shared-calendar-event-form");
            if (!canWrite) {
                form?.querySelectorAll("input, textarea, select").forEach(
                    (control) => {
                        control.disabled = true;
                    },
                );
            }
        },
        onAction: (actionId) =>
            actionId !== "save" || form?.reportValidity() === true,
    });
    if (signal?.aborted || (action !== "save" && action !== "delete")) return;
    if (!(form instanceof HTMLFormElement)) return;
    const formData = Object.fromEntries(new FormData(form));
    let response;
    try {
        const actionMethod =
            action === "delete"
                ? "deleteEvent"
                : isEditing
                  ? "updateEvent"
                  : "createEvent";
        response = await client[actionMethod]({
            calendarId,
            guestAccessToken,
            signal,
            body:
                action === "delete"
                    ? { eventId: event.id }
                    : { ...formData, eventId: event?.id },
        });
    } catch (error) {
        if (signal?.aborted) return;
        log("mutateEvent", error);
    }
    if (signal?.aborted) return;
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
    showToast(i18n.t(response?.ok ? successKey : failureKey), {
        variant: response?.ok ? "success" : "error",
    });
    if (response?.ok) await onChanged();
}

export async function mount(
    root,
    { shareContext, i18n, signal = new AbortController().signal } = {},
) {
    if (signal.aborted) return;
    const client = uiCtx.capabilities.get("calendar:sharedClient");
    if (!client) throw new Error("calendar_shared_client_unavailable");
    const calendar = shareContext?.payload?.calendar ?? {};
    let events = Array.isArray(shareContext?.payload?.events)
        ? shareContext.payload.events
        : [];
    let selectedView = "month";
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
        try {
            const response = await client.readEvents({
                calendarId,
                guestAccessToken,
                signal,
            });
            if (signal.aborted) return;
            if (!response.ok) {
                showToast(i18n.t("gateway.calendar.load_failed"), {
                    variant: "error",
                });
                return;
            }
            const payload = await response.json();
            if (signal.aborted) return;
            events = Array.isArray(payload?.data) ? payload.data : [];
            renderCalendar();
        } catch (error) {
            if (signal.aborted) return;
            log("reloadEvents", error);
            showToast(i18n.t("gateway.calendar.load_failed"), {
                variant: "error",
            });
        }
    };

    let presentation;
    mountCalendarViewControls(root, {
        views: CALENDAR_VIEWS,
        signal,
        onDateChange(date) {
            activeDate = date;
            renderCalendar();
        },
        onViewChange(view) {
            selectedView = view;
            renderCalendar();
        },
    });

    function renderCalendar() {
        const sharedCalendar = root.querySelector(
            `[data-shared-calendar-id="${CSS.escape(calendarId)}"]`,
        );
        if (!(sharedCalendar instanceof HTMLElement)) return;
        const periodLabel = sharedCalendar.querySelector(
            ".calendar-nav-month-label",
        );
        if (periodLabel instanceof HTMLElement) {
            periodLabel.textContent = resolvePeriodLabel();
        }
        sharedCalendar
            .querySelectorAll("[data-calendar-view]")
            .forEach((button) => {
                button.classList.toggle(
                    "active",
                    button.getAttribute("data-calendar-view") === selectedView,
                );
            });
        const viewSelect = sharedCalendar.querySelector(
            "[data-calendar-view-select]",
        );
        if (viewSelect) viewSelect.value = selectedView;
        const dateInput = sharedCalendar.querySelector("[data-calendar-date]");
        if (dateInput)
            dateInput.value = toDateTimeLocalValue(activeDate).slice(0, 10);
        const canvas = sharedCalendar.querySelector(".calendar-view-canvas");
        if (canvas instanceof HTMLElement) {
            canvas.innerHTML = renderCalendarView(
                events,
                selectedView,
                activeDate,
                i18n,
                null,
                {
                    compact: presentation.layout !== "regular",
                    canCreate: canWrite,
                },
            );
        }
    }

    function resolvePeriodLabel() {
        return selectedView === "year"
            ? String(activeDate.getFullYear())
            : formatMonthYear(activeDate);
    }

    function buildCalendarElement() {
        const periodLabel = resolvePeriodLabel();
        return {
            id: "shared-calendar",
            label: calendar.name || i18n.t("gateway.calendar.page_title"),
            pinned: true,
            gridSize: {
                default: [12, 10],
                min: [1, 3],
                max: ["fill", "fill"],
            },
            responsive: true,
            render: (context) => {
                presentation = context;
                return `<section class="calendar-section shared-calendar" data-shared-calendar-id="${escapeHtml(calendarId)}">
                <h2 class="shared-calendar-title">${escapeHtml(calendar.name || i18n.t("gateway.calendar.page_title"))}</h2>
                <header class="calendar-view-header" data-composer-header>
                    <div class="calendar-view-nav">
                        <button type="button" data-calendar-nav="prev" aria-label="${escapeHtml(i18n.t("gateway.calendar.previous"))}">&lt;</button>
                        <button type="button" data-calendar-nav="today" aria-label="${escapeHtml(i18n.t("gateway.calendar.today"))}" title="${escapeHtml(i18n.t("gateway.calendar.today"))}">${escapeHtml(i18n.t("gateway.calendar.today"))}</button>
                        <button type="button" data-calendar-nav="next" aria-label="${escapeHtml(i18n.t("gateway.calendar.next"))}">&gt;</button>
                        <span class="calendar-nav-month-label">${escapeHtml(periodLabel)}</span>
                    </div>
                    ${renderCalendarViewSwitcher(CALENDAR_VIEWS, selectedView, i18n, activeDate)}
                </header>
                <div class="calendar-view-canvas" data-composer-viewport-body>${renderCalendarView(events, selectedView, activeDate, i18n, null, { compact: presentation.layout !== "regular", canCreate: canWrite })}</div>
            </section>`;
            },
        };
    }

    root.addEventListener(
        "click",
        (clickEvent) => {
            if (!(clickEvent.target instanceof Element)) return;
            const sharedCalendar = clickEvent.target.closest(
                `[data-shared-calendar-id="${CSS.escape(calendarId)}"]`,
            );
            if (!(sharedCalendar instanceof HTMLElement)) return;
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
            const target = clickEvent.target.closest(
                canWrite
                    ? "[data-calendar-event], [data-timeslot-add]"
                    : "[data-calendar-event]",
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
                canWrite,
                signal,
                client,
            });
        },
        { signal },
    );

    composer = createPageComposer(root, {
        signal,
        allowCustomization: false,
        fillViewport: true,
        enableDomParking: false,
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
        enableAccountEnhancements: false,
    });

    await composer.init();
}

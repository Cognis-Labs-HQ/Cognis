import { apiFetch } from "/static/reuse/api-client.js";
import { applyDocumentTitle, createI18n } from "/static/reuse/i18n.js";
import { createPageComposer } from "/static/reuse/page-composer/init.js";
import { mountWhenDirect } from "/static/reuse/page-entry.js";
import { showToast } from "/static/reuse/toast.js";
import { openPopup } from "/static/reuse/popup.js";
import * as calendarUi from "./calendar-ui-helpers.js";

export async function mount(root, { signal } = {}) {
    const i18n = await createI18n({
        componentStringBaseUrls: ["/static/gateways/calendar/ui/languages"],
    });
    applyDocumentTitle(i18n, "gateway.calendar.page_title");

    let calendars = [];
    let selectedCalendarId = calendarUi.parseCalendarSelection();
    let eventsByCalendar = {};
    let canInviteExternal = false;
    let jitsiAvailable = false;
    let selectedView = "month";
    let activeDate = new Date();

    async function reloadState() {
        const calendarState = await calendarUi.fetchCalendarState();
        calendars = calendarState.calendars;
        canInviteExternal = Boolean(calendarState.meta?.canInviteExternal);
        if (!selectedCalendarId && calendars[0]) {
            selectedCalendarId = calendars[0].id;
        }
        const eventEntries = await Promise.all(
            calendars.map(async (calendar) => [
                calendar.id,
                await calendarUi.fetchEvents(calendar.id),
            ]),
        );
        eventsByCalendar = Object.fromEntries(eventEntries);
    }

    try {
        await reloadState();
        jitsiAvailable = await calendarUi.probeJitsiAvailability();
    } catch {
        showToast(i18n.t("gateway.calendar.load_failed"), "error");
    }

    function allUpcomingEvents() {
        return calendarUi.collectUpcomingEvents(
            eventsByCalendar,
            calendars,
            selectedCalendarId,
        );
    }

    function syncCalendarSelectionToUrl() {
        const query = new URLSearchParams(window.location.search);
        if (selectedCalendarId) {
            query.set("calendarId", selectedCalendarId);
        } else {
            query.delete("calendarId");
        }
        const nextPath = `/calendar${query.toString() ? `?${query.toString()}` : ""}`;
        window.history.replaceState(null, "", nextPath);
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
                meetingUrl = await calendarUi.createJitsiMeeting(attendees);
            } catch {
                showToast(
                    i18n.t("gateway.calendar.create_meeting_failed"),
                    "error",
                );
                return false;
            }
        }
        const response = await apiFetch(
            `/api/v1/calendar/calendars/${encodeURIComponent(selectedCalendarId)}/events`,
            {
                method: "POST",
                headers: {
                    "content-type": "application/json",
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
            },
        );
        if (!response.ok) {
            showToast(i18n.t("gateway.calendar.create_event_failed"), "error");
            return false;
        }
        eventsByCalendar[selectedCalendarId] =
            await calendarUi.fetchEvents(selectedCalendarId);
        showToast(i18n.t("gateway.calendar.create_event_success"), "success");
        return true;
    }

    const composer = createPageComposer(root, {
        allowCustomization: true,
        elements: [
            {
                id: "calendar-view",
                label: i18n.t("gateway.calendar.calendar_view"),
                pinned: true,
                gridSize: { default: [12, 9], min: [6, 6], max: "full" },
                render: () => `
          <section class="calendar-section">
            <header class="calendar-view-header">
              <h3>${i18n.t("gateway.calendar.calendar_view")}</h3>
              <div class="calendar-view-switcher">
                ${calendarUi.CALENDAR_VIEWS.map((view) => `<button type="button" data-calendar-view="${view}" class="${selectedView === view ? "active" : ""}">${i18n.t(`gateway.calendar.view_${view}`)}</button>`).join("")}
              </div>
              <div class="calendar-view-nav">
                <button type="button" data-calendar-nav="prev">${i18n.t("gateway.calendar.previous")}</button>
                <button type="button" data-calendar-nav="today">${i18n.t("gateway.calendar.today")}</button>
                <button type="button" data-calendar-nav="next">${i18n.t("gateway.calendar.next")}</button>
              </div>
            </header>
            <div class="calendar-view-canvas">${calendarUi.renderCalendarView(allUpcomingEvents(), selectedView, activeDate, i18n)}</div>
          </section>
        `,
                onRender: () => {
                    root.querySelectorAll("[data-calendar-view]").forEach(
                        (button) => {
                            button.addEventListener(
                                "click",
                                () => {
                                    const nextView = String(
                                        button.getAttribute(
                                            "data-calendar-view",
                                        ) ?? "month",
                                    );
                                    if (
                                        !calendarUi.CALENDAR_VIEWS.includes(
                                            nextView,
                                        )
                                    )
                                        return;
                                    selectedView = nextView;
                                    composer.refresh();
                                },
                                { signal },
                            );
                        },
                    );

                    root.querySelectorAll("[data-calendar-nav]").forEach(
                        (button) => {
                            button.addEventListener(
                                "click",
                                () => {
                                    const nav =
                                        button.getAttribute(
                                            "data-calendar-nav",
                                        );
                                    if (nav === "today") {
                                        activeDate = new Date();
                                    } else if (selectedView === "day") {
                                        activeDate = calendarUi.addDays(
                                            activeDate,
                                            nav === "next" ? 1 : -1,
                                        );
                                    } else if (selectedView === "week") {
                                        activeDate = calendarUi.addDays(
                                            activeDate,
                                            nav === "next" ? 7 : -7,
                                        );
                                    } else if (selectedView === "month") {
                                        activeDate = new Date(
                                            activeDate.getFullYear(),
                                            activeDate.getMonth() +
                                                (nav === "next" ? 1 : -1),
                                            1,
                                        );
                                    } else {
                                        activeDate = new Date(
                                            activeDate.getFullYear() +
                                                (nav === "next" ? 1 : -1),
                                            0,
                                            1,
                                        );
                                    }
                                    composer.refresh();
                                },
                                { signal },
                            );
                        },
                    );

                    root.querySelectorAll("[data-timeslot-add]").forEach(
                        (button) => {
                            button.addEventListener(
                                "click",
                                () =>
                                    openEventComposerPopup({
                                        startAt: String(
                                            button.getAttribute(
                                                "data-slot-start",
                                            ) ?? "",
                                        ),
                                        endAt: String(
                                            button.getAttribute(
                                                "data-slot-end",
                                            ) ?? "",
                                        ),
                                    }),
                                { signal },
                            );
                        },
                    );

                    root.querySelectorAll("[data-timeslot-events]").forEach(
                        (cell) => {
                            cell.addEventListener(
                                "click",
                                (event) => {
                                    if (event.target !== cell) return;
                                    openEventComposerPopup({
                                        startAt: String(
                                            cell.getAttribute(
                                                "data-slot-start",
                                            ) ?? "",
                                        ),
                                        endAt: String(
                                            cell.getAttribute(
                                                "data-slot-end",
                                            ) ?? "",
                                        ),
                                    });
                                },
                                { signal },
                            );
                        },
                    );

                    root.querySelectorAll("[data-month-create-date]").forEach(
                        (button) => {
                            button.addEventListener(
                                "click",
                                () => {
                                    const startAt = new Date(
                                        String(
                                            button.getAttribute(
                                                "data-month-create-date",
                                            ) ?? "",
                                        ),
                                    );
                                    if (Number.isNaN(startAt.getTime())) return;
                                    const endAt = new Date(
                                        startAt.getTime() + 24 * 60 * 60 * 1000,
                                    );
                                    openEventComposerPopup({
                                        startAt:
                                            calendarUi.toDateTimeLocalValue(
                                                startAt,
                                            ),
                                        endAt: calendarUi.toDateTimeLocalValue(
                                            endAt,
                                        ),
                                    });
                                },
                                { signal },
                            );
                        },
                    );

                    root.querySelectorAll("[data-year-month-index]").forEach(
                        (button) => {
                            button.addEventListener(
                                "click",
                                () => {
                                    const monthIndex = Number.parseInt(
                                        String(
                                            button.getAttribute(
                                                "data-year-month-index",
                                            ) ?? "0",
                                        ),
                                        10,
                                    );
                                    activeDate = new Date(
                                        activeDate.getFullYear(),
                                        monthIndex,
                                        1,
                                    );
                                    selectedView = "month";
                                    composer.refresh();
                                },
                                { signal },
                            );
                        },
                    );

                    root.querySelectorAll("[data-week-row-date]").forEach(
                        (button) => {
                            button.addEventListener(
                                "click",
                                () => {
                                    activeDate = new Date(
                                        String(
                                            button.getAttribute(
                                                "data-week-row-date",
                                            ) ?? "",
                                        ),
                                    );
                                    selectedView = "week";
                                    composer.refresh();
                                },
                                { signal },
                            );
                        },
                    );

                    root.querySelectorAll("[data-day-dot-date]").forEach(
                        (button) => {
                            button.addEventListener(
                                "click",
                                () => {
                                    activeDate = new Date(
                                        String(
                                            button.getAttribute(
                                                "data-day-dot-date",
                                            ) ?? "",
                                        ),
                                    );
                                    selectedView = "day";
                                    composer.refresh();
                                },
                                { signal },
                            );
                        },
                    );
                },
            },
            {
                id: "upcoming-events",
                label: i18n.t("gateway.calendar.upcoming_events"),
                defaultHidden: true,
                gridSize: { default: [12, 4], min: [6, 4], max: "full" },
                render: () => `
          <section class="calendar-section">
            <h3>${i18n.t("gateway.calendar.upcoming_events")}</h3>
            ${calendarUi.renderUpcomingEvents(allUpcomingEvents(), i18n)}
          </section>
        `,
            },
        ],
        toolbar: [
            {
                id: "calendar-manager",
                label: i18n.t("gateway.calendar.my_calendars"),
                render: () => `
          <section class="toolbar-section calendar-toolbar-section">
            <header class="calendar-toolbar-heading">
              <h3>${i18n.t("gateway.calendar.my_calendars")}</h3>
              <button type="button" class="calendar-toolbar-add" id="calendar-create-trigger" aria-label="${i18n.t("gateway.calendar.create_calendar")}">+</button>
            </header>
            <div id="calendar-toolbar-list">${calendarUi.renderCalendarToolbarList(calendars, selectedCalendarId, i18n)}</div>
          </section>
          <section class="toolbar-section calendar-toolbar-section">
            <h3>${i18n.t("gateway.calendar.upcoming_summary")}</h3>
            <div id="calendar-toolbar-summary">${calendarUi.renderToolbarSummary(allUpcomingEvents(), i18n)}</div>
          </section>
        `,
            },
        ],
        preferenceKey: "calendar-layout",
        i18n,
        pageContext: {
            title: i18n.t("gateway.calendar.page_title"),
            subtitle: i18n.t("gateway.calendar.page_subtitle"),
        },
        onRender: () => {
            const createTrigger = root.querySelector(
                "#calendar-create-trigger",
            );
            createTrigger?.addEventListener(
                "click",
                () => openCreateCalendarPopup(),
                { signal },
            );

            const toolbarList = root.querySelector("#calendar-toolbar-list");
            if (toolbarList) {
                toolbarList.innerHTML = calendarUi.renderCalendarToolbarList(
                    calendars,
                    selectedCalendarId,
                    i18n,
                );
                if (!toolbarList.dataset.calendarSelectBound) {
                    toolbarList.dataset.calendarSelectBound = "true";
                    toolbarList.addEventListener(
                        "click",
                        (event) => {
                            const button = event.target.closest(
                                "[data-calendar-select]",
                            );
                            if (!(button instanceof HTMLElement)) return;
                            selectedCalendarId = String(
                                button.getAttribute("data-calendar-select") ??
                                    "",
                            ).trim();
                            syncCalendarSelectionToUrl();
                            composer.refresh();
                        },
                        { signal },
                    );
                }
            }
            const toolbarSummary = root.querySelector(
                "#calendar-toolbar-summary",
            );
            if (toolbarSummary) {
                toolbarSummary.innerHTML = calendarUi.renderToolbarSummary(
                    allUpcomingEvents(),
                    i18n,
                );
            }
        },
    });

    async function openEventComposerPopup({ startAt = "", endAt = "" } = {}) {
        const popupBuilder = calendarUi.createEventComposerBuilder({
            i18n,
            canInviteExternal,
            submitLabelKey: "gateway.calendar.create_event",
            defaultValues: { startAt, endAt },
        });
        let popupController = null;
        await openPopup({
            title: i18n.t("gateway.calendar.event_composer"),
            body: () => `
        ${popupBuilder.render()}
        ${jitsiAvailable ? `<label class="calendar-checkbox-row"><input id="calendar-popup-create-meeting" type="checkbox" /> ${i18n.t("gateway.calendar.create_meeting")}</label>` : ""}
      `,
            closeProtection: true,
            actions: [
                {
                    id: "save",
                    label: i18n.t("gateway.calendar.create_event"),
                    variant: "confirm",
                },
                {
                    id: "cancel",
                    label: i18n.t("ui.reuse.cancel"),
                    variant: "cancel",
                },
            ],
            onOpen: (overlay) => {
                const formElement = overlay.querySelector(
                    "#calendar-event-form",
                );
                if (formElement instanceof HTMLFormElement) {
                    popupController = popupBuilder.attach(formElement, {
                        signal,
                    });
                }
            },
            onAction: async (actionId, overlay) => {
                if (actionId !== "save") return true;
                if (!popupController?.validateAll(true)) return false;
                const values = popupController.getValues();
                const createMeeting = Boolean(
                    overlay.querySelector("#calendar-popup-create-meeting")
                        ?.checked,
                );
                const created = await submitEvent({
                    title: values.title,
                    description: values.description,
                    startAt: values.startAt,
                    endAt: values.endAt,
                    attendees: calendarUi.splitHandles(values.attendees),
                    inviteEmails: canInviteExternal
                        ? calendarUi.splitInviteEmails(values.inviteEmails)
                        : [],
                    createMeeting,
                });
                if (!created) return false;
                composer.refresh();
                return true;
            },
        });
    }

    async function openCreateCalendarPopup() {
        let popupNameValue = "";
        let popupVisibilityValue = "private";
        let popupColorValue = "#1f8ceb";
        await openPopup({
            title: i18n.t("gateway.calendar.create_calendar"),
            body: () => `
        <form id="calendar-create-popup-form" class="calendar-create-form">
          <div class="calendar-create-row">
            <input id="calendar-popup-color" type="color" value="${popupColorValue}" class="calendar-color-picker-bare" />
            <input id="calendar-popup-name" type="text" placeholder="${i18n.t("gateway.calendar.calendar_name_placeholder")}" value="${popupNameValue}" required />
            <select id="calendar-popup-visibility">
              <option value="private"${popupVisibilityValue === "private" ? " selected" : ""}>${i18n.t("gateway.calendar.visibility_private")}</option>
              <option value="public"${popupVisibilityValue === "public" ? " selected" : ""}>${i18n.t("gateway.calendar.visibility_public")}</option>
            </select>
          </div>
        </form>
      `,
            closeProtection: false,
            actions: [
                {
                    id: "save",
                    label: i18n.t("gateway.calendar.create_calendar"),
                    variant: "confirm",
                },
                {
                    id: "cancel",
                    label: i18n.t("ui.reuse.cancel"),
                    variant: "cancel",
                },
            ],
            onAction: async (actionId, overlay) => {
                if (actionId !== "save") return true;
                const name = String(
                    overlay.querySelector("#calendar-popup-name")?.value ?? "",
                ).trim();
                const visibility = String(
                    overlay.querySelector("#calendar-popup-visibility")
                        ?.value ?? "private",
                );
                const color = calendarUi.normalizeHexColor(
                    overlay.querySelector("#calendar-popup-color")?.value,
                );
                if (!name) return false;
                const response = await apiFetch("/api/v1/calendar/calendars", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ name, visibility, color }),
                });
                if (!response.ok) {
                    showToast(
                        i18n.t("gateway.calendar.create_calendar_failed"),
                        "error",
                    );
                    return false;
                }
                await reloadState();
                syncCalendarSelectionToUrl();
                showToast(
                    i18n.t("gateway.calendar.create_calendar_success"),
                    "success",
                );
                composer.refresh();
                return true;
            },
        });
    }

    await composer.init();
}

await mountWhenDirect(mount);

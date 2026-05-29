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
    let floatingCreator = null;

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

    const eventComposerBuilder = calendarUi.createEventComposerBuilder({
        i18n,
        canInviteExternal,
        submitLabelKey: "gateway.calendar.create_event",
    });

    function selectedEvents() {
        return selectedCalendarId
            ? (eventsByCalendar[selectedCalendarId] ?? [])
            : [];
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
            ${calendarUi.renderFloatingCreatorPanel(floatingCreator, i18n)}
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
                                    floatingCreator = null;
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
                                    floatingCreator = null;
                                    composer.refresh();
                                },
                                { signal },
                            );
                        },
                    );

                    root.querySelectorAll("[data-slot-start]").forEach(
                        (button) => {
                            button.addEventListener(
                                "click",
                                () => {
                                    if (
                                        selectedView === "year" ||
                                        selectedView === "month"
                                    )
                                        return;
                                    const startAt = new Date(
                                        String(
                                            button.getAttribute(
                                                "data-slot-start",
                                            ) ?? "",
                                        ),
                                    );
                                    const endAt = new Date(
                                        String(
                                            button.getAttribute(
                                                "data-slot-end",
                                            ) ?? "",
                                        ),
                                    );
                                    if (
                                        Number.isNaN(startAt.getTime()) ||
                                        Number.isNaN(endAt.getTime())
                                    )
                                        return;
                                    floatingCreator = { startAt, endAt };
                                    composer.refresh();
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
                                    floatingCreator = { startAt, endAt };
                                    composer.refresh();
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

                    const floatingSubmit = root.querySelector(
                        '[data-floating-create="submit"]',
                    );
                    floatingSubmit?.addEventListener(
                        "click",
                        async () => {
                            const title = String(
                                root.querySelector("#calendar-floating-title")
                                    ?.value ?? "",
                            ).trim();
                            const startAt = String(
                                root.querySelector("#calendar-floating-start")
                                    ?.value ?? "",
                            ).trim();
                            const endAt = String(
                                root.querySelector("#calendar-floating-end")
                                    ?.value ?? "",
                            ).trim();
                            if (!title || !startAt || !endAt) return;
                            const created = await submitEvent({
                                title,
                                description: "",
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

                    const floatingClose = root.querySelector(
                        '[data-floating-create="close"]',
                    );
                    floatingClose?.addEventListener(
                        "click",
                        () => {
                            floatingCreator = null;
                            composer.refresh();
                        },
                        { signal },
                    );

                    const floatingDetails = root.querySelector(
                        '[data-floating-create="details"]',
                    );
                    floatingDetails?.addEventListener(
                        "click",
                        async () => {
                            if (!floatingCreator) return;
                            const detailBuilder =
                                calendarUi.createEventComposerBuilder({
                                    i18n,
                                    canInviteExternal,
                                    submitLabelKey:
                                        "gateway.calendar.create_event",
                                    defaultValues: {
                                        startAt:
                                            calendarUi.toDateTimeLocalValue(
                                                floatingCreator.startAt,
                                            ),
                                        endAt: calendarUi.toDateTimeLocalValue(
                                            floatingCreator.endAt,
                                        ),
                                    },
                                });
                            let detailController = null;
                            await openPopup({
                                title: i18n.t(
                                    "gateway.calendar.event_composer",
                                ),
                                body: () => `
                  ${detailBuilder.render()}
                  ${jitsiAvailable ? `<label class="calendar-checkbox-row"><input id="calendar-popup-create-meeting" type="checkbox" /> ${i18n.t("gateway.calendar.create_meeting")}</label>` : ""}
                `,
                                closeProtection: true,
                                actions: [
                                    {
                                        id: "save",
                                        label: i18n.t(
                                            "gateway.calendar.create_event",
                                        ),
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
                                    if (
                                        formElement instanceof HTMLFormElement
                                    ) {
                                        detailController = detailBuilder.attach(
                                            formElement,
                                            { signal },
                                        );
                                    }
                                },
                                onAction: async (actionId, overlay) => {
                                    if (actionId !== "save") return true;
                                    if (!detailController?.validateAll(true))
                                        return false;
                                    const values = detailController.getValues();
                                    const createMeeting = Boolean(
                                        overlay.querySelector(
                                            "#calendar-popup-create-meeting",
                                        )?.checked,
                                    );
                                    const created = await submitEvent({
                                        title: values.title,
                                        description: values.description,
                                        startAt: values.startAt,
                                        endAt: values.endAt,
                                        attendees: calendarUi.splitHandles(
                                            values.attendees,
                                        ),
                                        inviteEmails: canInviteExternal
                                            ? calendarUi.splitInviteEmails(
                                                  values.inviteEmails,
                                              )
                                            : [],
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
                id: "event-composer",
                label: i18n.t("gateway.calendar.event_composer"),
                gridSize: { default: [12, 5], min: [6, 4], max: "full" },
                render: () => `
          <section class="calendar-section">
            <h3>${i18n.t("gateway.calendar.event_composer")}</h3>
            ${eventComposerBuilder.render()}
            ${jitsiAvailable ? `<label class="calendar-checkbox-row"><input id="calendar-event-create-meeting" type="checkbox" /> ${i18n.t("gateway.calendar.create_meeting")}</label>` : ""}
          </section>
        `,
                onRender: () => {
                    const eventForm = root.querySelector(
                        "#calendar-event-form",
                    );
                    if (!(eventForm instanceof HTMLFormElement)) return;
                    const controller = eventComposerBuilder.attach(eventForm, {
                        signal,
                    });
                    eventForm.addEventListener(
                        "submit",
                        async (event) => {
                            event.preventDefault();
                            if (!controller.validateAll(true)) return;
                            const values = controller.getValues();
                            const created = await submitEvent({
                                title: values.title,
                                description: values.description,
                                startAt: values.startAt,
                                endAt: values.endAt,
                                attendees: calendarUi.splitHandles(
                                    values.attendees,
                                ),
                                inviteEmails: canInviteExternal
                                    ? calendarUi.splitInviteEmails(
                                          values.inviteEmails,
                                      )
                                    : [],
                                createMeeting: Boolean(
                                    root.querySelector(
                                        "#calendar-event-create-meeting",
                                    )?.checked,
                                ),
                            });
                            if (!created) return;
                            composer.refresh();
                        },
                        { signal },
                    );
                },
            },
            {
                id: "upcoming-events",
                label: i18n.t("gateway.calendar.upcoming_events"),
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
            <h3>${i18n.t("gateway.calendar.my_calendars")}</h3>
            <form id="calendar-create-form" class="calendar-inline-form">
              <input id="calendar-name" type="text" placeholder="${i18n.t("gateway.calendar.calendar_name_placeholder")}" required />
              <select id="calendar-visibility">
                <option value="private">${i18n.t("gateway.calendar.visibility_private")}</option>
                <option value="public">${i18n.t("gateway.calendar.visibility_public")}</option>
              </select>
              <label class="calendar-color-field"><span>${i18n.t("gateway.calendar.calendar_color")}</span><input id="calendar-color" type="color" value="#1f8ceb" /></label>
              <button type="submit" class="btn-confirm">${i18n.t("gateway.calendar.create_calendar")}</button>
            </form>
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
            const createForm = root.querySelector("#calendar-create-form");
            createForm?.addEventListener(
                "submit",
                async (event) => {
                    event.preventDefault();
                    const name = String(
                        root.querySelector("#calendar-name")?.value ?? "",
                    ).trim();
                    const visibility = String(
                        root.querySelector("#calendar-visibility")?.value ??
                            "private",
                    );
                    const color = calendarUi.normalizeHexColor(
                        root.querySelector("#calendar-color")?.value,
                    );
                    if (!name) return;
                    const response = await apiFetch(
                        "/api/v1/calendar/calendars",
                        {
                            method: "POST",
                            headers: {
                                "content-type": "application/json",
                            },
                            body: JSON.stringify({ name, visibility, color }),
                        },
                    );
                    if (!response.ok) {
                        showToast(
                            i18n.t("gateway.calendar.create_calendar_failed"),
                            "error",
                        );
                        return;
                    }
                    await reloadState();
                    syncCalendarSelectionToUrl();
                    showToast(
                        i18n.t("gateway.calendar.create_calendar_success"),
                        "success",
                    );
                    composer.refresh();
                },
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

    await composer.init();
}

await mountWhenDirect(mount);

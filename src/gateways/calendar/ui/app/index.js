import { apiFetch } from "/static/reuse/api-client.js";
import { applyDocumentTitle, createI18n } from "/static/reuse/i18n.js";
import { createPageComposer } from "/static/reuse/page-composer/index.js";
import { registerSearchIndex } from "/static/reuse/search-util/popup.js";
import { formatDateTime } from "/static/reuse/timestamp.js";
import { showToast } from "/static/reuse/toast.js";
import { openPopup } from "/static/reuse/popup.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { createCalendarPopupManager } from "./popup-manager.js";
import * as calendarUi from "../calendar-ui-helpers.js";

const SELECTED_VIEW_STORAGE_KEY = "calendar.selectedView";

export async function mount(root, { signal } = {}) {
    const i18n = await createI18n({
        componentStringBaseUrls: ["/static/gateways/calendar/ui/languages"],
    });
    applyDocumentTitle(i18n, "gateway.calendar.page_title");

    let calendars = [];
    const routeCalendarId = calendarUi.parseCalendarSelection();
    const routeEventId = calendarUi.parseEventSelection();
    let selectedCalendarId = routeCalendarId;
    let selectedEventId = routeEventId;
    let eventsByCalendar = {};
    let pendingInvitations = [];
    let canInviteExternal = false;
    let currentAccountId = "";
    let jitsiAvailable = false;
    let selectedView = "month";
    let activeDate = new Date();
    let composer = null;

    function loadSelectedViewPreference() {
        try {
            const stored = window.localStorage.getItem(
                SELECTED_VIEW_STORAGE_KEY,
            );
            if (
                stored &&
                calendarUi.CALENDAR_VIEWS.includes(String(stored).trim())
            ) {
                return String(stored).trim();
            }
        } catch {}
        return "month";
    }

    function setSelectedView(nextView) {
        if (!calendarUi.CALENDAR_VIEWS.includes(nextView)) return;
        selectedView = nextView;
        try {
            window.localStorage.setItem(SELECTED_VIEW_STORAGE_KEY, nextView);
        } catch {}
    }

    selectedView = loadSelectedViewPreference();

    function refreshCalendarComposer() {
        root.querySelectorAll(
            '[data-composer-element="calendar-view"]',
        ).forEach((card) => {
            if (!card.classList.contains("composer-cell")) {
                card.remove();
            }
        });
        composer?.refresh();
    }

    function ensureSelectedCalendarId() {
        const hasSelectedCalendar =
            selectedCalendarId &&
            calendars.some((calendar) => calendar.id === selectedCalendarId);
        if (!hasSelectedCalendar) {
            selectedCalendarId = calendars[0]?.id ?? "";
        }
    }

    function syncRouteSelection() {
        const query = new URLSearchParams(window.location.search);
        if (selectedCalendarId) {
            query.set("calendarId", selectedCalendarId);
        } else {
            query.delete("calendarId");
        }
        if (selectedEventId) {
            query.set("eventId", selectedEventId);
        } else {
            query.delete("eventId");
        }
        const nextPath = `/calendar${query.toString() ? `?${query.toString()}` : ""}`;
        window.history.replaceState(null, "", nextPath);
    }

    function normalizeDateTimeInputValue(value) {
        const trimmed = String(value ?? "").trim();
        if (!trimmed) return "";
        if (
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/.test(
                trimmed,
            )
        ) {
            return trimmed.slice(0, 16);
        }
        const parsed = new Date(trimmed);
        if (Number.isNaN(parsed.getTime())) return "";
        return calendarUi.toDateTimeLocalValue(parsed);
    }

    async function reloadState() {
        const calendarState = await calendarUi.fetchCalendarState();
        calendars = calendarState.calendars;
        canInviteExternal = Boolean(calendarState.meta?.canInviteExternal);
        currentAccountId = String(calendarState.meta?.currentAccountId ?? "");
        jitsiAvailable = Boolean(calendarState.meta?.jitsiAvailable);
        ensureSelectedCalendarId();
        const eventResults = await Promise.allSettled(
            calendars.map(async (calendar) => [
                calendar.id,
                await calendarUi.fetchEvents(calendar.id),
            ]),
        );
        eventsByCalendar = Object.fromEntries(
            eventResults
                .filter((result) => result.status === "fulfilled")
                .map((result) => result.value),
        );
        try {
            pendingInvitations = await calendarUi.fetchInvitations();
        } catch (err) {
            console.warn("Failed to load pending invitations:", err);
            pendingInvitations = [];
        }
    }

    try {
        await reloadState();
    } catch {
        showToast(i18n.t("gateway.calendar.load_failed"), "error");
    }

    function allCalendarEvents() {
        const calendarById = new Map(
            calendars.map((calendar) => [calendar.id, calendar]),
        );
        return Object.entries(eventsByCalendar)
            .flatMap(([calendarId, events]) =>
                events.map((event) => ({
                    ...event,
                    calendarId,
                    calendarColor: calendarUi.normalizeHexColor(
                        calendarById.get(calendarId)?.color,
                    ),
                    calendarName: String(
                        calendarById.get(calendarId)?.name ?? "",
                    ),
                })),
            )
            .sort((left, right) => left.startAt.localeCompare(right.startAt));
    }

    function collectCalendarSearchGroups() {
        const items = allCalendarEvents().map((event) => {
            const timeLabel = `${formatDateTime(event.startAt)} - ${formatDateTime(event.endAt)}`;
            return {
                id: `calendar-event:${event.calendarId}:${event.id}`,
                label: event.title,
                description: [timeLabel, event.calendarName]
                    .filter(Boolean)
                    .join(" · "),
                url: `/calendar?calendarId=${encodeURIComponent(event.calendarId)}&eventId=${encodeURIComponent(event.id)}`,
                resultClass: "event",
                searchText: [
                    event.title,
                    timeLabel,
                    event.calendarName,
                    event.location,
                    event.description,
                    event.startAt,
                    event.endAt,
                ]
                    .filter(Boolean)
                    .join(" "),
            };
        });
        return items.length ? [{ category: "Calendar Events", items }] : [];
    }

    function allUpcomingEvents() {
        return calendarUi.collectUpcomingEvents(
            eventsByCalendar,
            calendars,
            "",
            currentAccountId,
        );
    }

    function allPendingEvents() {
        return calendarUi.collectPendingEvents(
            eventsByCalendar,
            calendars,
            "",
            currentAccountId,
            pendingInvitations,
        );
    }

    registerSearchIndex("calendar-events", collectCalendarSearchGroups);

    function formatMonthYearLabel(date) {
        return new Date(date).toLocaleDateString(undefined, {
            month: "long",
            year: "numeric",
        });
    }

    function formatYearLabel(date) {
        return String(date.getFullYear());
    }

    function getTodayNavLabel(view) {
        if (view === "week") return i18n.t("gateway.calendar.this_week");
        if (view === "month") return i18n.t("gateway.calendar.this_month");
        if (view === "year") return i18n.t("gateway.calendar.this_year");
        return i18n.t("gateway.calendar.today");
    }

    function syncWeekViewLayout() {
        const weekLayouts = Array.from(
            root.querySelectorAll("[data-calendar-week-view]"),
        )
            .map((weekView) => {
                const scrollGrid = weekView.querySelector(
                    "[data-calendar-week-scroll-grid]",
                );
                if (!(scrollGrid instanceof HTMLElement)) return null;
                const measuredScrollbarWidth =
                    scrollGrid.offsetWidth - scrollGrid.clientWidth;
                return {
                    weekView,
                    scrollbarWidth: Math.max(0, measuredScrollbarWidth),
                };
            })
            .filter(Boolean);
        weekLayouts.forEach(({ weekView, scrollbarWidth }) => {
            weekView.style.setProperty(
                "--calendar-week-scrollbar-width",
                `${scrollbarWidth}px`,
            );
        });
    }

    function scrollTimedViewsToCurrentSlot() {
        root.querySelectorAll(".calendar-day-timed-lane").forEach((lane) => {
            if (!(lane instanceof HTMLElement)) return;
            const currentSlot = lane.querySelector(
                ".calendar-timeslot-events--current",
            );
            if (!(currentSlot instanceof HTMLElement)) return;
            const targetOffset =
                currentSlot.offsetTop - lane.clientHeight * 0.3;
            lane.scrollTop = Math.max(0, targetOffset);
        });

        root.querySelectorAll("[data-calendar-week-scroll-grid]").forEach(
            (scrollGrid) => {
                if (!(scrollGrid instanceof HTMLElement)) return;
                const currentSlot = scrollGrid.querySelector(
                    ".calendar-week-slot--current-time",
                );
                if (!(currentSlot instanceof HTMLElement)) return;
                const targetOffset =
                    currentSlot.offsetTop - scrollGrid.clientHeight * 0.3;
                scrollGrid.scrollTop = Math.max(0, targetOffset);
            },
        );
    }

    const popupManager = createCalendarPopupManager({
        root,
        signal,
        i18n,
        calendarUi,
        apiFetch,
        showToast,
        openPopup,
        escapeHtml,
        normalizeDateTimeInputValue,
        getCalendars: () => calendars,
        getSelectedCalendarId: () => selectedCalendarId,
        setSelectedCalendarId: (value) => {
            selectedCalendarId = value;
        },
        setSelectedEventId: (value) => {
            selectedEventId = value;
        },
        getEventsByCalendar: () => eventsByCalendar,
        getCanInviteExternal: () => canInviteExternal,
        getCurrentAccountId: () => currentAccountId,
        getJitsiAvailable: () => jitsiAvailable,
        reloadState,
        syncRouteSelection,
        refreshComposer: refreshCalendarComposer,
    });

    const {
        bindViewInteractions,
        openEventComposerPopup,
        openEventPopup,
        openCalendarEditPopup,
    } = popupManager;

    composer = createPageComposer(root, {
        allowCustomization: true,
        elements: [
            {
                id: "calendar-view",
                label: i18n.t("gateway.calendar.calendar_view"),
                pinned: true,
                gridSize: { default: [12, 9], min: [6, 6], max: "full" },
                render: () => {
                    const weekLabel =
                        selectedView === "week"
                            ? ` · ${i18n.t("gateway.calendar.week_number_prefix")}${calendarUi.getISOWeekNumber(activeDate)}`
                            : "";
                    const periodLabel =
                        selectedView === "year"
                            ? escapeHtml(formatYearLabel(activeDate))
                            : `${escapeHtml(formatMonthYearLabel(activeDate))}${escapeHtml(weekLabel)}`;
                    return `
          <section class="calendar-section">
            <header class="calendar-view-header">
              <div class="calendar-view-nav">
                <button type="button" data-calendar-nav="prev" aria-label="${escapeHtml(i18n.t("gateway.calendar.previous"))}">&lt;</button>
                <button type="button" data-calendar-nav="today">${escapeHtml(getTodayNavLabel(selectedView))}</button>
                <button type="button" data-calendar-nav="next" aria-label="${escapeHtml(i18n.t("gateway.calendar.next"))}">&gt;</button>
                <span class="calendar-nav-month-label">${periodLabel}</span>
              </div>
              <div class="calendar-view-switcher">
                ${calendarUi.CALENDAR_VIEWS.map((view) => `<button type="button" data-calendar-view="${view}" class="${selectedView === view ? "active" : ""}">${i18n.t(`gateway.calendar.view_${view}`)}</button>`).join("")}
              </div>
            </header>
            <div class="calendar-view-canvas">${calendarUi.renderCalendarView(allCalendarEvents(), selectedView, activeDate, i18n, currentAccountId)}</div>
          </section>
        `;
                },
                onRender: () => {
                    syncWeekViewLayout();
                    requestAnimationFrame(scrollTimedViewsToCurrentSlot);
                    window.addEventListener("resize", syncWeekViewLayout, {
                        signal,
                    });

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
                                    ) {
                                        return;
                                    }
                                    setSelectedView(nextView);
                                    refreshCalendarComposer();
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
                                    refreshCalendarComposer();
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
                                    if (
                                        event.target instanceof Element &&
                                        event.target.closest(
                                            "[data-calendar-event], [data-timeslot-add]",
                                        )
                                    ) {
                                        return;
                                    }
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
                                    setSelectedView("month");
                                    refreshCalendarComposer();
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
                                    setSelectedView("week");
                                    refreshCalendarComposer();
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
                                    setSelectedView("day");
                                    refreshCalendarComposer();
                                },
                                { signal },
                            );
                        },
                    );
                },
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
            <div id="calendar-toolbar-summary">${calendarUi.renderPendingEvents(allPendingEvents(), i18n)}</div>
          </section>
        `,
            },
            {
                id: "upcoming-events",
                label: i18n.t("gateway.calendar.upcoming_events"),
                render: () => `
          <section class="toolbar-section calendar-toolbar-section">
            <header class="calendar-toolbar-heading">
              <h3>${i18n.t("gateway.calendar.upcoming_events")}</h3>
            </header>
            <div id="calendar-toolbar-upcoming">${calendarUi.renderToolbarSummary(allUpcomingEvents(), /* pendingEvents */ [], i18n)}</div>
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
            bindViewInteractions();
            const createTrigger = root.querySelector(
                "#calendar-create-trigger",
            );
            if (createTrigger && !createTrigger.dataset.calendarCreateBound) {
                createTrigger.dataset.calendarCreateBound = "true";
                createTrigger.addEventListener(
                    "click",
                    () => openCreateCalendarPopup(),
                    { signal },
                );
            }

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
                                "[data-calendar-edit]",
                            );
                            if (!(button instanceof HTMLElement)) return;
                            const calendarId = String(
                                button.getAttribute("data-calendar-edit") ?? "",
                            ).trim();
                            const calendar = calendars.find(
                                (c) => c.id === calendarId,
                            );
                            if (!calendar) return;
                            selectedCalendarId = calendarId;
                            selectedEventId = "";
                            syncRouteSelection();
                            refreshCalendarComposer();
                            openCalendarEditPopup(calendar);
                        },
                        { signal },
                    );
                }
            }
            const toolbarSummary = root.querySelector(
                "#calendar-toolbar-summary",
            );
            if (toolbarSummary) {
                toolbarSummary.innerHTML = calendarUi.renderPendingEvents(
                    allPendingEvents(),
                    i18n,
                );
            }
            const toolbarUpcoming = root.querySelector(
                "#calendar-toolbar-upcoming",
            );
            if (toolbarUpcoming) {
                toolbarUpcoming.innerHTML = calendarUi.renderToolbarSummary(
                    allUpcomingEvents(),
                    /* pendingEvents */ [],
                    i18n,
                );
            }
        },
    });

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
            <input id="calendar-popup-name" type="text" maxlength="30" placeholder="${i18n.t("gateway.calendar.calendar_name_placeholder")}" value="${popupNameValue}" required />
          </div>
          <div class="calendar-visibility-row">
            <p class="calendar-share-label">${escapeHtml(i18n.t("gateway.calendar.visibility_heading"))}</p>
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
                syncRouteSelection();
                showToast(
                    i18n.t("gateway.calendar.create_calendar_success"),
                    "success",
                );
                refreshCalendarComposer();
                return true;
            },
        });
    }

    await composer.init();
    syncRouteSelection();
    if (routeCalendarId && routeEventId) {
        void openEventPopup(routeCalendarId, routeEventId);
    }
}

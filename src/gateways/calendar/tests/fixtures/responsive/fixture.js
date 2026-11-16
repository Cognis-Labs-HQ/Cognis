import { beginPageLoading } from "/static/reuse/page-entry.js";
import { createPageComposer } from "/static/reuse/page-composer/index.js";
import { createI18n } from "/static/reuse/i18n.js";
import {
    renderCalendarView,
    CALENDAR_VIEWS,
} from "/static/gateways/calendar/ui/calendar-ui-helpers.js";
import { renderCalendarViewSwitcher } from "/static/gateways/calendar/ui/calendar-view-controls.js";

const finishLoading = beginPageLoading();
const data = await (await fetch("/data.json")).json();
const i18n = await createI18n({
    componentStringBaseUrls: ["/static/gateways/calendar/ui/languages"],
});
const lifetime = new AbortController();
const root = document.querySelector("#app");
let view = "month";
const composer = createPageComposer(root, {
    i18n,
    signal: lifetime.signal,
    allowCustomization: false,
    fillViewport: true,
    requireAccountSession: false,
    enableAccountEnhancements: false,
    toolbarScrollable: true,
    preferenceKey: "calendar-responsive",
    pageContext: {
        title: i18n.t("gateway.calendar.page_title"),
        subtitle: i18n.t("gateway.calendar.page_subtitle"),
    },
    toolbar: [
        {
            id: "calendars",
            render: () => `<h3>${i18n.t("gateway.calendar.my_calendars")}</h3>`,
        },
    ],
    elements: [
        {
            id: "calendar",
            gridSize: { default: [12, 8], min: [4, 4], max: "full" },
            responsive: true,
            render: (presentation) => `
      <section class="calendar-section">
        <header class="calendar-view-header" data-composer-header>
          ${renderCalendarViewSwitcher(CALENDAR_VIEWS, view, i18n, new Date(data.date))}
        </header>
        <div class="calendar-view-canvas">
          ${renderCalendarView(data.events, view, new Date(data.date), i18n, "fixture", { compact: presentation.layout !== "regular" })}
        </div>
      </section>`,
        },
    ],
});
await composer.init();
root.addEventListener(
    "change",
    (event) => {
        if (event.target.matches("[data-calendar-view-select]")) {
            view = event.target.value;
            composer.refreshElements(["calendar"]);
        }
    },
    { signal: lifetime.signal },
);
root.addEventListener(
    "click",
    (event) => {
        const button = event.target.closest("[data-calendar-view]");
        if (button) {
            view = button.dataset.calendarView;
            composer.refreshElements(["calendar"]);
        }
    },
    { signal: lifetime.signal },
);
window.fixture = { composer, lifetime, data, i18n };
finishLoading();
window.fixtureReady = true;

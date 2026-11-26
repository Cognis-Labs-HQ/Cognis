import { uiCtx } from "/static/reuse/ui-ctx.js";
import { mount as mountSharedCalendar } from "/static/gateways/calendar/ui/share-renderer.js";
import { beginPageLoading } from "/static/reuse/page-entry.js";
import { createPageComposer } from "/static/reuse/page-composer/index.js";
import { createI18n, applyStaticTranslations } from "/static/reuse/i18n.js";
import {
    renderCalendarView,
    CALENDAR_VIEWS,
    renderCalendarToolbarList,
} from "/static/gateways/calendar/ui/calendar-ui-helpers.js";
import {
    renderCalendarViewSwitcher,
    renderCalendarNavigation,
    mountCalendarViewControls,
} from "/static/gateways/calendar/ui/calendar-view-controls.js";

const finishLoading = beginPageLoading();
const data = await (await fetch("/data.json")).json();
const i18n = await createI18n({
    componentStringBaseUrls: ["/static/gateways/calendar/ui/languages"],
});
const lifetime = new AbortController();
const root = document.querySelector("#app");
if (new URLSearchParams(location.search).has("shared")) {
    uiCtx.capabilities.contribute("calendar:sharedClient", {
        async readEvents({ signal }) {
            signal?.throwIfAborted();
            return { ok: true, data: { events: data.events } };
        },
    });
    await mountSharedCalendar(root, {
        i18n,
        signal: lifetime.signal,
        shareContext: {
            payload: { calendar: data.calendars[0], events: data.events },
            grantedCapabilities: ["calendar:read"],
        },
    });
    window.fixture = { lifetime, data, i18n };
    finishLoading();
    window.fixtureReady = true;
} else {
    let view = "month";
    let activeDate = new Date(data.date);
    function renderSidebar(id = "calendar-sidebar") {
        const content = document
            .querySelector(`#${id}`)
            .content.cloneNode(true);
        const list = content.querySelector("[data-fixture-calendar-list]");
        if (list)
            list.innerHTML = renderCalendarToolbarList(
                data.calendars,
                data.calendars[0].id,
                i18n,
            );
        applyStaticTranslations(i18n, content);
        const holder = document.createElement("div");
        holder.append(content);
        return holder.innerHTML;
    }

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
                render: () => renderSidebar(),
            },
            {
                id: "upcoming",
                render: () => renderSidebar("calendar-upcoming"),
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
          ${renderCalendarNavigation(view, activeDate, i18n)}
          ${renderCalendarViewSwitcher(CALENDAR_VIEWS, view, i18n, activeDate)}
        </header>
        <div class="calendar-view-canvas" data-composer-viewport-body>
          ${renderCalendarView(data.events, view, activeDate, i18n, "fixture", { compact: presentation.layout !== "regular" })}
        </div>
      </section>`,
            },
        ],
    });
    await composer.init();
    mountCalendarViewControls(root, {
        views: CALENDAR_VIEWS,
        getActiveDate: () => activeDate,
        getSelectedView: () => view,
        signal: lifetime.signal,
        onDateChange(date) {
            activeDate = date;
            composer.refreshElements(["calendar"]);
        },
        onViewChange(nextView, date) {
            if (date) activeDate = date;
            view = nextView;
            composer.refreshElements(["calendar"]);
        },
    });
    window.fixture = { composer, lifetime, data, i18n };
    finishLoading();
    window.fixtureReady = true;
}

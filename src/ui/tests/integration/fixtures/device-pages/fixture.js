import { beginPageLoading } from "/static/reuse/page-entry.js";
import { createPageComposer } from "/static/reuse/page-composer/index.js";
import { createI18n } from "/static/reuse/i18n.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import {
    renderCalendarView,
    CALENDAR_VIEWS,
} from "/static/gateways/calendar/ui/calendar-ui-helpers.js";
import { renderCalendarViewSwitcher } from "/static/gateways/calendar/ui/calendar-view-controls.js";
import {
    renderThreadHeader,
    renderRoomList,
} from "/static/adapters/social/messages/room-render.js";
const finishLoading = beginPageLoading();
const data = await (await fetch("/data.json")).json();
const mode = new URL(location.href).searchParams.get("mode") || "calendar";
const i18n = await createI18n({
    componentStringBaseUrls: [
        "/static/gateways/calendar/ui/languages",
        "/static/adapters/social/messages/languages",
    ],
});
uiCtx.capabilities.contribute("ui:profileAvatarRenderer", {
    getInitials: () => "AS",
    getInitialsColor: () => "#285",
    isUnavailable: () => false,
    buildMarkup: () => '<span class="messages-thread-avatar">AS</span>',
});
localStorage.setItem("cognis_account", "fixture");
const lifetime = new AbortController();
const root = document.querySelector("#app");
let view = "month";
let mounted = 0;
let presentation;
const calendarBody = () =>
    renderCalendarView(
        data.events,
        view,
        new Date(data.date),
        i18n,
        "fixture",
        { compact: presentation.layout !== "regular" },
    );
const sidebar = renderRoomList({
    rooms: [data.room],
    currentAccountId: "fixture",
    selectedRoomId: "room-one",
    i18n,
    formatRoomListAvatar: () => "",
});
const composer = createPageComposer(root, {
    i18n,
    signal: lifetime.signal,
    allowCustomization: false,
    fillViewport: true,
    requireAccountSession: false,
    enableAccountEnhancements: false,
    toolbarScrollable: true,
    preferenceKey: "device-page-" + mode,
    pageContext: {
        title: i18n.t(
            mode === "calendar"
                ? "gateway.calendar.page_title"
                : "ui.reuse.messages",
        ),
        subtitle: "",
    },
    toolbar: [
        {
            id: "rooms",
            render: () => `<ul class="messages-rooms-list">${sidebar}</ul>`,
        },
    ],
    elements: [
        {
            id: mode,
            label: i18n.t("ui.reuse.messages"),
            gridSize: { default: [12, 8], min: [4, 4], max: "full" },
            responsive: mode === "calendar",
            onRender: () => mounted++,
            render: (context) => {
                presentation = context;
                return mode === "calendar"
                    ? `<section class="calendar-section"><header class="calendar-view-header" data-composer-header>${renderCalendarViewSwitcher(CALENDAR_VIEWS, view, i18n, new Date(data.date))}</header><div class="calendar-view-canvas">${calendarBody()}</div></section>`
                    : `<section class="messages-thread"><div class="messages-thread-topbar" data-composer-header><div id="messages-thread-header-slot">${renderThreadHeader(data.room, "fixture", i18n)}</div></div><div></div><div class="messages-thread-list">${Array.from({ length: 40 }, (_, index) => `<div class="messages-message-row"><article class="messages-message-wrap"><div class="messages-message"><span class="messages-message-body">${index + 1}. ${escapeHtml(data.message)}</span></div></article></div>`).join("")}</div><div></div><form id="messages-composer" class="messages-composer"><div class="messages-composer-pane--compose"><textarea id="messages-composer-input" class="messages-composer-input" aria-label="${escapeHtml(i18n.t("module.social.messages.placeholder"))}"></textarea><button class="messages-composer-send">${escapeHtml(i18n.t("module.social.messages.send"))}</button></div></form></section>`;
            },
        },
    ],
});
await composer.init();

root.addEventListener("change", (event) => {
    if (event.target.matches("[data-calendar-view-select]")) {
        view = event.target.value;
        composer.refreshElements([mode]);
    }
});
root.addEventListener("click", (event) => {
    const viewButton = event.target.closest("[data-calendar-view]");
    if (viewButton) {
        view = viewButton.dataset.calendarView;
        composer.refreshElements([mode]);
    }
    if (event.target.closest(".messages-room-select")) composer.closeToolbar();
});

window.fixture = {
    composer,
    lifetime,
    data,
    i18n,
    get mounted() {
        return mounted;
    },
};
finishLoading();
window.fixtureReady = true;

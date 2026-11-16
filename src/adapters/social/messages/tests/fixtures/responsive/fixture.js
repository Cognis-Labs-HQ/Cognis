import { beginPageLoading } from "/static/reuse/page-entry.js";
import { createPageComposer } from "/static/reuse/page-composer/index.js";
import { createI18n } from "/static/reuse/i18n.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import {
    renderThreadHeader,
    renderRoomList,
} from "/static/adapters/social/messages/room-render.js";

const finishLoading = beginPageLoading();
const data = await (await fetch("/data.json")).json();
const i18n = await createI18n({
    componentStringBaseUrls: ["/static/adapters/social/messages/languages"],
});
const lifetime = new AbortController();
const root = document.querySelector("#app");
let mounted = 0;
uiCtx.capabilities.contribute("ui:profileAvatarRenderer", {
    getInitials: () => "AS",
    getInitialsColor: () => "#285",
    isUnavailable: () => false,
    buildMarkup: () => '<span class="messages-thread-avatar">AS</span>',
});
const sidebar = renderRoomList({
    rooms: [data.room],
    currentAccountId: "fixture",
    selectedRoomId: "fixture-room",
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
    preferenceKey: "messages-responsive",
    pageContext: {
        title: i18n.t("ui.reuse.messages"),
        subtitle: i18n.t("module.social.messages.page_subtitle"),
    },
    toolbar: [
        {
            id: "rooms",
            render: () => `<ul class="messages-rooms-list">${sidebar}</ul>`,
        },
    ],
    elements: [
        {
            id: "messages",
            gridSize: { default: [12, 8], min: [4, 4], max: "full" },
            onRender: () => mounted++,
            render: () => `
      <section class="messages-thread">
        <div class="messages-thread-topbar" data-composer-header>
          <div id="messages-thread-header-slot">${renderThreadHeader(data.room, "fixture", i18n)}</div>
        </div>
        <div></div>
        <div class="messages-thread-list">
          ${Array.from(
              { length: 40 },
              (_, index) => `
            <div class="messages-message-row"><article class="messages-message-wrap">
              <div class="messages-message"><span class="messages-message-body">${index + 1}. ${escapeHtml(data.message)}</span></div>
            </article></div>`,
          ).join("")}
        </div>
        <div></div>
        <form id="messages-composer" class="messages-composer">
          <div class="messages-composer-pane--compose">
            <textarea id="messages-composer-input" class="messages-composer-input" aria-label="${escapeHtml(i18n.t("module.social.messages.placeholder"))}"></textarea>
            <button class="messages-composer-send">${escapeHtml(i18n.t("module.social.messages.send"))}</button>
          </div>
        </form>
      </section>`,
        },
    ],
});
await composer.init();
root.addEventListener(
    "click",
    (event) => {
        if (event.target.closest(".messages-room-select"))
            composer.closeToolbar();
    },
    { signal: lifetime.signal },
);
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

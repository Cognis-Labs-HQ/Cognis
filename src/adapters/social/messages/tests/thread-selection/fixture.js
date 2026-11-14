import { loadPresentation } from "../fixtures/presentation.js";
import * as reactionRecord from "../../ui/reuse/reaction-record.js";
import * as threadDom from "../../ui/thread-dom.js";
import * as threadData from "../../ui/thread-data.js";
import { JSDOM } from "jsdom";
import { loadTestModule } from "../../../../../tooling/reuse/test-module.ts";
import { createOfflineClientFixture } from "../../../../../tooling/reuse/offline-client-fixture.js";
import { escapeHtml } from "../../../../../ui/reuse/escape-html.js";
import { renderMarkdown } from "../../../../../ui/reuse/markdown-renderer.js";

export function message(id, index = 0, overrides = {}) {
    return {
        id,
        senderId: "learner",
        senderHandle: "sender",
        senderDisplayName: "Sender",
        ciphertext:
            "**Long selected** text\nSecond line with [a link](https://example.test)",
        createdAt: new Date(Date.UTC(2026, 10, 14, 0, index)).toISOString(),
        reactions: [],
        readBy: [],
        ...overrides,
    };
}

export function select(document, anchor, focus = anchor, backward = false) {
    const selection = document.getSelection();
    selection.setBaseAndExtent(
        backward ? focus : anchor,
        backward ? 6 : 2,
        backward ? anchor : focus,
        backward ? 2 : 6,
    );
    return {
        selection,
        text: selection.toString(),
        anchorNode: selection.anchorNode,
        anchorOffset: selection.anchorOffset,
        focusNode: selection.focusNode,
        focusOffset: selection.focusOffset,
    };
}

export function createRenderer({
    rendererUrl = new URL("../../ui/message-render.js", import.meta.url),
} = {}) {
    const document = new JSDOM('<div id="messages-thread-list"></div>').window
        .document;
    const container = document.getElementById("messages-thread-list");
    const state = {
        document,
        container,
        messages: [],
        requests: [],
        style: "default",
        hydrated: [],
        avatarOptions: [],
        popups: [],
        errors: [],
        decrypt: async (_key, record) => record.ciphertext,
        intercept: async () => null,
    };
    const send = async (path, options = {}) => {
        state.requests.push({ path, ...options });
        const intercepted = await state.intercept(path, options);
        if (intercepted) return intercepted;
        const url = new URL(path, "https://example.test");
        if (url.pathname.endsWith("/messages")) {
            const before = url.searchParams.get("before");
            const limit = Number(url.searchParams.get("limit") ?? 50);
            const records = state.messages
                .filter((record) => !before || record.createdAt < before)
                .slice()
                .sort((left, right) =>
                    right.createdAt.localeCompare(left.createdAt),
                )
                .slice(0, limit);
            return Response.json({
                data: records,
                pendingRequest: state.pendingRequest,
            });
        }
        const reaction = url.pathname.match(/\/messages\/([^/]+)\/reactions$/);
        if (reaction) {
            const { emoji, active } = JSON.parse(options.body);
            const record = state.messages.find(
                ({ id }) => id === decodeURIComponent(reaction[1]),
            );
            if (!record) return Response.json({}, { status: 404 });
            record.reactions = active
                ? [
                      {
                          emoji,
                          count: 1,
                          reactedByMe: true,
                          reactedBy: [
                              {
                                  accountId: "learner",
                                  displayName: "Current reader",
                              },
                          ],
                      },
                  ]
                : [];
            return Response.json({ data: { active } });
        }
        return Response.json({ data: [] });
    };
    const offline = createOfflineClientFixture(send);
    const client = loadTestModule(
        new URL("../../ui/offline-client.js", import.meta.url),
        {
            ...offline.imports,
            "./reuse/reaction-record.js": reactionRecord,
            "./i18n.js": { createMessagesI18n: async () => ({}) },
        },
        offline.globals,
    );
    client.mountProvider(offline.ctx);
    const dependencies = {
        "./reuse/conversation-presentation.js": loadPresentation(),
        "./thread-dom.js": threadDom,
        "./reuse/reaction-record.js": reactionRecord,
        "./thread-data.js": threadData,
        "./offline-client.js": client,
        "/static/reuse/ui-ctx.js": {
            uiCtx: {
                capabilities: new Map([
                    [
                        "ui:profileAvatarRenderer",
                        {
                            buildMarkup: (options) => {
                                state.avatarOptions.push(options);
                                return `<a class="${options.avatarClass}" href="/profile/${escapeHtml(options.profileHandle ?? options.label)}">${escapeHtml(options.label)}</a>`;
                            },
                            hydrate(target) {
                                state.hydrated.push(target);
                                for (const avatar of target.querySelectorAll(
                                    'a[href^="/profile/"]',
                                ))
                                    avatar.dataset.hydrated = "true";
                            },
                        },
                    ],
                ]),
            },
        },
        "/static/reuse/escape-html.js": { escapeHtml },
        "/static/reuse/markdown-renderer.js": { renderMarkdown },
        "/static/reuse/member-display-name.js": {
            resolveMemberDisplayName: (member) =>
                member.displayName || member.handle || member.accountId,
        },
        "/static/reuse/popup.js": {
            openPopup: async (options) => state.popups.push(options),
            createAnchoredPopup: () => ({
                hide() {},
                destroy() {},
                show: (...args) => state.popups.push(args),
            }),
        },
        "/static/reuse/timestamp.js": {
            formatDate: (value) => value?.slice(0, 10) ?? "",
            formatTime: (value) => value?.slice(11, 16) ?? "",
        },
        "/static/reuse/search-util/popup.js": { registerSearchIndex() {} },
        "/static/reuse/toast.js": {
            showToast: (text) => state.errors.push(text),
        },
        "./emoji-helpers.js": { getQuickReactionEmojis: () => ["♥"] },
        "./message-utils.js": {
            decryptMessageOrReturnPlaintext: (...args) =>
                state.decrypt(...args),
            normalizeReactionEmoji: String,
            emojiDisplayName: String,
            stableJson: JSON.stringify,
            formatHandleNotation: (value) => `@${value}`,
            resolveMessageStyle: () => state.style,
        },
        "./flows.js": { formatRoomEvent: async (_payload, label) => label },
    };
    const globals = {
        URLSearchParams,
        document,
        HTMLElement: document.defaultView.HTMLElement,
        HTMLButtonElement: document.defaultView.HTMLButtonElement,
        console: { error: (...args) => state.errors.push(args) },
    };
    dependencies["./room-render.js"] = loadTestModule(
        new URL("../../ui/room-render.js", import.meta.url),
        dependencies,
        globals,
    );
    dependencies["./thread-reactions.js"] = loadTestModule(
        new URL("../../ui/thread-reactions.js", import.meta.url),
        dependencies,
        globals,
    );
    const renderer = loadTestModule(rendererUrl, dependencies, globals);
    dependencies["./message-render.js"] = renderer;
    dependencies["./reaction-state.js"] = loadTestModule(
        new URL("../../ui/reaction-state.js", import.meta.url),
        {},
        globals,
    );
    state.actions = loadTestModule(
        new URL("../../ui/thread-actions.js", import.meta.url),
        dependencies,
        globals,
    ).createThreadActions({
        captureRoom: () => () => state.current !== false,
        getSelectedRoomId: () => "room",
        getSelectedRoom: () => ({}),
        resolveThreadRoomKey: async () => state.key,
        currentAccountId: "learner",
        i18n: { t: String },
        signal: offline.controller.signal,
    });
    state.key = {};
    state.render = ({
        room = "room",
        account = "learner",
        before,
        ...options
    } = {}) =>
        renderer.renderThread(
            room,
            state.key,
            container,
            { t: String },
            account,
            before,
            options,
        );
    state.body = (id) =>
        container.querySelector(
            `[data-message-id="${id}"] .messages-message-body`,
        );
    state.dispose = () => {
        offline.controller.abort();
        document.defaultView.close();
    };
    return Object.assign(
        state,
        { offline, client, dependencies, globals },
        renderer,
    );
}

export async function createLoadedHistory(context) {
    const state = createRenderer();
    context.after(state.dispose);
    state.messages = Array.from({ length: 100 }, (_value, index) =>
        message(`message-${index}`, index),
    );
    await state.render();
    await state.render({ before: message("boundary", 50).createdAt });
    return state;
}

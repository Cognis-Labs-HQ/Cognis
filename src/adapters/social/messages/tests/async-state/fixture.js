import * as reactionRecord from "../../ui/reuse/reaction-record.js";
import assert from "node:assert/strict";
import vm from "node:vm";
import { JSDOM } from "jsdom";
import * as threadDom from "../../ui/thread-dom.js";
import * as threadData from "../../ui/thread-data.js";
import { loadTestModule } from "../../../../../tooling/reuse/test-module.ts";

export function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((finish, fail) => {
        resolve = finish;
        reject = fail;
    });
    return { promise, resolve, reject };
}

export async function until(predicate) {
    for (let attempt = 0; attempt < 50; attempt += 1) {
        if (predicate()) return;
        await new Promise((resolve) => setImmediate(resolve));
    }
    assert.fail("Expected asynchronous boundary was not reached");
}

export class Element extends EventTarget {
    static [Symbol.hasInstance](value) {
        return super[Symbol.hasInstance](value) || value?.nodeType === 1;
    }
    listeners = new Map();
    addEventListener(type, listener, options) {
        this.listeners.set(type, listener);
        super.addEventListener(type, listener, options);
    }
    innerHTML = "";
    value = "";
    disabled = false;
    dataset = {};
    isConnected = true;
    scrollHeight = 0;
    scrollTop = 0;
    clientHeight = 0;
    classList = { add() {}, remove() {} };
    querySelectorAll() {
        return [];
    }
    querySelector() {
        return null;
    }
    insertAdjacentHTML(_position, html) {
        this.innerHTML = html + this.innerHTML;
    }
}

export function createRoomFixture() {
    const rooms = ["A", "B"].map((id) => ({
        id,
        name: id,
        canSend: true,
        unread: 2,
        members: [],
    }));
    const requests = [];
    const opened = [];
    const errors = [];
    const toasts = [];
    const elements = Object.fromEntries(
        [
            "messages-thread-list",
            "messages-thread-header-slot",
            "messages-composer-input",
            "messages-rooms-list",
            "messages-request-banner-slot",
            "messages-typing-status",
        ].map((id) => [id, new Element()]),
    );
    const thread = new JSDOM("<div></div>").window.document.querySelector(
        "div",
    );
    thread.listeners = new Map();
    thread.addEventListener = (type, listener) =>
        thread.listeners.set(type, listener);
    elements["messages-thread-list"] = thread;
    const storage = new Map([["cognis_account", "reader"]]);
    const controller = new AbortController();
    const state = {
        rooms,
        requests,
        opened,
        errors,
        toasts,
        elements,
        storage,
        controller,
        intercept: async () => null,
        key: async () => ({}),
        actions: async () => [],
        decrypt: async (_key, message) => message.ciphertext,
        onOpened: async () => {},
    };
    const fetch = async (url, options = {}) => {
        requests.push({ url, ...options });
        const intercepted = await state.intercept(url, options);
        if (intercepted) return intercepted;
        const match = url.match(/\/rooms\/([^/?]+)(?:\/(\w+))?/);
        const room = rooms.find((candidate) => candidate.id === match?.[1]);
        if (match?.[2] === "read") {
            room.unread = 0;
            return Response.json({ data: null });
        }
        if (match?.[2] === "typing") return Response.json({ data: [] });
        if (match?.[2] === "messages")
            return Response.json({
                data: [
                    {
                        id: `message-${room.id}`,
                        senderId: "sender",
                        senderDisplayName: room.id,
                        ciphertext: `content-${room.id}`,
                        createdAt: "2026-11-14T00:00:00.000Z",
                    },
                ],
            });
        return Response.json({ data: match ? room : rooms });
    };
    const avatars = {
        hydrate: async () => {},
        buildMarkup: () => "",
        handleError() {},
    };
    const utilities = {
        normalizeReactionEmoji: String,
        stableJson: JSON.stringify,
        decryptMessageOrReturnPlaintext: (...args) => state.decrypt(...args),
        emojiDisplayName: String,
        formatHandleNotation: String,
        resolveMessageStyle: () => "default",
    };
    const dependencies = {
        "./thread-dom.js": threadDom,
        "./reuse/reaction-record.js": reactionRecord,
        "./thread-data.js": threadData,
        "./offline-client.js": { messagesFetch: fetch },
        "./reaction-state.js": { nextReactionState: () => true },
        "/static/reuse/offline-state.js": { isOffline: () => false },
        "./offline-room.js": {
            canOpenCachedRoom: () => true,
            selectInitialRoomId: (_rooms, selected) => selected,
        },
        "./file-namespaces.js": {
            MESSAGES_FILE_NAMESPACE_ID: "messages",
            buildNamespacedFileUrl: () => "",
        },
        "/static/reuse/escape-html.js": { escapeHtml: String },
        "/static/reuse/member-display-name.js": {
            resolveMemberDisplayName: (member) => member.accountId,
        },
        "/static/reuse/markdown-renderer.js": { renderMarkdown: String },
        "/static/reuse/timestamp.js": {
            formatDate: () => "",
            formatTime: () => "",
        },
        "/static/reuse/search-util/popup.js": { registerSearchIndex() {} },
        "/static/reuse/popup.js": {
            openPopup: () => assert.fail("Unexpected popup"),
            createAnchoredPopup: () => ({ hide() {}, destroy() {} }),
        },
        "/static/reuse/toast.js": { showToast: (text) => toasts.push(text) },
        "/static/reuse/ui-ctx.js": {
            uiCtx: {
                capabilities: {
                    get: (id) =>
                        id === "ui:profileAvatarRenderer" ? avatars : null,
                },
            },
        },
        "./emoji-helpers.js": {
            loadAllEmojis: async () => [],
            recordEmojiUsage() {},
            getQuickReactionEmojis: () => [],
        },
        "./message-utils.js": utilities,
        "./flows.js": { formatRoomEvent: async () => null },
    };
    const context = vm.createContext({
        console: { error: (...args) => errors.push(args), info() {} },
        Element,
        HTMLElement: Element,
        HTMLButtonElement: Element,
        HTMLTextAreaElement: Element,
        URLSearchParams,
        setTimeout,
        clearTimeout,
        setInterval,
        clearInterval,
        AbortController,
        AbortSignal,
        Event,
        Date,
        window: Object.assign(new EventTarget(), {
            location: { pathname: "/messages" },
        }),
        document: {
            visibilityState: "visible",
            getElementById: (id) => elements[id] ?? null,
            querySelector: () => null,
        },
        localStorage: {
            getItem: (key) => storage.get(key) ?? null,
            setItem: (key, value) => storage.set(key, value),
        },
        history: { replaceState() {} },
    });
    const load = (filename) =>
        loadTestModule(
            new URL(`../../ui/${filename}`, import.meta.url),
            dependencies,
            context,
        );
    dependencies["/static/reuse/offline-identity.js"] = loadTestModule(
        new URL("../../../../../ui/reuse/offline-identity.js", import.meta.url),
        {},
        context,
    );
    dependencies["./reuse/background-refresh.js"] = load(
        "reuse/background-refresh.js",
    );
    dependencies["./read-state.js"] = load("read-state.js");
    dependencies["./typing-state.js"] = load("typing-state.js");
    dependencies["./room-render.js"] = load("room-render.js");
    dependencies["./thread-reactions.js"] = load("thread-reactions.js");
    dependencies["./reuse/conversation-presentation.js"] = load(
        "reuse/conversation-presentation.js",
    );
    dependencies["./message-render.js"] = load("message-render.js");
    dependencies["./thread-actions.js"] = load("thread-actions.js");
    state.renderThread = dependencies["./message-render.js"].renderThread;
    state.create = () =>
        load("room-state.js").createMessagesRoomState({
            i18n: { t: String },
            currentAccountId: "reader",
            signal: controller.signal,
            getRoomKey: (...args) => state.key(...args),
            requireRoomKey: (...args) => state.key(...args),
            resolveThreadRoomKey: (_room, id) => state.key(id),
            resolveRoomActions: (...args) => state.actions(...args),
            onRoomOpened: async (room) => {
                opened.push({
                    room: room?.id,
                    selected: state.roomState.getSelectedRoomId(),
                });
                await state.onOpened(room);
            },
        });
    state.load = load;
    state.context = context;
    state.dependencies = dependencies;
    state.roomState = state.create();
    return state;
}

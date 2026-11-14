import assert from "node:assert/strict";
import {
    importTestModule,
    loadTestModule,
} from "../../../../../tooling/reuse/test-module.ts";
import { createRoomFixture, Element } from "./fixture.js";

export async function mountFixture() {
    const state = createRoomFixture();
    state.roomState.cleanup();
    const { context, dependencies, elements } = state;
    const input = elements["messages-composer-input"];
    input.id = "messages-composer-input";
    const form = (elements["messages-composer"] = new Element());
    const root = new Element();
    const card = new Element();
    card.dataset.composerElement = "messages-thread";
    card.querySelectorAll = () => [input];
    root.querySelectorAll = () => [card];
    input.closest = () => card;
    context.document.addEventListener = () => {};
    context.localStorage.removeItem = (key) => state.storage.delete(key);
    const history = [];
    context.history.pushState = (_state, _title, path) => {
        context.window.location.pathname = path;
        history.push(path);
    };
    const actualRoomState = state.load("room-state.js");
    dependencies["./room-state.js"] = {
        createMessagesRoomState(options) {
            state.roomState = actualRoomState.createMessagesRoomState(options);
            return state.roomState;
        },
    };
    dependencies["./composer-drafts.js"] = state.load("composer-drafts.js");
    dependencies["./message-templates.js"] = {
        resolveMessageTemplateVariables: (text) => text,
    };
    dependencies["./message-utils.js"].encryptMessage = async (_key, text) => ({
        iv: "synthetic",
        ciphertext: `encrypted:${text}`,
    });
    dependencies["./send-message.js"] = state.load("send-message.js");
    dependencies["./guides.js"] = state.load("guides.js");
    dependencies["/static/reuse/search-util/popup.js"].openSearchPopup = () =>
        assert.fail("Unexpected search popup");
    dependencies["/static/reuse/form-builder.js"] = {
        createFormBuilder: () => ({ render: () => "" }),
    };
    dependencies["/static/reuse/i18n.js"] = { applyDocumentTitle() {} };
    dependencies["/static/reuse/page-entry.js"] = {
        mountWhenDirect: async () => {},
    };
    const manager = loadTestModule(
        new URL(
            "../../../../../ui/reuse/page-composer/form-draft.js",
            import.meta.url,
        ),
        {},
        context,
    );
    dependencies["/static/reuse/page-composer/index.js"] = {
        ...manager,
        createPageComposer: (_root, options) => ({
            init: async () => {
                for (const element of options.elements) element.onRender?.();
                options.onRender?.();
            },
        }),
    };
    Object.assign(dependencies["./emoji-helpers.js"], {
        fetchEmojiUsage: async () => {},
    });
    dependencies["./template-ui.js"] = {
        createMessageTemplatesUi: () => ({
            renderSidebarTemplateList() {},
            renderTemplateEditorPreview() {},
        }),
    };
    Object.assign(dependencies["./flows.js"], {
        activateRoomAction: async () => {},
        resolveRoomActions: async () => [],
    });
    dependencies["./runtime-config.js"] = {
        LAST_OPENED_ROOM_KEY: "last-room",
        LIVE_REFRESH_INTERVAL_MS: 50000,
        TYPING_IDLE_RESET_MS: 50000,
        TYPING_SEND_DEBOUNCE_MS: 1200,
        TYPING_TTL_SECONDS: 8,
    };
    dependencies["./runtime-bridges.js"] = {
        getRoomKey: (...args) => state.key(...args),
        requireRoomKey: (...args) => state.key(...args),
        resolveThreadRoomKey: (_room, id) => state.key(id),
        createMessagesI18n: async () => ({ t: String }),
        handleProfileAvatarError() {},
        hydrateProfileAvatars: async () => {},
    };
    const app = await importTestModule(
        new URL("../../ui/app.js", import.meta.url),
        dependencies,
        context,
    );
    await app.mount(root, { signal: state.controller.signal });
    const select = (id) => {
        const item = new Element();
        item.getAttribute = () => id;
        return elements["messages-rooms-list"].listeners.get("click")({
            target: { closest: () => item },
        });
    };
    const edit = (text) => {
        input.value = text;
        input.dispatchEvent(new Event("input"));
    };
    const submit = () =>
        form.listeners.get("submit")(new Event("submit", { cancelable: true }));
    const remount = async () => {
        state.controller.abort();
        state.controller = new AbortController();
        await app.mount(root, { signal: state.controller.signal });
        const selected = state.roomState.getSelectedRoomId();
        if (selected) await state.roomState.openRoom(selected);
    };
    return Object.assign(state, {
        root,
        input,
        select,
        edit,
        submit,
        history,
        remount,
    });
}

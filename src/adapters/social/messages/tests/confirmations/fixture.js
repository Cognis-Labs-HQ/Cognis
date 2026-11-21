import assert from "node:assert/strict";
import vm from "node:vm";
import { loadTestModule } from "../../../../../tooling/reuse/test-module.ts";
import { createOfflineClientFixture } from "../../../../../tooling/reuse/offline-client-fixture.js";
import { popupFixture } from "../../../../../ui/reuse/tests/popup/dom-fixture.js";
import { createRoomFixture } from "../async-state/fixture.js";
import * as reactionRecord from "../../ui/reuse/reaction-record.js";

export async function templateFixture(context) {
    const fixture = await popupFixture(context);
    const { document, window } = fixture;
    document.body.insertAdjacentHTML(
        "beforeend",
        '<ul id="messages-sidebar-template-list"></ul>',
    );
    const original = [
        {
            id: "template-A",
            title: "<Synthetic & template>",
            content: "Synthetic content",
        },
    ];
    const storage = new Map([
        ["messages:saved-templates:v1:reader", JSON.stringify(original)],
        ["cognis_account", "reader"],
    ]);
    const writes = [];
    const toasts = [];
    const controller = new window.AbortController();
    const popup = await fixture.importModule("popup.js");
    const state = {
        generation: 0,
        disposed: false,
        failWrite: false,
        openPopup: popup.openPopup,
    };
    context.after(() => controller.abort());
    const globals = vm.createContext({
        console,
        document,
        window,
        crypto: window.crypto,
        AbortController: window.AbortController,
        HTMLElement: window.HTMLElement,
        HTMLInputElement: window.HTMLInputElement,
        HTMLTextAreaElement: window.HTMLTextAreaElement,
        HTMLButtonElement: window.HTMLButtonElement,
        localStorage: {
            getItem: (key) => storage.get(key) ?? null,
            setItem: (key, value) => {
                if (state.failWrite)
                    throw new Error("synthetic_storage_failure");
                writes.push({ key, value });
                storage.set(key, value);
            },
        },
    });
    const load = (filename, imports) =>
        loadTestModule(
            new URL(`../../ui/${filename}`, import.meta.url),
            imports,
            globals,
        );
    const templateModel = load("message-templates.js", {
        "/static/reuse/format-template.js": {
            formatTemplate: () => assert.fail("Unexpected formatting"),
        },
    });
    const escape = loadTestModule(
        new URL("../../../../../ui/reuse/escape-html.js", import.meta.url),
        {},
        globals,
    );
    const ownership = load("reuse/action-ownership.js", {});
    const { createMessageTemplatesUi } = load("template-ui.js", {
        "./reuse/action-ownership.js": ownership,
        "/static/reuse/escape-html.js": escape,
        "/static/reuse/form-builder.js": {
            createFormBuilder: (_context, options) => ({
                render: () =>
                    `<form id="${options.formId}">${options.trustedContentHtml}</form>`,
            }),
        },
        "/static/reuse/popup.js": {
            openPopup: (...args) => state.openPopup(...args),
        },
        "/static/reuse/toast.js": { showToast: (text) => toasts.push(text) },
        "./message-templates.js": templateModel,
        "./message-render.js": {
            renderComposerPreviewMarkup: escape.escapeHtml,
        },
    });
    const identity = () =>
        JSON.stringify([
            storage.get("cognis_account"),
            storage.get("cognis_access_token"),
        ]);
    const expected = identity();
    const templates = createMessageTemplatesUi({
        i18n: {
            t: (key) =>
                key.endsWith("template_delete_confirm_body")
                    ? "Delete {name}?"
                    : key,
        },
        currentAccountId: "reader",
        signal: controller.signal,
        isActive: () =>
            !state.disposed &&
            !controller.signal.aborted &&
            identity() === expected,
        captureOwner: () => {
            const generation = state.generation;
            return () => state.generation === generation;
        },
        resolveTemplateContent: String,
        onUseTemplate() {},
    });
    templates.renderSidebarTemplateList();
    const target = document.querySelector('[data-template-action="delete"]');
    return {
        ...fixture,
        state,
        storage,
        writes,
        toasts,
        controller,
        templates,
        target,
        original,
        read: () => templateModel.loadSavedMessageTemplates("reader"),
        openDelete: () => templates.handleSidebarTemplateClick({ target }),
    };
}

export async function roomFixture(context) {
    const fixture = await popupFixture(context);
    const state = createRoomFixture();
    state.roomState.cleanup();
    context.after(() => state.roomState.cleanup());
    const popup = await fixture.importModule("popup.js");
    state.dependencies["/static/reuse/popup.js"] = popup;
    const sent = [];
    const transport = { intercept: async () => null };
    const offline = createOfflineClientFixture(async (path, options = {}) => {
        options.signal?.throwIfAborted();
        sent.push({ path, ...options });
        const intercepted = await transport.intercept(path, options);
        if (intercepted) return intercepted;
        if (options.method === "DELETE")
            return Response.json({}, { status: 500 });
        const match = path.match(/\/rooms\/([^/?]+)(?:\/(\w+))?/);
        if (match?.[2] === "messages" || match?.[2] === "typing")
            return Response.json({ data: [] });
        return Response.json({
            data: match
                ? state.rooms.find((room) => room.id === match[1])
                : state.rooms,
        });
    });
    offline.changeAccount("reader", "synthetic-session");
    context.after(() => offline.controller.abort());
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
    const request = offline.ctx.capabilities.get("social:messagesRequest");
    offline.controller.signal.addEventListener("abort", () =>
        offline.ctx.capabilities.remove("social:messagesRequest", request),
    );
    state.dependencies["./offline-client.js"] = client;
    state.dependencies["./message-render.js"] = state.load("message-render.js");
    const getCapability =
        state.dependencies["/static/reuse/ui-ctx.js"].uiCtx.capabilities.get;
    state.dependencies["/static/reuse/ui-ctx.js"].uiCtx.capabilities.get = (
        id,
    ) => getCapability(id) ?? offline.ctx.capabilities.get(id);
    state.dependencies["./room-leave.js"] = state.load("room-leave.js");
    state.roomState = state.create();
    state.rooms.forEach((room) =>
        Object.assign(room, {
            kind: "group",
            title: `Synthetic ${room.id}`,
            members: [
                { accountId: "reader", handle: "fixture-reader" },
                { accountId: "other", handle: "fixture-other" },
            ],
        }),
    );
    const document = state.elements["messages-thread-list"].ownerDocument;
    context.after(() => document.defaultView.close());
    const header = document.createElement("div");
    document.body.append(header);
    state.elements["messages-thread-header-slot"] = header;
    state.context.document.getElementById = (id) =>
        state.elements[id] ?? header.querySelector(`[id="${id}"]`);
    const handlers = new Map();
    const nativeAdd =
        document.defaultView.HTMLButtonElement.prototype.addEventListener;
    document.defaultView.HTMLButtonElement.prototype.addEventListener =
        function (type, callback, options) {
            if (this.id === "messages-room-leave-btn")
                handlers.set(this, callback);
            return nativeAdd.call(this, type, callback, options);
        };
    await state.roomState.loadInitialRooms();
    await state.roomState.openRoom("A");
    const button = () => header.querySelector("#messages-room-leave-btn");
    const openLeave = (target = button()) => handlers.get(target)();
    return {
        ...fixture,
        state,
        sent,
        offline,
        transport,
        header,
        button,
        openLeave,
        deletes: () => sent.filter(({ method }) => method === "DELETE"),
    };
}

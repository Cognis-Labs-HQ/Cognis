import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { state } from "./contracts.js";

const sourceRoot = new URL("../../../../../", import.meta.url);
const contracts = new URL("./contracts.js", import.meta.url).href;
const fakes = new Set([
    "/static/reuse/api-client.js",
    "/static/reuse/i18n.js",
    "/static/reuse/search-util/popup.js",
    "/static/reuse/timestamp.js",
]);
registerHooks({
    resolve(specifier, context, next) {
        if (
            fakes.has(specifier) ||
            (specifier === "./i18n.js" &&
                context.parentURL?.includes("/ui/reuse/"))
        )
            return { url: contracts, shortCircuit: true };
        if (specifier.startsWith("/static/reuse/"))
            return next(
                new URL(
                    `ui/reuse/${specifier.slice("/static/reuse/".length)}`,
                    sourceRoot,
                ).href,
                context,
            );
        if (specifier.startsWith("/static/adapters/")) {
            const parts = specifier
                .slice("/static/adapters/".length)
                .split("/");
            return next(
                new URL(
                    `adapters/${parts[0]}/${parts[1]}/ui/${parts.slice(2).join("/")}`,
                    sourceRoot,
                ).href,
                context,
            );
        }
        return next(specifier, context);
    },
});

export const reader = {
    accountId: "synthetic-reader",
    handle: "le-firehawk",
    displayName: "The Firehawk",
    avatarKey: "",
    readAt: "2026-11-15T13:00:00Z",
};
export const record = {
    id: "message-own",
    senderId: "synthetic-self",
    senderHandle: "synthetic-self",
    senderDisplayName: "Synthetic Self",
    senderAvatarKey: "",
    createdAt: "2026-11-15T12:00:00Z",
    reactions: [],
    readBy: [reader],
};
export const settle = async () => {
    for (let index = 0; index < 8; index++) await new Promise(setImmediate);
};
export function deferred() {
    let resolve;
    const promise = new Promise((done) => {
        resolve = done;
    });
    return { promise, resolve };
}

export async function fixture(context) {
    const dom = new JSDOM(
        '<main class="messages-page" id="messages-thread-list"></main><div id="navbar-control"></div><button id="outside">Outside</button>',
        {
            url: "https://fixture.invalid/messages/synthetic",
            pretendToBeVisual: true,
        },
    );
    const { window } = dom;
    const names = [
        "window",
        "document",
        "localStorage",
        "sessionStorage",
        "Element",
        "HTMLElement",
        "HTMLInputElement",
        "HTMLButtonElement",
        "HTMLFormElement",
        "Event",
        "CustomEvent",
        "MouseEvent",
        "KeyboardEvent",
        "MutationObserver",
        "DOMParser",
        "AbortController",
        "AbortSignal",
        "fetch",
        "requestAnimationFrame",
        "cancelAnimationFrame",
    ];
    const previous = new Map(names.map((name) => [name, globalThis[name]]));
    for (const name of names)
        globalThis[name] = name === "window" ? window : window[name];
    globalThis.fetch = async (path) => {
        throw new Error(`Network forbidden: ${path}`);
    };
    localStorage.setItem("cognis_account", "synthetic-self");
    localStorage.setItem("cognis_access_token", "synthetic-token");
    state.messages = [];
    state.requests = [];
    state.images.clear();
    state.profile = { ...reader };
    state.strings.clear();
    for (const path of [
        "ui/languages/en/strings.xml",
        "adapters/social/profile/ui/languages/en/strings.xml",
        "adapters/social/messages/ui/languages/en/strings.xml",
    ]) {
        const xml = new DOMParser().parseFromString(
            readFileSync(new URL(path, sourceRoot), "utf8"),
            "text/xml",
        );
        for (const item of xml.querySelectorAll("string"))
            state.strings.set(item.getAttribute("name"), item.textContent);
    }
    function installStyle(path, owner) {
        const element = document.createElement("style");
        element.dataset.owner = owner;
        element.textContent = readFileSync(new URL(path, sourceRoot), "utf8");
        document.head.appendChild(element);
        return element;
    }
    const observer = new MutationObserver(() => {
        for (const link of document.querySelectorAll(
            'link[rel="stylesheet"]',
        )) {
            if (link.dataset.loaded) continue;
            link.dataset.loaded = "true";
            link.dispatchEvent(new Event("load"));
        }
    });
    observer.observe(document.head, { childList: true });
    const { uiCtx } = await import("../../../../../ui/reuse/ui-ctx.js");
    const { registerScopedUiActions } =
        await import("../../../../../ui/reuse/scoped-actions.js");
    uiCtx.capabilities.contribute("ui:scopedActions", registerScopedUiActions);
    const logs = [];
    const logger = (...args) => logs.push(args);
    uiCtx.capabilities.contribute("ui:log", logger);
    const { createProviderLifecycle } =
        await import("../../../../../ui/reuse/provider-lifecycle.js");
    const failures = [];
    const lifecycle = createProviderLifecycle({
        uiCtx,
        onFailure: (failure) => failures.push(failure),
    });
    const entry = (id, script) => ({
        scriptUrl: `/static/adapters/social/${id}/${script}`,
        component: {
            type: "adapter",
            gatewayId: "social",
            id: `social-${id}`,
            version: id === "profile" ? "4.1.0" : "2.9.0",
        },
    });
    const profileEntries = [
        entry("profile", "provider.js"),
        entry("profile", "navbar.js"),
    ];
    const messageEntries = [
        entry("messages", "offline-client.js"),
        entry("messages", "presentation-provider.js"),
        entry("messages", "read-receipts.js"),
    ];
    await lifecycle.reconcile([...profileEntries, ...messageEntries]);
    if (failures.length)
        throw new AggregateError(
            failures.map((failure) => failure.error),
            "fixture_providers_failed",
        );
    installStyle("adapters/social/profile/ui/availability.css", "profile");
    for (const path of [
        "messages.css",
        "thread.css",
        "messages-style-variants.css",
        "messages-chat-shared.css",
    ])
        installStyle(`adapters/social/messages/ui/${path}`, "messages");
    const messages = await import("../../ui/message-render.js");
    const { bindReadReceiptPanel } = await import("../../ui/read-receipts.js");
    const avatars = uiCtx.capabilities.get("ui:profileAvatarRenderer");
    const root = document.querySelector("main");
    const i18n = await (await import("./contracts.js")).createI18n();
    const lifetime = new AbortController();
    let room = "synthetic-room";
    const captureRoom = () => {
        const expected = room;
        return () => expected === room;
    };
    const bind = () =>
        bindReadReceiptPanel({
            root,
            signal: lifetime.signal,
            i18n,
            captureRoom,
            isActive: () => !lifetime.signal.aborted,
        });
    let panel = bind();
    context.after(async () => {
        lifetime.abort();
        await lifecycle.reconcile([]);
        uiCtx.capabilities.remove("ui:log", logger);
        observer.disconnect();
        dom.window.close();
        for (const [name, value] of previous) {
            if (value === undefined) delete globalThis[name];
            else globalThis[name] = value;
        }
    });
    const render = async (readers = [reader], records) => {
        state.messages = records || [{ ...record, readBy: readers }];
        return messages.renderThread(
            room,
            null,
            root,
            i18n,
            "synthetic-self",
            undefined,
            { force: true },
        );
    };
    const trigger = () => root.querySelector(".messages-receipt-details");
    const popup = () => document.querySelector(".messages-read-receipt-popup");
    const open = async () => {
        trigger().click();
        await settle();
        return popup();
    };
    return {
        dom,
        window,
        document,
        root,
        state,
        uiCtx,
        avatars,
        lifecycle,
        profileEntries,
        messageEntries,
        logs,
        messages,
        lifetime,
        render,
        trigger,
        popup,
        open,
        i18n,
        installStyle,
        setRoom(value) {
            room = value;
        },
        rebind() {
            panel = bind();
            return panel;
        },
        get panel() {
            return panel;
        },
    };
}

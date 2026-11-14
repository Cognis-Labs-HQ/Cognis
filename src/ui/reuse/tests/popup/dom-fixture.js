import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { JSDOM } from "jsdom";

export async function popupFixture(
    context,
    existingWindow,
    capabilities = new Map(),
) {
    const window =
        existingWindow ??
        new JSDOM(
            '<!doctype html><head><link rel="stylesheet" href="/static/styles/popup.css"></head><body><button id="invoker">Open</button><a href="/next">Background</a></body>',
            { url: "https://fixture.invalid/", pretendToBeVisual: true },
        ).window;
    context.after(() => window.close());
    const errors = [];
    window.addEventListener("error", (event) => errors.push(event.error));
    context.after(() =>
        assert.deepEqual(errors, [], "DOM event handlers must not throw"),
    );
    const document = window.document;
    Object.defineProperty(document.querySelector("link"), "sheet", {
        value: {},
        configurable: true,
    });
    window.matchMedia = () => ({ matches: false });
    const sandbox = vm.createContext({
        window,
        document,
        console,
        Function,
        AbortController: window.AbortController,
        AbortSignal: window.AbortSignal,
        crypto: window.crypto,
        HTMLElement: window.HTMLElement,
        HTMLInputElement: window.HTMLInputElement,
        HTMLTextAreaElement: window.HTMLTextAreaElement,
        HTMLSelectElement: window.HTMLSelectElement,
        HTMLButtonElement: window.HTMLButtonElement,
        setTimeout: window.setTimeout.bind(window),
        clearTimeout: window.clearTimeout.bind(window),
        setInterval: window.setInterval.bind(window),
        clearInterval: window.clearInterval.bind(window),
        requestAnimationFrame: window.requestAnimationFrame.bind(window),
        getComputedStyle: window.getComputedStyle.bind(window),
        fetch: () => {
            throw new Error("Unexpected network request");
        },
    });
    const translations = {
        "ui.reuse.unsaved_changes": "Unsaved Changes",
        "ui.reuse.close_form_warning": "Unsaved changes will be lost.",
        "ui.reuse.discard": "Discard",
        "ui.reuse.cancel": "Cancel",
        "ui.reuse.close": "Close",
        "ui.reuse.done": "Done",
    };
    const ctx = {
        capabilities: {
            get: (key) => capabilities.get(key),
            contribute: (key, value) => capabilities.set(key, value),
        },
    };
    const boundaries = new Map([
        [
            "i18n.js",
            {
                createI18n: async () => ({
                    t: (key) => {
                        assert.ok(translations[key], key);
                        return translations[key];
                    },
                }),
            },
        ],
        [
            "ui-ctx.js",
            {
                uiCtx: ctx,
            },
        ],
        [
            "popup/config-form.js",
            Object.fromEntries(
                [
                    "markPopupFieldInvalid",
                    "openConfigFormPopup",
                    "resolveFieldErrorId",
                ].map((name) => [
                    name,
                    () => {
                        throw new Error("Unexpected config form");
                    },
                ]),
            ),
        ],
    ]);
    const root = new URL("../../", import.meta.url);
    const modules = new Map();
    async function load(identifier) {
        if (modules.has(identifier)) return modules.get(identifier);
        const boundary = boundaries.get(identifier);
        const module = boundary
            ? new vm.SyntheticModule(
                  Object.keys(boundary),
                  function () {
                      for (const [name, value] of Object.entries(boundary))
                          this.setExport(name, value);
                  },
                  { context: sandbox, identifier },
              )
            : new vm.SourceTextModule(
                  await readFile(new URL(identifier, root), "utf8"),
                  { context: sandbox, identifier },
              );
        modules.set(identifier, module);
        return module;
    }
    async function importModule(identifier) {
        const loaded = await load(identifier);
        if (loaded.status === "unlinked")
            await loaded.link((specifier, referencing) =>
                load(
                    new URL(
                        specifier,
                        new URL(referencing.identifier, root),
                    ).href.slice(root.href.length),
                ),
            );
        if (loaded.status !== "evaluated") await loaded.evaluate();
        return loaded.namespace;
    }
    const popup = await importModule("popup.js");
    const settle = () => new Promise((resolve) => setImmediate(resolve));
    async function open(options = {}) {
        let overlay;
        let api;
        let dismiss;
        const result = popup.openPopup({
            title: "Synthetic editor",
            body: '<input aria-label="Synthetic field" value="Initial">',
            ...options,
            onOpen: (element, close, controls) => {
                overlay = element;
                api = controls;
                dismiss = close;
                options.onOpen?.(element, close, controls);
            },
        });
        await settle();
        return { overlay, api, dismiss, result };
    }
    function key(key, shiftKey = false) {
        const event = new window.KeyboardEvent("keydown", {
            key,
            shiftKey,
            bubbles: true,
            cancelable: true,
        });
        document.activeElement.dispatchEvent(event);
        return event;
    }
    const active = () =>
        [...document.querySelectorAll(".popup-overlay")].filter(
            (overlay) => !overlay.inert,
        );
    const invoker = document.querySelector("#invoker");
    invoker.focus();
    return {
        window,
        document,
        open,
        key,
        settle,
        active,
        invoker,
        ctx,
        capabilities,
        importModule,
    };
}

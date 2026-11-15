import assert from "node:assert/strict";
import { after } from "node:test";
import { registerHooks } from "node:module";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";

const uiRoot = new URL("../../../", import.meta.url);
const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
        return nextResolve(
            specifier.startsWith("/static/")
                ? new URL(specifier.slice(8), uiRoot).href
                : specifier,
            context,
        );
    },
});
const dom = new JSDOM(
    "<!doctype html><html><head></head><body></body></html>",
    {
        url: "https://cognis.test/settings",
        pretendToBeVisual: true,
    },
);
const names = [
    "window",
    "document",
    "localStorage",
    "sessionStorage",
    "HTMLElement",
    "HTMLInputElement",
    "Element",
    "Node",
    "Event",
    "MouseEvent",
    "CustomEvent",
    "AbortController",
    "AbortSignal",
    "MutationObserver",
    "DOMParser",
    "requestAnimationFrame",
    "cancelAnimationFrame",
];
const previous = new Map(names.map((name) => [name, globalThis[name]]));
for (const name of names)
    globalThis[name] = name.endsWith("AnimationFrame")
        ? dom.window[name].bind(dom.window)
        : dom.window[name];
const previousNavigator = Object.getOwnPropertyDescriptor(
    globalThis,
    "navigator",
);
Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: dom.window.navigator,
});
let online = true;
Object.defineProperty(navigator, "onLine", { get: () => online });
const previousFetch = globalThis.fetch;
let transport = () => assert.fail("Unexpected synthetic request");
globalThis.fetch = async (path, options = {}) => {
    const match = String(path).match(
        /^\/static\/languages\/(en|de|id|ja)\/strings\.xml$/,
    );
    if (match)
        return new Response(
            await readFile(
                new URL(`languages/${match[1]}/strings.xml`, uiRoot),
            ),
        );
    return transport(String(path), options);
};
const styles = new MutationObserver((records) => {
    for (const record of records) {
        for (const element of record.addedNodes) {
            if (element.nodeName === "LINK")
                element.dispatchEvent(new Event("load"));
        }
    }
});
styles.observe(document.head, { childList: true });
const { uiCtx } = await import("../../../reuse/ui-ctx.js");
const { registerScopedUiActions } =
    await import("../../../reuse/scoped-actions.js");
const { mountProvider } =
    await import("../../../../gateways/notify/ui/email-client.js");
const { createI18n } = await import("../../../reuse/i18n.js");
const { configureToastDismissLabel } = await import("../../../reuse/toast.js");
const { initGeneralPrefs } =
    await import("../../../app/settings/general-prefs.js");

export const initialEmails = [
    { email: "first@example.test", verified: true, primary: true },
    { email: "second@example.test", verified: true, primary: false },
    { email: "third@example.test", verified: true, primary: false },
];

export function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((yes, no) => {
        resolve = yes;
        reject = no;
    });
    return { promise, resolve, reject };
}

export async function settle() {
    for (let count = 0; count < 12; count += 1) await new Promise(setImmediate);
}

export async function fixture(
    context,
    { locale = "en", offlineEnabled = false } = {},
) {
    online = true;
    localStorage.clear();
    localStorage.setItem("cognis_account", `synthetic-${crypto.randomUUID()}`);
    localStorage.setItem(
        "cognis_ui_preferences",
        JSON.stringify({ offlineEnabled }),
    );
    localStorage.setItem("cognis_offline_requirements", "[]");
    document.body.innerHTML =
        '<main><section class="components-section"><ul id="email-list"></ul></section></main>';
    const root = document.querySelector("main");
    const controller = new AbortController();
    const providerController = new AbortController();
    const cleanups = [];
    const calls = [];
    const pending = [];
    const flows = [];
    const activities = [];
    const account = localStorage.getItem("cognis_account");
    const emailRoot = `/api/v1/notify/users/${account}/emails`;
    let response = async () => Response.json({ data: initialEmails });
    transport = async (path, options) => {
        assert.ok(path.startsWith(emailRoot), `Unexpected request: ${path}`);
        const call = {
            path,
            method: options.method ?? "GET",
            signal: options.signal,
            cache: options.cache,
        };
        calls.push(call);
        return response(call);
    };
    const outbox = {
        register(owner, send, signal) {
            assert.equal(owner, "notify.emails");
            assert.equal(typeof send, "function");
            assert.equal(signal, providerController.signal);
        },
        pending: async () => pending,
        submit: async (owner, id, payload) => {
            pending.push({ owner, id, payload });
            return { queued: true };
        },
        flush: async () =>
            assert.fail("Mutations must not be automatically retried"),
    };
    const providerContext = {
        ...uiCtx,
        signal: providerController.signal,
        registerFlow(...args) {
            const dispose = uiCtx.registerFlow(...args);
            cleanups.push(dispose);
            return dispose;
        },
        extendFlow(flowId, stageId, metadata, handler) {
            assert.equal(
                uiCtx.extendFlow(flowId, stageId, metadata, handler),
                true,
            );
            cleanups.push(() =>
                uiCtx.removeFlowHook(flowId, stageId, metadata.id),
            );
        },
        runFlow(...args) {
            flows.push(args[0]);
            return uiCtx.runFlow(...args);
        },
        capabilities: {
            get(name) {
                if (name === "offline:outbox") return outbox;
                if (name === "ui:scopedActions") return registerScopedUiActions;
                if (name === "session:isOfflineValid") return () => true;
                if (name === "offline:accessPolicy")
                    return { allows: () => true };
                return uiCtx.capabilities.get(name);
            },
            contribute(name, value) {
                assert.equal(uiCtx.capabilities.contribute(name, value), true);
                cleanups.push(() => uiCtx.capabilities.remove(name, value));
            },
        },
    };
    providerContext.extendFlow(
        "activity:record",
        "capture",
        { id: "syntheticEmailActivity" },
        (stage) => {
            activities.push(stage.input);
        },
    );
    mountProvider(providerContext);
    const i18n = await createI18n({
        preferredLanguages: [locale],
        persistLocale: false,
    });
    configureToastDismissLabel(i18n.t("ui.reuse.close"));
    let renders = 0;
    const prefs = initGeneralPrefs(root, {
        i18n,
        username: account,
        signal: controller.signal,
        onRender: () => {
            renders += 1;
        },
    });
    context.after(() => {
        controller.abort();
        providerController.abort();
        cleanups.reverse().forEach((dispose) => dispose());
        document.body.replaceChildren();
    });
    await prefs.init();
    return {
        root,
        prefs,
        i18n,
        calls,
        pending,
        flows,
        activities,
        controller,
        providerController,
        outbox,
        get renders() {
            return renders;
        },
        respond(handler) {
            response = handler;
        },
        offline() {
            online = false;
        },
        online() {
            online = true;
        },
        remove() {
            return root.querySelector("[data-remove-email]");
        },
        primary() {
            return root.querySelector("[data-set-primary]");
        },
        refresh() {
            return root.querySelector("[data-refresh-emails]");
        },
        messages() {
            return [...document.querySelectorAll(".toast-message")].map(
                (toast) => toast.textContent,
            );
        },
        mutations() {
            return calls.filter((call) => call.method !== "GET");
        },
    };
}

after(async () => {
    await settle();
    styles.disconnect();
    hooks.deregister();
    dom.window.close();
    for (const [name, value] of previous) globalThis[name] = value;
    Object.defineProperty(globalThis, "navigator", previousNavigator);
    globalThis.fetch = previousFetch;
});

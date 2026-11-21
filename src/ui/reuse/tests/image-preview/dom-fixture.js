import assert from "node:assert/strict";
import { uiCtx } from "../../ui-ctx.js";
import { popupFixture } from "../popup/dom-fixture.js";

export function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((success, failure) => {
        resolve = success;
        reject = failure;
    });
    return { promise, resolve, reject };
}

export function observe(promise) {
    const state = { settled: false };
    state.result = promise.then(
        (value) => {
            state.settled = true;
            state.value = value;
        },
        (error) => {
            state.settled = true;
            state.error = error;
        },
    );
    return state;
}

export async function imageFixture(
    context,
    { cold = false, locale, labels: overrides = {} } = {},
) {
    // Each synthetic document has independent readiness and focus ownership.
    for (const key of ["ui:popupPreparation", "ui:popupFocus"]) {
        const existing = uiCtx.capabilities.get(key);
        if (existing) uiCtx.capabilities.remove(key, existing);
    }
    const notices = [];
    const labels = {
        "ui.reuse.close": "Close",
        "ui.reuse.done": "Done",
        "ui.reuse.error": "Error",
        "ui.reuse.image_preview": "Image Preview",
        "ui.reuse.image_preview_failed": "Preview Failed",
        ...overrides,
    };
    const translations = {
        t(key) {
            if (!labels[key]) throw new Error(`missing_translation:${key}`);
            return labels[key];
        },
    };
    let localeCalls = 0;
    const fixture = await popupFixture(context, undefined, new Map(), {
        createI18n: () => {
            localeCalls++;
            return locale
                ? locale(translations, localeCalls)
                : Promise.resolve(translations);
        },
        boundaries: new Map([
            ["ui-ctx.js", { uiCtx }],
            ["toast.js", { showToast: (...args) => notices.push(args) }],
        ]),
    });
    if (cold) fixture.document.querySelector("link").remove();
    const stylesheet = fixture.document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = "/static/styles/reuse/image-preview.css";
    Object.defineProperty(stylesheet, "sheet", { value: {} });
    fixture.document.head.append(stylesheet);
    const provider = await fixture.importModule("image-preview.js");
    const { createProviderLifecycle } = await fixture.importModule(
        "provider-lifecycle.js",
    );
    const lifecycle = createProviderLifecycle({
        uiCtx,
        importProvider: async () => provider,
    });
    const enable = () =>
        lifecycle.reconcile([{ scriptUrl: "/image-preview.js" }]);
    await enable();
    context.after(() => lifecycle.reconcile([]));
    const capability = uiCtx.capabilities.get("ui:imagePreview");
    assert.ok(uiCtx.flowExists("ui:imagePreview:open"));
    const controller = new fixture.window.AbortController();
    const start = (input = {}, target = capability) =>
        observe(
            target.open({
                src: "https://fixture.invalid/synthetic.svg",
                alt: "Synthetic",
                signal: controller.signal,
                ...input,
            }),
        );
    const resource = () =>
        fixture.document.querySelector('link[href="/static/styles/popup.css"]');
    const release = async (event = "load") => {
        await fixture.settle();
        resource()?.dispatchEvent(new fixture.window.Event(event));
        await fixture.settle();
        for (const overlay of fixture.document.querySelectorAll(
            ".popup-overlay",
        )) {
            overlay.dispatchEvent(new fixture.window.Event("transitionend"));
        }
    };
    const bind = ({ signal = controller.signal, scoped = true } = {}) => {
        const root = fixture.document.createElement("section");
        root.innerHTML = provider.renderImagePreview({
            src: "https://fixture.invalid/synthetic.svg",
            alt: "Synthetic",
        });
        fixture.document.body.append(root);
        let listener;
        const add = root.addEventListener.bind(root);
        root.addEventListener = (type, callback, options) => {
            if (type === "click") listener = callback;
            add(type, callback, options);
        };
        (scoped
            ? uiCtx.capabilities.get("ui:imagePreview").bind
            : provider.bindImagePreviews)(root, { signal });
        return {
            root,
            activate: () =>
                listener({
                    target: root.querySelector("button"),
                    defaultPrevented: false,
                    preventDefault() {},
                }),
        };
    };
    return {
        ...fixture,
        uiCtx,
        controller,
        capability,
        lifecycle,
        provider,
        start,
        release,
        notices,
        resource,
        translations,
        localeCalls: () => localeCalls,
        enable,
        bind,
    };
}

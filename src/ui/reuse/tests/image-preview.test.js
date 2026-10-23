import { loadTestModule } from "../../../tooling/reuse/test-module.ts";
import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { uiCtx } from "../ui-ctx.js";
import { createProviderLifecycle } from "../provider-lifecycle.js";
import { registerScopedUiActions } from "../scoped-actions.js";
import { escapeHtml } from "../escape-html.js";

async function fixture(t) {
    let click;
    let opened;
    let resolvePopup;
    let dismissed = 0;
    let focused = 0;
    let executions = 0;
    const failures = [];
    const closeAttributes = {};
    const overlayAttributes = {};
    const stylesLoaded = [];
    let headingRemoved = false;
    const controller = new AbortController();
    const image = {
        alt: 'Dog "photo"',
        getAttribute: () => "blob:private-image",
    };
    const button = {
        isConnected: true,
        querySelector: () => image,
        focus: () => focused++,
    };
    const root = {
        addEventListener(_event, listener, options) {
            assert.equal(options.signal, controller.signal);
            click = listener;
        },
    };
    const context = vm.createContext({
        showToast: (...values) => failures.push(values),
        escapeHtml,
        uiCtx,
        registerScopedUiActions,
        AbortSignal,
        ensurePageStylesheet: async (url) => {
            stylesLoaded.push(url);
        },
        createI18n: async () => ({
            t: (key) =>
                ({
                    "ui.reuse.close": "Schließen",
                    "ui.reuse.image_preview": "Bildvorschau",
                    "ui.reuse.image_preview_failed":
                        "Die Bildvorschau konnte nicht geöffnet werden.",
                })[key],
        }),
        openPopup: (options) => {
            opened = options;
            return new Promise((resolve) => {
                resolvePopup = resolve;
                options.onOpen(
                    {
                        classList: {
                            add: (name) =>
                                assert.equal(name, "image-preview-popup"),
                        },
                        removeAttribute: (name) => {
                            delete overlayAttributes[name];
                        },
                        setAttribute: (name, value) => {
                            overlayAttributes[name] = value;
                        },
                        querySelector: () => ({
                            remove: () => {
                                headingRemoved = true;
                            },
                            setAttribute: (name, value) => {
                                closeAttributes[name] = value;
                            },
                        }),
                    },
                    () => {
                        dismissed++;
                        resolve(null);
                    },
                );
            });
        },
    });
    Object.assign(
        context,
        loadTestModule(
            new URL("../image-preview.js", import.meta.url),
            {
                "./escape-html.js": context,
                "./popup.js": context,
                "./page-styles.js": context,
                "./i18n.js": context,
                "./ui-ctx.js": context,
                "./scoped-actions.js": context,
                "./toast.js": context,
            },
            context,
        ),
    );
    const lifecycle = createProviderLifecycle({
        uiCtx,
        importProvider: async () => ({ mountProvider: context.mountProvider }),
    });
    await lifecycle.reconcile([{ scriptUrl: "/image-preview.js" }]);
    t.after(() => lifecycle.reconcile([]));
    uiCtx.extendFlow(
        "ui:imagePreview:open",
        "execute",
        { id: "test:observe-image-preview" },
        () => {
            executions++;
        },
    );
    context.bindImagePreviews(root, { signal: controller.signal });
    const activate = () =>
        click({
            target: { closest: () => button },
            preventDefault() {},
            defaultPrevented: false,
        });
    return {
        context,
        lifecycle,
        executions: () => executions,
        image,
        controller,
        activate,
        failures,
        opened: () => opened,
        dismiss: () => resolvePopup(null),
        focused: () => focused,
        dismissed: () => dismissed,
        closeAttributes,
        overlayAttributes,
        stylesLoaded,
        headingRemoved: () => headingRemoved,
    };
}

test("shared thumbnails safely render image data and optional removal controls", async (t) => {
    const state = await fixture(t);
    const html = state.context.renderImagePreview({
        src: 'blob:private"image',
        alt: "<Dog>",
        removeId: 3,
        removeLabel: "Delete",
        imageAttributes: { "data-card-id": "card" },
    });
    assert.match(html, /data-image-preview-open/);
    assert.match(html, /data-image-preview-remove="3"/);
    assert.match(html, /alt="&lt;Dog&gt;"/);
    assert.match(html, /src="blob:private&quot;image"/);
    assert.throws(
        () =>
            state.context.renderImagePreview({
                imageAttributes: { onclick: "bad" },
            }),
        /invalid_image_preview_attribute/,
    );
});

test("image activation opens only the full image and the standard close control, then restores focus", async (t) => {
    const state = await fixture(t);
    const pending = state.activate();
    await new Promise(setImmediate);
    assert.equal(uiCtx.flowExists("ui:imagePreview:open"), true);
    assert.deepEqual(state.stylesLoaded, [
        "/static/styles/reuse/image-preview.css",
    ]);
    assert.equal(state.headingRemoved(), true);
    assert.equal(state.overlayAttributes["aria-label"], "Bildvorschau");
    assert.equal(state.opened().actions.length, 0);
    assert.match(
        state.opened().body,
        /^<img class="image-preview-full" src="blob:private-image"/,
    );
    assert.equal(state.closeAttributes["aria-label"], "Schließen");
    await state.activate();
    state.dismiss();
    await pending;
    assert.equal(state.focused(), 1);
    assert.equal(state.executions(), 1);
});

test("closing the owner view dismisses the image popup without reclaiming caller-owned URLs", async (t) => {
    const state = await fixture(t);
    state.image.alt = "";
    const pending = state.activate();
    await new Promise(setImmediate);
    assert.equal(state.overlayAttributes["aria-label"], "Bildvorschau");
    state.controller.abort();
    await pending;
    assert.equal(state.dismissed(), 1);
    assert.equal(state.focused(), 0);
});

test("unmounting the global provider dismisses its popup and removes the registered capability and flow", async (t) => {
    const state = await fixture(t);
    const preview = uiCtx.capabilities.get("ui:imagePreview");
    const pending = state.activate();
    await new Promise(setImmediate);
    await state.lifecycle.reconcile([]);
    await pending;
    assert.equal(state.dismissed(), 1);
    assert.equal(uiCtx.capabilities.get("ui:imagePreview"), undefined);
    assert.equal(uiCtx.flowExists("ui:imagePreview:open"), false);
    await assert.rejects(preview.open({ src: "blob:stale", alt: "Dog" }), {
        name: "AbortError",
    });
});

test("the preview provider waits for its shared stylesheet before publishing controls", async (t) => {
    let finishStylesheet;
    const stylesheet = new Promise((resolve) => {
        finishStylesheet = resolve;
    });
    const context = vm.createContext({
        uiCtx,
        registerScopedUiActions,
        ensurePageStylesheet: (url) => {
            assert.equal(url, "/static/styles/reuse/image-preview.css");
            return stylesheet;
        },
    });
    Object.assign(
        context,
        loadTestModule(
            new URL("../image-preview.js", import.meta.url),
            {
                "./escape-html.js": context,
                "./popup.js": context,
                "./page-styles.js": context,
                "./i18n.js": context,
                "./ui-ctx.js": context,
                "./scoped-actions.js": context,
                "./toast.js": context,
            },
            context,
        ),
    );
    const lifecycle = createProviderLifecycle({
        uiCtx,
        importProvider: async () => ({ mountProvider: context.mountProvider }),
    });
    t.after(() => lifecycle.reconcile([]));
    const mounting = lifecycle.reconcile([{ scriptUrl: "/image-preview.js" }]);
    await new Promise(setImmediate);
    assert.equal(uiCtx.capabilities.get("ui:imagePreview"), undefined);
    finishStylesheet();
    await mounting;
    assert.equal(
        typeof uiCtx.capabilities.get("ui:imagePreview").render,
        "function",
    );
    assert.equal(uiCtx.flowExists("ui:imagePreview:open"), true);
});

test("a failed preview action reports a localized error toast and permits another attempt", async (t) => {
    const state = await fixture(t);
    uiCtx.extendFlow(
        "ui:imagePreview:open",
        "execute",
        { id: "test:reject-preview", order: -100 },
        () => {
            throw new Error("preview_failed");
        },
    );
    await state.activate();
    assert.equal(state.failures.length, 1);
    assert.equal(
        state.failures[0][0],
        "Die Bildvorschau konnte nicht geöffnet werden.",
    );
    assert.equal(state.failures[0][1].variant, "error");
    await state.activate();
    assert.equal(state.failures.length, 2);
});

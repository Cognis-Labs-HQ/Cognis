import { loadTestModule } from "../../../../tooling/reuse/test-module.ts";
import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { uiCtx } from "../../ui-ctx.js";
import { createProviderLifecycle } from "../../provider-lifecycle.js";
import { registerScopedUiActions } from "../../scoped-actions.js";

async function fixture(t) {
    const bounds = { left: 24, top: 180, width: 1200 };
    const footer = { getBoundingClientRect: () => ({ top: 850 }) };
    const header = {};
    const overlays = new Set();
    const events = new EventTarget();
    const observers = [];
    const stylesLoaded = [];
    const page = {
        getBoundingClientRect: () => bounds,
        append: () => {
            throw new Error("overlay_must_escape_containing_block");
        },
    };
    const context = vm.createContext({
        AbortController,
        AbortSignal,
        registerScopedUiActions,
        ensurePageStylesheet: async (url) => stylesLoaded.push(url),
        window: {
            innerHeight: 900,
            addEventListener: (...args) => events.addEventListener(...args),
        },
        document: {
            body: { append: (element) => overlays.add(element) },
            querySelector: (selector) =>
                ({
                    ".app-page__main": page,
                    ".global-footer": footer,
                    ".site-header": header,
                })[selector],
            createElement: () => {
                const element = {
                    style: {},
                    remove: () => overlays.delete(element),
                };
                return element;
            },
        },
        ResizeObserver: class {
            constructor(callback) {
                this.callback = callback;
                this.targets = [];
                observers.push(this);
            }
            observe(target) {
                this.targets.push(target);
            }
            disconnect() {
                this.targets = [];
            }
        },
    });
    Object.assign(
        context,
        loadTestModule(
            new URL("../../page-overlay.js", import.meta.url),
            { "./page-styles.js": context, "./scoped-actions.js": context },
            context,
        ),
    );
    const lifecycle = createProviderLifecycle({
        uiCtx,
        importProvider: async () => ({ mountProvider: context.mountProvider }),
    });
    await lifecycle.reconcile([{ scriptUrl: "/page-overlay.js" }]);
    t.after(() => lifecycle.reconcile([]));
    return {
        bounds,
        overlays,
        events,
        observers,
        stylesLoaded,
        lifecycle,
        context,
    };
}

test("page overlays run through the registered flow and track visible shell geometry", async (t) => {
    const state = await fixture(t);
    let executions = 0;
    uiCtx.extendFlow(
        "ui:pageOverlay:create",
        "execute",
        { id: "test:observeOverlay" },
        () => executions++,
    );
    const boundary = await uiCtx.capabilities
        .get("ui:pageOverlay")
        .create({ bottomInset: 16 });
    assert.equal(executions, 1);
    assert.deepEqual(state.stylesLoaded, [
        "/static/styles/reuse/page-overlay.css",
    ]);
    assert.equal(boundary.element.style.top, "180px");
    assert.equal(boundary.element.style.height, "654px");
    assert.equal(boundary.element.style.width, "1200px");
    assert.equal(state.observers[0].targets.length, 3);
    state.bounds.top = -50;
    state.bounds.width = 800;
    state.events.dispatchEvent(new Event("scroll"));
    assert.equal(boundary.element.style.top, "0px");
    assert.equal(boundary.element.style.height, "834px");
    state.observers[0].callback();
    assert.equal(boundary.element.style.width, "800px");
    state.context.window.innerHeight = 600;
    state.events.dispatchEvent(new Event("resize"));
    assert.equal(boundary.element.style.height, "584px");
});

test("closing a caller or unloading the provider releases overlays and stops geometry updates", async (t) => {
    const state = await fixture(t);
    const controller = new AbortController();
    const capability = uiCtx.capabilities.get("ui:pageOverlay");
    const first = await capability.create({ signal: controller.signal });
    const second = await capability.create();
    assert.equal(state.overlays.size, 2);
    controller.abort();
    first.destroy();
    assert.equal(state.overlays.size, 1);
    assert.equal(state.observers[0].targets.length, 0);
    state.bounds.width = 500;
    state.events.dispatchEvent(new Event("resize"));
    assert.equal(first.element.style.width, "1200px");
    assert.equal(second.element.style.width, "500px");
    await state.lifecycle.reconcile([]);
    assert.equal(state.overlays.size, 0);
    assert.equal(state.observers[1].targets.length, 0);
    await assert.rejects(capability.create(), { name: "AbortError" });
});

test("page overlay creation validates insets and refuses aborted callers before mounting", async (t) => {
    const state = await fixture(t);
    const capability = uiCtx.capabilities.get("ui:pageOverlay");
    for (const bottomInset of [-1, Infinity, "16"])
        await assert.rejects(
            capability.create({ bottomInset }),
            /invalid_page_overlay_inset/,
        );
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(capability.create({ signal: controller.signal }), {
        name: "AbortError",
    });
    assert.equal(state.overlays.size, 0);
});

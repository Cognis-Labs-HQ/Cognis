import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { initLanguagePrefs } from "../language-prefs.js";
import { saveUiPreferences } from "../../../reuse/ui-preferences.js";
import { uiCtx } from "../../../reuse/ui-ctx.js";

async function fixture(
    context,
    { stacked = false, priority = ["de", "en"] } = {},
) {
    const dom = new JSDOM(
        '<main><table id="available-languages" class="language-table"></table><table id="preferred-languages" class="language-table"></table></main>',
        { url: "https://cognis.test/settings" },
    );
    const previous = new Map();
    for (const name of ["window", "document", "localStorage", "navigator"]) {
        previous.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
        Object.defineProperty(globalThis, name, {
            configurable: true,
            value: dom.window[name],
        });
    }
    const catalog = {
        load: async () =>
            ["en", "de", "ja", "id"].map((iso_code) => ({
                iso_code,
                name: iso_code,
            })),
    };
    assert.equal(
        uiCtx.capabilities.contribute("ui:languageCatalog", catalog),
        true,
    );
    const abort = new dom.window.AbortController();
    const dirty = [];
    const errors = [];
    dom.window.addEventListener("error", (event) => errors.push(event.error));
    const root = dom.window.document.querySelector("main");
    const prefs = initLanguagePrefs(root, priority, {
        signal: abort.signal,
        onDirtyChange: (value) => dirty.push(value),
    });
    context.after(() => {
        abort.abort();
        uiCtx.capabilities.remove("ui:languageCatalog", catalog);
        dom.window.close();
        for (const [name, descriptor] of previous) {
            if (descriptor) Object.defineProperty(globalThis, name, descriptor);
            else delete globalThis[name];
        }
        assert.deepEqual(errors, []);
    });
    await prefs.init();
    function layout() {
        for (const [index, table] of [
            ...root.querySelectorAll("table"),
        ].entries()) {
            const left = stacked ? 0 : index * 200;
            const top = stacked ? index * 160 : 0;
            table.getBoundingClientRect = () => ({
                left,
                right: left + 180,
                top,
                bottom: top + 120,
                height: 120,
            });
            for (const [rowIndex, row] of [...table.children].entries()) {
                row.getBoundingClientRect = () => ({
                    left,
                    right: left + 180,
                    top: top + rowIndex * 40,
                    bottom: top + (rowIndex + 1) * 40,
                    height: 40,
                });
                row.lastElementChild.setPointerCapture = () => {};
                row.lastElementChild.releasePointerCapture = () => {};
                row.lastElementChild.hasPointerCapture = () => true;
            }
        }
    }
    layout();
    function pointer(node, type, x = 250, y = 5, extra = {}) {
        const event = new dom.window.Event(type, {
            bubbles: true,
            cancelable: true,
        });
        Object.assign(event, {
            pointerType: "touch",
            pointerId: 1,
            clientX: x,
            clientY: y,
            button: 0,
            isPrimary: true,
            ...extra,
        });
        node.dispatchEvent(event);
        return event;
    }
    const handle = (iso) =>
        root.querySelector(`[data-lang-row="${iso}"] .drag-handle`);
    function native(node, type, x = 250, y = 5) {
        return pointer(node, type, x, y, {
            dataTransfer: { setData() {}, getData: () => "ja" },
        });
    }
    return { root, prefs, abort, dirty, pointer, native, handle, layout, dom };
}

test("touch transfer inserts at the row in the destination table", async (context) => {
    const { prefs, pointer, handle } = await fixture(context);
    const source = handle("id");
    pointer(source, "pointerdown", 50, 45);
    pointer(source, "pointerup", 250, 5);
    assert.deepEqual(prefs.getPriority(), ["id", "de", "en"]);
});

test("pointer cancellation leaves language priority and mode unchanged", async (context) => {
    const { prefs, pointer, handle, dirty } = await fixture(context);
    const source = handle("id");
    pointer(source, "pointerdown", 50, 45);
    pointer(source, "pointercancel", 250, 5);
    assert.deepEqual(prefs.getPriority(), ["de", "en"]);
    assert.equal(prefs.getPendingMode(), null);
    assert.deepEqual(dirty, []);
});

for (const ending of [
    "lostpointercapture",
    "outside",
    "abort",
    "rerender",
    "pagehide",
    "blur",
    "escape",
    "remove",
]) {
    test(`interrupted pointer gesture is discarded on ${ending}`, async (context) => {
        const { root, prefs, pointer, handle, abort, dom, dirty } =
            await fixture(context);
        const source = handle("id");
        pointer(source, "pointerdown", 50, 45);
        pointer(source, "pointermove", 250, 5);
        assert.ok(root.querySelector(".drop-target-before"));
        if (ending === "lostpointercapture") pointer(source, ending);
        if (ending === "abort") abort.abort();
        if (ending === "rerender") prefs.renderTables();
        if (["pagehide", "blur"].includes(ending))
            dom.window.dispatchEvent(new dom.window.Event(ending));
        if (ending === "escape")
            root.dispatchEvent(
                new dom.window.KeyboardEvent("keydown", {
                    key: "Escape",
                    bubbles: true,
                }),
            );
        if (ending === "remove") {
            source.closest("tr").remove();
            await Promise.resolve();
        }
        pointer(source, "pointerup", ending === "outside" ? 600 : 250, 5);
        assert.deepEqual(prefs.getPriority(), ["de", "en"]);
        assert.equal(prefs.getPendingMode(), null);
        assert.deepEqual(dirty, []);
        assert.equal(
            root.querySelector(".drop-target-before, .language-row-dragging"),
            null,
        );
    });
}

for (const stacked of [false, true]) {
    test(`repeated touch transfers and reorder with ${stacked ? "stacked" : "side-by-side"} rectangles`, async (context) => {
        const { prefs, pointer, handle, layout, dirty } = await fixture(
            context,
            { stacked },
        );
        const x = stacked ? 50 : 250;
        const top = stacked ? 160 : 0;
        let source = handle("id");
        pointer(source, "pointerdown", 50, 45);
        pointer(source, "pointerup", x, top + 5);
        layout();
        assert.deepEqual(prefs.getPriority(), ["id", "de", "en"]);
        source = handle("en");
        pointer(source, "pointerdown", x, top + 85);
        pointer(source, "pointerup", x, top + 35);
        layout();
        assert.deepEqual(prefs.getPriority(), ["id", "en", "de"]);
        source = handle("id");
        pointer(source, "pointerdown", x, top + 5);
        pointer(source, "pointerup", 50, 5);
        layout();
        assert.deepEqual(prefs.getPriority(), ["en", "de"]);
        assert.deepEqual(dirty, [true, true, true]);
        pointer(source, "pointerup", x, top + 5);
        assert.deepEqual(prefs.getPriority(), ["en", "de"]);
    });
}

for (const child of ["td:first-child", ".drag-handle", null]) {
    test(`native drop accepts destination ${child ?? "table boundary"} exactly once`, async (context) => {
        const { root, prefs, native, handle, dirty } = await fixture(context);
        const table = root.querySelector("#preferred-languages");
        const target = child ? table.querySelector(child) : table;
        native(handle("id"), "dragstart", 50, 45);
        assert.equal(
            native(target, "dragover", 250, child ? 5 : 115).defaultPrevented,
            true,
        );
        native(target, "drop", 250, child ? 5 : 115);
        native(target, "drop", 250, child ? 5 : 115);
        assert.deepEqual(
            prefs.getPriority(),
            child ? ["id", "de", "en"] : ["de", "en", "id"],
        );
        assert.deepEqual(dirty, [true]);
    });
}

test("self drop and external text do not change the draft or manual mode", async (context) => {
    const { prefs, native, handle, dirty } = await fixture(context);
    native(handle("de"), "drop");
    native(handle("de"), "dragstart");
    native(handle("de"), "drop");
    assert.deepEqual(prefs.getPriority(), ["de", "en"]);
    assert.equal(prefs.getPendingMode(), null);
    assert.deepEqual(dirty, []);
});

test("secondary pointers do not complete or cancel the primary gesture", async (context) => {
    const { prefs, pointer, handle } = await fixture(context);
    const source = handle("id");
    pointer(source, "pointerdown", 50, 45);
    pointer(source, "pointercancel", 250, 5, { pointerId: 2 });
    pointer(source, "pointerup", 250, 5, { pointerId: 2 });
    assert.deepEqual(prefs.getPriority(), ["de", "en"]);
    pointer(source, "pointerup", 250, 5);
    assert.deepEqual(prefs.getPriority(), ["id", "de", "en"]);
});

test("english remains enrolled and dropping into an empty available table works", async (context) => {
    const { root, prefs, pointer, handle, layout } = await fixture(context, {
        priority: ["de", "ja", "id", "en"],
    });
    assert.equal(root.querySelector("#available-languages").children.length, 1);
    let source = handle("en");
    pointer(source, "pointerdown");
    pointer(source, "pointerup", 50, 5);
    assert.deepEqual(prefs.getPriority(), ["de", "ja", "id", "en"]);
    layout();
    source = handle("de");
    pointer(source, "pointerdown");
    pointer(source, "pointerup", 50, 5);
    layout();
    assert.deepEqual(prefs.getPriority(), ["ja", "id", "en"]);
});

test("discard and commit remain explicit owner operations after drag", async (context) => {
    const { prefs, pointer, handle, layout } = await fixture(context);
    let source = handle("id");
    pointer(source, "pointerdown", 50, 45);
    pointer(source, "pointerup", 250, 5);
    assert.equal(prefs.isDirty(), true);
    prefs.discard();
    layout();
    assert.deepEqual(prefs.getPriority(), ["de", "en"]);
    source = handle("id");
    pointer(source, "pointerdown", 50, 45);
    pointer(source, "pointerup", 250, 5);
    prefs.commit();
    prefs.discard();
    assert.deepEqual(prefs.getPriority(), ["id", "de", "en"]);
    assert.equal(prefs.isDirty(), false);
});

test("offline preferences permit reordering but reject enrollment changes", async (context) => {
    const { root, dom, prefs, pointer, handle, layout } =
        await fixture(context);
    Object.defineProperty(dom.window.navigator, "onLine", {
        value: false,
        configurable: true,
    });
    prefs.renderTables();
    layout();
    const available = root.querySelector("#available-languages");
    assert.equal(available.getAttribute("aria-disabled"), "true");
    assert.equal(handle("id").closest("tr").getAttribute("draggable"), "false");
    assert.equal(handle("en").closest("tr").getAttribute("draggable"), "true");
    let source = handle("id");
    pointer(source, "pointerdown", 50, 45);
    pointer(source, "pointerup", 250, 5);
    assert.deepEqual(prefs.getPriority(), ["de", "en"]);
    source = handle("en");
    pointer(source, "pointerdown", 250, 45);
    pointer(source, "pointerup", 250, 5);
    layout();
    assert.deepEqual(prefs.getPriority(), ["en", "de"]);
    source = handle("de");
    pointer(source, "pointerdown", 250, 45);
    pointer(source, "pointerup", 50, 5);
    assert.deepEqual(prefs.getPriority(), ["en", "de"]);
    prefs.syncFromBrowser();
    assert.deepEqual(prefs.getPriority(), ["en", "de"]);
    Object.defineProperty(dom.window.navigator, "onLine", {
        value: true,
        configurable: true,
    });
    dom.window.dispatchEvent(
        new dom.window.Event("cognis:connectivity-changed"),
    );
    assert.equal(available.getAttribute("aria-disabled"), "false");
    assert.equal(handle("id").closest("tr").getAttribute("draggable"), "true");
});

test("rejected public preference persistence leaves the language draft retryable", async (context) => {
    const { dom, prefs, pointer, handle } = await fixture(context);
    dom.window.localStorage.setItem(
        "cognis_account",
        "00000000-0000-4000-8000-000000000001",
    );
    dom.window.localStorage.setItem("cognis_access_token", "fixture-token");
    let rejected = true;
    const writes = [];
    const request = async (path, options) => {
        assert.match(path, /preferences\/ui-preferences$/);
        if (options?.method !== "PUT")
            return {
                ok: true,
                json: async () => ({
                    data: {
                        layoutJson: JSON.stringify({
                            languagePriority: ["de", "en"],
                        }),
                    },
                }),
            };
        writes.push(JSON.parse(options.body).layout.languagePriority);
        return { ok: !rejected, status: rejected ? 503 : 200 };
    };
    uiCtx.capabilities.contribute("social:profileRequest", request);
    context.after(() =>
        uiCtx.capabilities.remove("social:profileRequest", request),
    );
    const source = handle("id");
    pointer(source, "pointerdown", 50, 45);
    pointer(source, "pointerup", 250, 5);
    await assert.rejects(
        saveUiPreferences({ languagePriority: prefs.getPriority() }),
        /ui_preferences_save_failed:503/,
    );
    assert.equal(prefs.isDirty(), true);
    assert.equal(prefs.getPendingMode(), "manual");
    assert.deepEqual(prefs.getPriority(), ["id", "de", "en"]);
    rejected = false;
    await saveUiPreferences({ languagePriority: prefs.getPriority() });
    prefs.commit();
    assert.equal(prefs.isDirty(), false);
    assert.deepEqual(writes, [
        ["id", "de", "en"],
        ["id", "de", "en"],
    ]);
});

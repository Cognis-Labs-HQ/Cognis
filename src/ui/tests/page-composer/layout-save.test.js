import test from "node:test";
import assert from "node:assert/strict";
import { flowHost } from "../../reuse/tests/fixtures/flow-host.js";
import {
    createLayoutSaveHandler,
    commitLayoutEdit,
} from "../../reuse/page-composer/layout-save.js";
import { createLayoutPersistence } from "../../reuse/page-composer/layout-persistence.js";

function fixture(context, save) {
    const lifetime = new AbortController();
    const page = new AbortController();
    context.after(() => {
        page.abort();
        lifetime.abort();
    });
    const host = flowHost(lifetime.signal);
    const notices = [],
        logs = [];
    host.ctx.capabilities.contribute("ui:log", (...args) => logs.push(args));
    const i18n = {
        t: (key) =>
            ({
                "ui.reuse.layout_saved": "saved",
                "ui.reuse.layout_save_failed": "failed",
            })[key],
    };
    const update = createLayoutSaveHandler({
        ctx: host.ctx,
        save,
        notify: (...args) => notices.push(args),
        i18n,
        signal: page.signal,
    });
    return { ...host, page, lifetime, notices, logs, update, i18n };
}
const layout = () => ({
    placements: [{ id: "card", col: 1, row: 2, w: 3, h: 4 }],
    hidden: [],
});

test("layout success and failure execute the registered flow and emit one localized toast", async (context) => {
    let fail = false;
    const state = fixture(context, async () => {
        if (fail) throw new TypeError("private detail");
        return { layoutsByGrid: {} };
    });
    assert.ok(await state.update("page", {}, 4, layout()));
    fail = true;
    assert.equal(await state.update("page", {}, 4, layout()), null);
    assert.deepEqual(state.events, [
        "ui:pageComposer:saveLayout",
        "ui:pageComposer:saveLayout",
    ]);
    assert.deepEqual(state.notices, [
        ["saved", { variant: "success" }],
        ["failed", { variant: "error" }],
    ]);
    assert.equal(state.logs[0][0], "info");
    assert.equal(state.logs[1][0], "error");
    assert.equal(state.logs[1][2].errorName, "TypeError");
    assert.ok(!JSON.stringify(state.logs).includes("private detail"));
});

test("concurrent save requests share one immutable write", async (context) => {
    let release;
    let calls = 0;
    const written = [];
    const state = fixture(context, async (...args) => {
        calls++;
        written.push(args[3]);
        await new Promise((resolve) => {
            release = resolve;
        });
        return {};
    });
    const pendingLayout = layout();
    const first = state.update("page", {}, 4, pendingLayout);
    const second = state.update("page", {}, 4, pendingLayout);
    assert.equal(first, second);
    pendingLayout.placements[0].row = 99;
    while (!release) await new Promise((resolve) => setImmediate(resolve));
    release();
    await first;
    assert.equal(calls, 1);
    assert.equal(written[0].placements[0].row, 2);
    assert.equal(state.notices.length, 1);
});

test("page cancellation suppresses late layout feedback", async (context) => {
    let release;
    const state = fixture(context, async () => {
        await new Promise((resolve) => {
            release = resolve;
        });
        return {};
    });
    const pending = state.update("page", {}, 4, layout());
    while (!release) await new Promise((resolve) => setImmediate(resolve));
    state.page.abort();
    release();
    assert.equal(await pending, null);
    assert.equal(state.notices.length, 0);
});

test("missing feedback translations fail explicitly", async (context) => {
    const state = fixture(context, async () => ({}));
    state.i18n.t = (key) => {
        throw new Error(`missing_translation:${key}`);
    };
    await assert.rejects(
        state.update("page", {}, 4, layout()),
        /missing_translation:ui.reuse.layout_saved/,
    );
});

test("failed editor commits retain pending changes and restore interaction", async () => {
    const original = layout();
    const state = {
        layout: structuredClone(original),
        editing: true,
        contentGrid: { inert: false },
        elementsPanel: { inert: false },
    };
    let rendered = 0,
        finished = 0;
    assert.equal(
        await commitLayoutEdit({
            state,
            prepare() {
                state.layout.placements[0].row = 0;
            },
            save: async () => false,
            finish() {
                finished++;
            },
            render() {
                rendered++;
            },
        }),
        false,
    );
    assert.deepEqual(state.layout, original);
    assert.equal(state.editing, true);
    assert.equal(state.contentGrid.inert, false);
    assert.equal(state.elementsPanel.inert, false);
    assert.equal(finished, 0);
    assert.equal(rendered, 1);
});

test("HTTP errors and missing sessions cannot be reported as a successful write", async (context) => {
    const previous = globalThis.localStorage;
    globalThis.localStorage = { getItem: () => "fixture" };
    context.after(() => {
        globalThis.localStorage = previous;
    });
    const persistence = createLayoutPersistence({
        apiFetch: async () => ({ ok: false, status: 500 }),
    });
    await assert.rejects(
        persistence.saveLayoutByKey("page", {}, 4, layout()),
        (error) => error.httpStatus === 500,
    );
    globalThis.localStorage = { getItem: () => null };
    await assert.rejects(
        persistence.saveLayoutByKey("page", {}, 4, layout()),
        /layout_session_unavailable/,
    );
});

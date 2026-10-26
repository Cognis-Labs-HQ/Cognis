import test from "node:test";
import assert from "node:assert/strict";
import { loadTestModule } from "../../../../tooling/reuse/test-module.ts";
import { uiCtx } from "../../../../ui/reuse/ui-ctx.js";

function fixture() {
    const scheduled = [];
    const popups = [];
    const id = `test:emptyStudy:${crypto.randomUUID()}`;
    uiCtx.extendFlow("defer-page-action", "schedule", { id }, ({ input }) => {
        scheduled.push(input.action);
    });
    const helper = loadTestModule(
        new URL(
            "../../../../gateways/study/ui/offline-content.js",
            import.meta.url,
        ),
        {
            "/static/reuse/offline-state.js": { isOffline: () => true },
            "/static/reuse/ui-ctx.js": { uiCtx },
            "/static/reuse/popup.js": {
                openPopup: async (options) => popups.push(options),
            },
            "/static/reuse/escape-html.js": { escapeHtml: String },
        },
        { structuredClone, console },
    );
    const data = loadTestModule(new URL("../ui/app/data.js", import.meta.url), {
        "/static/gateways/study/offline-content.js": helper,
        "/static/reuse/toast.js": {
            showToast: () => assert.fail("cache misses are not error toasts"),
        },
        "/static/gateways/study/library-client.js": {
            fetchLibrarySchemas: () =>
                Promise.reject(new Error("offline_read_unavailable")),
            fetchLibraryLocations: () =>
                assert.fail(
                    "do not request uncached data after a missing schema",
                ),
            fetchLibraryEntries: () => assert.fail("no network request"),
            fetchViewedLibraryEntryIds: () => assert.fail("no network request"),
        },
    });
    return {
        helper,
        data,
        scheduled,
        popups,
        dispose: () =>
            uiCtx.removeFlowHook("defer-page-action", "schedule", id),
    };
}

test("an uncached Explore model is empty and schedules one targeted notice through ctx", async () => {
    const state = fixture();
    const controller = new AbortController();
    const i18n = {
        t: (key) =>
            key === "ui.reuse.offline_no_cached_content"
                ? "No offline cached content available."
                : key,
    };
    try {
        const model = await state.data.loadLibrary("ja", i18n, {
            signal: controller.signal,
        });
        assert.equal(model.schemas.length, 0);
        assert.equal(model.entries.length, 0);
        await new Promise(setImmediate);
        assert.equal(state.scheduled.length, 1);
        state.helper.showOfflineContentNotice(i18n, controller.signal);
        await new Promise(setImmediate);
        assert.equal(state.scheduled.length, 1);
        await state.scheduled[0]();
        assert.equal(
            state.popups[0].body,
            "No offline cached content available.",
        );
        const next = new AbortController();
        state.helper.showOfflineContentNotice(i18n, next.signal);
        await new Promise(setImmediate);
        next.abort();
        await state.scheduled[1]();
        assert.equal(state.popups.length, 1);
    } finally {
        controller.abort();
        state.dispose();
    }
});

test("empty Study snapshot fallback never conceals consent or authorization denial", async () => {
    const state = fixture();
    try {
        assert.equal(
            (
                await state.helper.readStudySnapshot(
                    () => Promise.reject(new Error("offline_read_unavailable")),
                    [],
                )
            ).length,
            0,
        );
        await assert.rejects(
            state.helper.readStudySnapshot(
                () => Promise.reject(new Error("offline_access_denied")),
                [],
            ),
            /offline_access_denied/,
        );
    } finally {
        state.dispose();
    }
});

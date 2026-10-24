import { loadTestModule } from "../../../../../tooling/reuse/test-module.ts";
import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { uiCtx } from "../../../../../ui/reuse/ui-ctx.js";

test("the floating practice preference restores the saved mode, confirms session resets and persists only accepted changes", async () => {
    const saved = [];
    const resets = [];
    const popups = [];
    let decision = "cancel";
    let handler;
    const select = {
        value: "",
        addEventListener: (_event, callback) => {
            handler = callback;
        },
    };
    const context = vm.createContext({
        uiCtx,
        loadUiPreferences: async () => ({ studyPracticeMode: "writing" }),
        saveUiPreferences: async (patch) => saved.push(patch),
        openPopup: async (options) => {
            popups.push(options);
            return decision;
        },
        escapeHtml: String,
        showToast: () => assert.fail("Unexpected preference failure"),
    });
    Object.assign(
        context,
        loadTestModule(
            new URL(
                "../../../../../gateways/study/ui/reuse/action-flows.js",
                import.meta.url,
            ),
            { "/static/reuse/ui-ctx.js": context },
            context,
        ),
    );
    Object.assign(
        context,
        loadTestModule(
            new URL("../../ui/app/actions.js", import.meta.url),
            { "/static/gateways/study/reuse/action-flows.js": context },
            context,
        ),
    );
    Object.assign(
        context,
        loadTestModule(
            new URL("../../ui/reuse/practice-mode.js", import.meta.url),
            {
                "/static/reuse/popup.js": context,
                "/static/reuse/escape-html.js": context,
                "/static/reuse/format-template.js": context,
                "/static/reuse/ui-preferences.js": context,
                "/static/reuse/toast.js": context,
                "../app/actions.js": context,
            },
            context,
        ),
    );
    const controller = new AbortController();
    const preference = await context.createPracticeModePreference({
        i18n: { t: (key) => key },
        templates: {},
        signal: controller.signal,
        isActive: () => true,
        onChange: (mode) => resets.push(mode),
    });
    const slot = { hidden: true, querySelector: () => select };
    preference.mount(slot);
    assert.equal(slot.hidden, false);
    assert.equal(select.value, "writing");
    preference.setWritingAvailable(false);
    assert.equal(slot.hidden, true);
    assert.equal(preference.value, "reading");
    assert.equal(saved.length, 0);
    preference.setWritingAvailable(true);
    assert.equal(slot.hidden, false);
    assert.equal(preference.value, "writing");

    select.value = "reading";
    await handler();
    assert.equal(select.value, "writing");
    assert.equal(saved.length, 0);
    assert.equal(resets.length, 0);
    decision = "discard";
    select.value = "reading";
    await handler();
    assert.equal(preference.value, "reading");
    assert.equal(saved[0].studyPracticeMode, "reading");
    assert.deepEqual(resets, ["reading"]);
    assert.equal(popups[0].variant, "warning");
    controller.abort();
});

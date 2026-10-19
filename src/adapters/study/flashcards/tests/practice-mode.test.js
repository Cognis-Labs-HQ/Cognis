import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { uiCtx } from "../../../../ui/reuse/ui-ctx.js";

function load(path, context) {
    vm.runInContext(
        readFileSync(new URL(path, import.meta.url), "utf8")
            .replace(/^import[\s\S]*?;\n/gm, "")
            .replace(/export (async )?function/g, "$1function")
            .replaceAll("export const", "const"),
        context,
    );
}

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
    load("../../../../gateways/study/ui/reuse/action-flows.js", context);
    load("../ui/app/actions.js", context);
    load("../ui/reuse/practice-mode.js", context);
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

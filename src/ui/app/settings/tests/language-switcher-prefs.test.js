import assert from "node:assert/strict";
import test from "node:test";

import { initCheckboxPrefs } from "../checkbox-prefs.js";

function createRoot() {
    let input = null;
    return {
        mountInput() {
            input = { checked: false, onchange: null };
            return input;
        },
        querySelector() {
            return input;
        },
    };
}

test("language switcher preference defaults on and tracks changes", () => {
    const root = createRoot();
    const dirtyStates = [];
    const committedStates = [];
    const controller = initCheckboxPrefs(root, {
        existingPrefs: {},
        onDirtyChange: (dirty) => dirtyStates.push(dirty),
        onCommit: (visible) => committedStates.push(visible),
    });
    const input = root.mountInput();

    controller.bind();
    assert.equal(input.checked, true);
    input.checked = false;
    input.onchange();
    assert.equal(controller.isDirty(), true);
    assert.deepEqual(dirtyStates, [true]);
    assert.deepEqual(committedStates, []);

    controller.commit();
    assert.deepEqual(committedStates, [false]);
});

test("language switcher preference rebinds after settings remount", () => {
    const root = createRoot();
    const controller = initCheckboxPrefs(root, { existingPrefs: {} });
    const firstInput = root.mountInput();
    controller.bind();
    firstInput.checked = false;
    firstInput.onchange();

    const remountedInput = root.mountInput();
    controller.bind();
    assert.equal(remountedInput.checked, false);

    controller.discard();
    assert.equal(remountedInput.checked, true);
});

test("discard restores saved state without applying pending visibility", () => {
    const root = createRoot();
    const committedStates = [];
    const controller = initCheckboxPrefs(root, {
        existingPrefs: {},
        onCommit: (visible) => committedStates.push(visible),
    });
    const input = root.mountInput();
    controller.bind();
    input.checked = false;
    input.onchange();

    controller.discard();
    assert.equal(input.checked, true);
    assert.deepEqual(committedStates, []);
});

test("offline setting saves and discards independently using the shared checkbox controller", () => {
    const root = createRoot();
    const input = root.mountInput();
    const controller = initCheckboxPrefs(root, {
        existingPrefs: { offlineEnabled: false },
        preference: "offlineEnabled",
        selector: "#pref-offline-enabled",
    });
    controller.bind();
    assert.equal(input.checked, false);
    input.checked = true;
    input.onchange();
    assert.equal(controller.isDirty(), true);
    controller.discard();
    assert.equal(input.checked, false);
    input.checked = true;
    input.onchange();
    controller.commit();
    assert.equal(controller.getValue(), true);
    assert.equal(controller.isDirty(), false);
});

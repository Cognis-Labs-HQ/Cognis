import assert from "node:assert/strict";
import test from "node:test";

import { initLanguageSwitcherPrefs } from "../language-switcher-prefs.js";

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
    const visibilityStates = [];
    const controller = initLanguageSwitcherPrefs(root, {
        existingPrefs: {},
        onDirtyChange: (dirty) => dirtyStates.push(dirty),
        onValueChange: (visible) => visibilityStates.push(visible),
    });
    const input = root.mountInput();

    controller.bind();
    assert.equal(input.checked, true);
    input.checked = false;
    input.onchange();
    assert.equal(controller.isDirty(), true);
    assert.deepEqual(dirtyStates, [true]);
    assert.deepEqual(visibilityStates, [false]);
});

test("language switcher preference rebinds after settings remount", () => {
    const root = createRoot();
    const controller = initLanguageSwitcherPrefs(root, { existingPrefs: {} });
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

test("discard restores the saved switcher visibility", () => {
    const root = createRoot();
    const visibilityStates = [];
    const controller = initLanguageSwitcherPrefs(root, {
        existingPrefs: {},
        onValueChange: (visible) => visibilityStates.push(visible),
    });
    const input = root.mountInput();
    controller.bind();
    input.checked = false;
    input.onchange();

    controller.discard();
    assert.deepEqual(visibilityStates, [false, true]);
});

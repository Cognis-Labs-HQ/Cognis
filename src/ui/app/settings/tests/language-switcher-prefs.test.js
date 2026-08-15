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
    const controller = initLanguageSwitcherPrefs(root, {
        existingPrefs: {},
        onDirtyChange: (dirty) => dirtyStates.push(dirty),
    });
    const input = root.mountInput();

    controller.bind();
    assert.equal(input.checked, true);
    input.checked = false;
    input.onchange();
    assert.equal(controller.isDirty(), true);
    assert.deepEqual(dirtyStates, [true]);
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

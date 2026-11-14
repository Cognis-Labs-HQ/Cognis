import test from "node:test";
import assert from "node:assert/strict";
import { loadTestModule } from "../../../tooling/reuse/test-module.ts";

test("online-only Settings controls follow connectivity and retain their original disabled state", () => {
    let offline = false;
    const window = new EventTarget();
    const scope = new AbortController();
    const controls = [{ disabled: false }, { disabled: true }];
    const root = { querySelectorAll: () => controls };
    const { bindOnlineSettingsControls } = loadTestModule(
        new URL("../../app/settings/online-controls.js", import.meta.url),
        {
            "../../reuse/offline-state.js": { isOffline: () => offline },
        },
        { window },
    );
    const refresh = bindOnlineSettingsControls(root, scope.signal);
    refresh();
    offline = true;
    window.dispatchEvent(new Event("cognis:connectivity-changed"));
    assert.deepEqual(
        controls.map((control) => control.disabled),
        [true, true],
    );
    offline = false;
    window.dispatchEvent(new Event("cognis:connectivity-changed"));
    assert.deepEqual(
        controls.map((control) => control.disabled),
        [false, true],
    );
    scope.abort();
    offline = true;
    window.dispatchEvent(new Event("cognis:connectivity-changed"));
    assert.deepEqual(
        controls.map((control) => control.disabled),
        [false, true],
    );
});

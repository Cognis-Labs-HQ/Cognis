import { loadLibraryUiModule } from "./reuse/ui-module.ts";
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";

test("Escape clears selected cards and hides actions, respecting popup-consumed keys", () => {
    const handlers = new Map();
    const ctx = vm.createContext({
        window: {
            addEventListener: (name, handler) => handlers.set(name, handler),
        },
    });
    Object.assign(ctx, loadLibraryUiModule("app/selection.js", ctx));
    let enabled = true;
    const selected = [{ checked: true }, { checked: true }];
    const actions = { hidden: false };
    const root = {
        classList: {
            contains: () => enabled,
            toggle: (_name, value) => {
                enabled = value;
            },
        },
        querySelectorAll: () => selected,
        querySelector: () => actions,
    };
    ctx.bindSelectionEscape(root, new AbortController().signal);
    let prevented = 0;
    const key = {
        key: "Escape",
        preventDefault: () => {
            prevented += 1;
        },
    };
    handlers.get("keydown")({ ...key, defaultPrevented: true });
    assert.equal(enabled, true);
    handlers.get("keydown")(key);
    assert.equal(enabled, false);
    assert.deepEqual(
        selected.map(({ checked }) => checked),
        [false, false],
    );
    assert.equal(actions.hidden, true);
    assert.equal(prevented, 1);
});

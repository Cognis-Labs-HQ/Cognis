import test from "node:test";
import assert from "node:assert/strict";
import { resolveInitialModuleEnabledState } from "../../server.js";

test("resolveInitialModuleEnabledState enables core modules", () => {
    const isEnabled = resolveInitialModuleEnabledState(
        {
            id: "cognis-core",
            class: "core",
        },
        false,
    );
    assert.equal(isEnabled, true);
});

test("resolveInitialModuleEnabledState enables default modules without persisted state", () => {
    const isEnabled = resolveInitialModuleEnabledState(
        {
            id: "study-language-en",
            class: "extension",
            enabledByDefault: true,
        },
        undefined,
    );
    assert.equal(isEnabled, true);
});

test("resolveInitialModuleEnabledState respects persisted disable over defaults", () => {
    const isEnabled = resolveInitialModuleEnabledState(
        {
            id: "study-language-ja",
            class: "extension",
            enabledByDefault: true,
        },
        false,
    );
    assert.equal(isEnabled, false);
});

test("resolveInitialModuleEnabledState keeps non-default extensions disabled by default", () => {
    const isEnabled = resolveInitialModuleEnabledState(
        {
            id: "jitsi-meet",
            class: "extension",
        },
        undefined,
    );
    assert.equal(isEnabled, false);
});

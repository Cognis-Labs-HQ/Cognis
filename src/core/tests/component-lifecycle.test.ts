import test from "node:test";
import assert from "node:assert/strict";
import { resolveComponentEnabledState } from "../index.js";

test("locked components ignore a persisted disabled lifecycle state", () => {
    assert.equal(
        resolveComponentEnabledState({
            persistedEnabled: false,
            locked: true,
        }),
        true,
    );
});

test("unlocked components retain persisted and default lifecycle states", () => {
    assert.equal(
        resolveComponentEnabledState({
            persistedEnabled: false,
            defaultEnabled: true,
        }),
        false,
    );
    assert.equal(resolveComponentEnabledState({ defaultEnabled: true }), true);
});

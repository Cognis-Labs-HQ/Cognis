import test from "node:test";
import assert from "node:assert/strict";
import { createOfflinePolicy } from "../offline-policy.js";

function fixture() {
    const values = new Map([["cognis_account", "first"]]);
    let broken = false;
    const policy = createOfflinePolicy({
        storage: () => ({
            getItem: (key) => values.get(key) ?? null,
            setItem: (key, value) => {
                if (broken) throw new Error("quota");
                values.set(key, value);
            },
        }),
    });
    return {
        policy,
        values,
        failWrites: () => {
            broken = true;
        },
    };
}

test("unknown requirements and unknown consent fail closed; no required guards permits offline access", () => {
    const { policy } = fixture();
    assert.equal(policy.allows(), false);
    policy.configure(["legal"]);
    assert.equal(policy.allows(), false);
    policy.update("legal", { allowed: true, revision: "v1" });
    assert.equal(policy.allows(), true);
    policy.update("legal", { allowed: false, revision: "v2" });
    assert.equal(policy.allows(), false);
    policy.configure([]);
    assert.equal(policy.allows(), true);
});

test("a receipt cannot authorize another account or override a failed policy write", () => {
    const state = fixture();
    state.policy.configure(["legal"]);
    state.policy.update("legal", { allowed: true, revision: "v1" });
    state.values.set("cognis_account", "second");
    assert.equal(state.policy.allows(), false);
    state.values.set("cognis_account", "first");
    state.failWrites();
    assert.throws(
        () => state.policy.update("legal", { allowed: false, revision: "v2" }),
        /quota/,
    );
    assert.equal(state.policy.allows(), false);
});

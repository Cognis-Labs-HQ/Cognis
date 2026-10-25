import test from "node:test";
import assert from "node:assert/strict";
import { loadTestModule } from "../../../tooling/reuse/test-module.ts";

test("waiting for pending activity cannot send or enqueue a previous account's operation under a new identity", async () => {
    for (const offline of [true, false]) {
        for (const changedKey of ["cognis_account", "cognis_access_token"]) {
            const values = new Map([
                ["cognis_account", "first"],
                ["cognis_access_token", "token"],
            ]);
            const guard = loadTestModule(
                new URL("../offline-identity.js", import.meta.url),
                {},
                { localStorage: { getItem: (key) => values.get(key) } },
            );
            const { deliverOrQueue } = loadTestModule(
                new URL("../offline-delivery.js", import.meta.url),
                {
                    "./offline-identity.js": guard,
                    "./offline-state.js": {
                        isOffline: () => offline,
                        offlineEnabled: () => true,
                    },
                },
            );
            let release;
            const pending = new Promise((resolve) => {
                release = resolve;
            });
            const outbox = {
                pending: () => pending,
                submit: () => assert.fail("cross-account enqueue"),
            };
            const operation = deliverOrQueue(
                { capabilities: { get: () => outbox } },
                "posts",
                "attempt",
                { content: "First account" },
                () => assert.fail("cross-account send"),
            );
            values.set(changedKey, "other");
            release([]);
            await assert.rejects(operation, /offline_account_changed/);
        }
    }
});

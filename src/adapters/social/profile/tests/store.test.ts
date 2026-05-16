import test from "node:test";
import assert from "node:assert/strict";
import { InMemoryTestExecutor } from "../../../../gateways/db/tests/in-memory-test-executor.js";
import { DbProfileStore } from "../store.js";

test("profile store resolves handles case-insensitively", async () => {
    const databaseExecutor = new InMemoryTestExecutor();
    const store = new DbProfileStore(databaseExecutor);
    await store.ensureSchema();
    await store.createProfile("alice-account", "AliceUser", "user", "Alice");

    const profile = await store.getProfileByHandle("aliceuser");

    assert.ok(profile);
    assert.equal(profile?.accountId, "alice-account");
    assert.equal(profile?.handle, "AliceUser");
});

import test from "node:test";
import assert from "node:assert/strict";
import { DbFileQuotaStore } from "../index.js";
import { InMemoryTestExecutor } from "../../../../gateways/db/tests/in-memory-test-executor.js";

function buildStore(): DbFileQuotaStore {
    const executor = new InMemoryTestExecutor();
    return new DbFileQuotaStore(() => executor);
}

test("getGlobalDefault falls back to the built-in default when unset", async () => {
    const store = buildStore();
    assert.equal(await store.getGlobalDefault(), 5_368_709_120);
});

test("setNamespaceDefault and listNamespaceDefaults round-trip", async () => {
    const store = buildStore();
    await store.setNamespaceDefault("user", 1000);
    await store.setNamespaceDefault("profile", 2000);
    const defaults = await store.listNamespaceDefaults();
    assert.deepEqual(
        defaults.map((d) => [d.namespaceId, d.quotaBytes]).sort(),
        [
            ["profile", 2000],
            ["user", 1000],
        ],
    );
});

test("ensureNamespaceDefault seeds only once (idempotent)", async () => {
    const store = buildStore();
    await store.ensureNamespaceDefault("user", 1000);
    await store.ensureNamespaceDefault("user", 9999);
    const defaults = await store.listNamespaceDefaults();
    assert.equal(defaults.length, 1);
    assert.equal(defaults[0].quotaBytes, 1000);
});

test("provisionUser snapshots current defaults for a new user", async () => {
    const store = buildStore();
    await store.setNamespaceDefault("user", 1000);
    await store.setNamespaceDefault("profile", 2000);
    await store.setGlobalDefault(5000);

    await store.provisionUser("alice");

    assert.equal(await store.getUserNamespaceQuota("alice", "user"), 1000);
    assert.equal(await store.getUserNamespaceQuota("alice", "profile"), 2000);
    assert.equal(await store.getUserGlobalQuota("alice"), 5000);
});

test("provisionUser is idempotent and does not overwrite existing per-user overrides", async () => {
    const store = buildStore();
    await store.setNamespaceDefault("user", 1000);
    await store.setGlobalDefault(5000);
    await store.provisionUser("alice");

    await store.setUserNamespaceQuota("alice", "user", 42);
    await store.provisionUser("alice");

    assert.equal(await store.getUserNamespaceQuota("alice", "user"), 42);
});

test("changing defaults after provisioning does not affect already-provisioned users", async () => {
    const store = buildStore();
    await store.setNamespaceDefault("user", 1000);
    await store.setGlobalDefault(5000);
    await store.provisionUser("alice");

    await store.setNamespaceDefault("user", 99999);

    assert.equal(await store.getUserNamespaceQuota("alice", "user"), 1000);
});

test("setUserNamespaceQuota allows admin overrides after provisioning", async () => {
    const store = buildStore();
    await store.setNamespaceDefault("user", 1000);
    await store.provisionUser("alice");

    await store.setUserNamespaceQuota("alice", "user", 5000);
    assert.equal(await store.getUserNamespaceQuota("alice", "user"), 5000);
});

test("getUserNamespaceQuota returns undefined for an unprovisioned user", async () => {
    const store = buildStore();
    assert.equal(
        await store.getUserNamespaceQuota("nobody", "user"),
        undefined,
    );
});

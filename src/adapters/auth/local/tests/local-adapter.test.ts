import test from "node:test";
import assert from "node:assert/strict";
import { VolatileLocalAccountStore } from "../auth-adapter.js";
import { createAdapter } from "../index.js";

test("local adapter authenticates valid credentials", async () => {
    const store = new VolatileLocalAccountStore();
    await store.register("alice", "secret123");
    const adapter = createAdapter(store);
    const ctx = await adapter.authenticate({
        username: "alice",
        password: "secret123",
    });
    assert.ok(ctx);
    assert.equal(ctx.provider, "local");
    assert.equal(ctx.accountId, "alice");
});

test("local adapter returns null for wrong password", async () => {
    const store = new VolatileLocalAccountStore();
    await store.register("bob", "correct");
    const adapter = createAdapter(store);
    const ctx = await adapter.authenticate({
        username: "bob",
        password: "wrong",
    });
    assert.equal(ctx, null);
});

test("local adapter returns empty config schema", () => {
    const store = new VolatileLocalAccountStore();
    const adapter = createAdapter(store);
    assert.deepEqual(adapter.getConfigSchema(), []);
});

test("local adapter register creates account", async () => {
    const store = new VolatileLocalAccountStore();
    const adapter = createAdapter(store);
    const result = await adapter.register("charlie", "pass");
    assert.equal(result.username, "charlie");
});

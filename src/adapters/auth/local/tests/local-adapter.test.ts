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

test("local adapter supports password reset", async () => {
    const store = new VolatileLocalAccountStore();
    await store.register("delta", "start-pass");
    const adapter = createAdapter(store);
    assert.deepEqual(adapter.getPasswordResetSupport?.(), {
        supported: true,
    });
    const result = await adapter.resetPassword?.("delta", "next-pass");
    assert.equal(result?.updated, true);
    const oldLogin = await adapter.authenticate({
        username: "delta",
        password: "start-pass",
    });
    const newLogin = await adapter.authenticate({
        username: "delta",
        password: "next-pass",
    });
    assert.equal(oldLogin, null);
    assert.equal(newLogin?.accountId, "delta");
});

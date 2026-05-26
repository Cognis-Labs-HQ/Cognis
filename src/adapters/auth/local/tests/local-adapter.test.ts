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
    const result = await adapter.resetPassword?.(
        "delta",
        "start-pass",
        "next-pass",
    );
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

test("local adapter rejects password reset with incorrect current password", async () => {
    const store = new VolatileLocalAccountStore();
    await store.register("echo", "start-pass");
    const adapter = createAdapter(store);
    const result = await adapter.resetPassword?.(
        "echo",
        "wrong-pass",
        "next-pass",
    );
    assert.equal(result?.updated, false);
    assert.equal(
        result?.message,
        "gateway.auth.security.error.current_password_incorrect",
    );
});

test("local adapter rejects previously used passwords", async () => {
    const store = new VolatileLocalAccountStore();
    await store.register("foxtrot", "start-pass");
    const adapter = createAdapter(store);
    const firstReset = await adapter.resetPassword?.(
        "foxtrot",
        "start-pass",
        "next-pass",
    );
    assert.equal(firstReset?.updated, true);
    const secondReset = await adapter.resetPassword?.(
        "foxtrot",
        "next-pass",
        "start-pass",
    );
    assert.equal(secondReset?.updated, false);
    assert.equal(secondReset?.message, "Password was used previously.");
});

test("local adapter volatile history keeps a bounded password history", async () => {
    const store = new VolatileLocalAccountStore();
    await store.register("golf", "pass-00");
    const adapter = createAdapter(store);
    let currentPassword = "pass-00";
    for (let passwordIndex = 1; passwordIndex <= 10; passwordIndex += 1) {
        const nextPassword = `pass-${String(passwordIndex).padStart(2, "0")}`;
        const result = await adapter.resetPassword?.(
            "golf",
            currentPassword,
            nextPassword,
        );
        assert.equal(result?.updated, true);
        currentPassword = nextPassword;
    }

    const result = await adapter.resetPassword?.("golf", "pass-10", "pass-00");
    assert.equal(result?.updated, true);
});

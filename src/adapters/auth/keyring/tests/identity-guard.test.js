import assert from "node:assert/strict";
import test from "node:test";
import { webcrypto } from "node:crypto";
import { createKeyringIdentityGuard } from "../ui/identity-guard.js";

Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: webcrypto,
});

test("keyring identity changes revoke verified bindings and cancel outstanding work", async () => {
    let actor = {
        origin: "https://one.example",
        accountId: "alice",
        token: "alice-session",
    };
    const retired = [];
    const guard = createKeyringIdentityGuard({
        readActor: () => actor,
        onInvalidate: (binding) => retired.push(binding),
    });
    const first = guard.snapshot();
    const alice = await guard.verify(first, "alice-instance-one");
    guard.assertBinding(alice);
    actor = { ...actor, accountId: "bob", token: "bob-session" };
    const bobActor = guard.snapshot();
    assert.equal(first.controller.signal.aborted, true);
    assert.equal(guard.currentBinding(), null);
    assert.throws(() => guard.assertBinding(alice), { name: "AbortError" });
    const bob = await guard.verify(bobActor, "bob-instance-one");
    assert.notEqual(bob.sessionId, alice.sessionId);
    actor = { ...actor, origin: "https://two.example" };
    assert.throws(() => guard.assertBinding(bob), { name: "AbortError" });
    assert.ok(retired.includes(alice));
    assert.ok(retired.includes(bob));
});

test("account instance changes invalidate warm keys even with the same account and session token", async () => {
    const actor = {
        origin: "https://one.example",
        accountId: "alice",
        token: "session",
    };
    let invalidated = 0;
    const guard = createKeyringIdentityGuard({
        readActor: () => actor,
        onInvalidate: () => invalidated++,
    });
    const first = await guard.verify(guard.snapshot(), "server-one-account");
    const second = await guard.verify(guard.snapshot(), "server-two-account");
    assert.notEqual(first, second);
    assert.equal(first.actor.controller.signal.aborted, true);
    assert.throws(() => guard.assertBinding(first), { name: "AbortError" });
    guard.assertBinding(second);
    assert.equal(invalidated, 2);
});

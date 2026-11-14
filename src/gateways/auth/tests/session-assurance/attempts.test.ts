import assert from "node:assert/strict";
import test from "node:test";
import { createAuthRouteBootstrapRuntime } from "../../bootstrap/route-runtime.js";

test("Auth atomically consumes only live pending login attempts and clears them on cleanup", (context) => {
    context.mock.timers.enable({ apis: ["Date", "setTimeout"], now: 1000 });
    const runtime = createAuthRouteBootstrapRuntime();
    const input = {
        accountId: "alice",
        role: "user" as const,
        isFounder: false,
        provider: "local",
        providerId: "local",
        displayName: "Alice",
        userValidationMode: "none",
        requiredUserValidation: false,
        ttlSeconds: 42,
    };
    const first = runtime.createPendingTfaLoginAttempt(input);
    const lifetime = runtime.getPendingLoginLifetime(first.id)!;
    assert.equal(Object.isFrozen(lifetime), true);
    assert.equal(lifetime.expiresAt, first.expiresAt);
    assert.equal(runtime.consumePendingTfaLoginAttempt(first.id), true);
    assert.equal(lifetime.signal.aborted, true);
    assert.equal(runtime.consumePendingTfaLoginAttempt(first.id), false);
    const expired = runtime.createPendingTfaLoginAttempt(input);
    context.mock.timers.tick(300_000);
    assert.equal(runtime.consumePendingTfaLoginAttempt(expired.id), false);
    const abandoned = runtime.createPendingTfaLoginAttempt(input);
    runtime.clearPendingTfaLoginAttempts();
    assert.equal(runtime.getPendingTfaLoginAttempt(abandoned.id), null);
    assert.equal(runtime.consumePendingTfaLoginAttempt(abandoned.id), false);
});

test("read-only lifetime lookup cannot create or extend authority and cancels exactly one operation", (context) => {
    context.mock.timers.enable({ apis: ["Date", "setTimeout"], now: 1000 });
    const runtime = createAuthRouteBootstrapRuntime();
    context.after(() => runtime.clearPendingTfaLoginAttempts());
    const input = {
        accountId: "alice",
        role: "user" as const,
        isFounder: false,
        provider: "local",
        providerId: "local",
        displayName: "Alice",
        userValidationMode: "none",
        requiredUserValidation: false,
        ttlSeconds: 42,
    };
    assert.equal(runtime.getPendingLoginLifetime("unknown"), null);
    const first = runtime.createPendingTfaLoginAttempt(input);
    const other = runtime.createPendingTfaLoginAttempt(input);
    const firstLifetime = runtime.getPendingLoginLifetime(first.id)!;
    const otherLifetime = runtime.getPendingLoginLifetime(other.id)!;
    assert.equal(firstLifetime.accountId, "alice");
    assert.equal(firstLifetime.expiresAt, 301000);
    runtime.clearPendingTfaLoginAttempt(first.id);
    assert.equal(firstLifetime.signal.aborted, true);
    assert.equal(otherLifetime.signal.aborted, false);
    context.mock.timers.tick(299999);
    assert.equal(runtime.getPendingLoginLifetime(other.id), otherLifetime);
    context.mock.timers.tick(1);
    assert.equal(otherLifetime.signal.aborted, true);
    assert.equal(runtime.getPendingLoginLifetime(other.id), null);
    assert.equal(runtime.getPendingTfaLoginAttempt(other.id), null);
});

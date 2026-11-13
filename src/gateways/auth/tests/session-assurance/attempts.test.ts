import assert from "node:assert/strict";
import test from "node:test";
import { createAuthRouteBootstrapRuntime } from "../../bootstrap/route-runtime.js";

test("Auth atomically consumes only live pending login attempts and clears them on cleanup", () => {
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
    assert.equal(runtime.consumePendingTfaLoginAttempt(first.id), true);
    assert.equal(runtime.consumePendingTfaLoginAttempt(first.id), false);
    const expired = runtime.createPendingTfaLoginAttempt(input);
    expired.expiresAt = Date.now() - 1;
    assert.equal(runtime.consumePendingTfaLoginAttempt(expired.id), false);
    const abandoned = runtime.createPendingTfaLoginAttempt(input);
    runtime.clearPendingTfaLoginAttempts();
    assert.equal(runtime.getPendingTfaLoginAttempt(abandoned.id), null);
    assert.equal(runtime.consumePendingTfaLoginAttempt(abandoned.id), false);
});

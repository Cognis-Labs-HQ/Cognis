import test from "node:test";
import assert from "node:assert/strict";
import {
    CapabilityStore,
    createCtx,
    runBootstrapScope,
    type CapabilityContracts,
} from "@cognis/core";
import { createAuthRouteBootstrapRuntime } from "../../bootstrap/route-runtime.js";
import { registerAuthRouteBootstrapHook } from "../../bootstrap/tfa-login-attempt-capabilities.js";
import type { PendingLoginLifetime } from "../../pending-login-lifetimes.js";

test("Auth publishes only read-only lifetime authority through its versioned contract", async (context) => {
    const root = createCtx();
    const capabilities = new CapabilityStore();
    capabilities.contribute("system:ctx", root);
    const runtime = createAuthRouteBootstrapRuntime();
    context.after(() => runtime.clearPendingTfaLoginAttempts());
    await runBootstrapScope(root, "gateway:auth", () =>
        registerAuthRouteBootstrapHook({ capabilities, runtime } as never),
    );
    const contracts =
        root.requireCapability<CapabilityContracts>("system:contracts");
    assert.equal(
        contracts.describe("auth:getPendingLoginLifetime")?.owner,
        "gateway:auth",
    );
    const read = contracts.resolve<(id: string) => PendingLoginLifetime | null>(
        "auth:getPendingLoginLifetime",
        1,
    );
    assert.equal(read("unknown"), null);
    assert.equal(
        root.isPublicCapability("tfa:createPendingLoginAttempt"),
        false,
    );
    const attempt = runtime.createPendingTfaLoginAttempt({
        accountId: "alice",
        role: "user",
        isFounder: false,
        provider: "local",
        providerId: "local",
        displayName: "Alice",
        userValidationMode: "none",
        requiredUserValidation: false,
        ttlSeconds: 42,
    });
    const lifetime = read(attempt.id)!;
    assert.equal(lifetime.accountId, "alice");
    assert.equal(Object.isFrozen(lifetime), true);
    runtime.consumePendingTfaLoginAttempt(attempt.id);
    assert.equal(lifetime.signal.aborted, true);
    assert.equal(read(attempt.id), null);
});

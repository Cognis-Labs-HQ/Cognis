import assert from "node:assert/strict";
import test from "node:test";
import { runBootstrapScope, type CapabilityContracts } from "@cognis/core";
import { createTargetFixture } from "./fixture.js";

for (const role of ["user", "admin", "owner"] as const) {
    test(`${role} setup, details and cancellation stay self-only despite a query target`, async (context) => {
        const host = await createTargetFixture(context, { role });
        const committed: string[] = [];
        host.capabilities.contribute(
            "auth:completeSession",
            async (input: { accountId: string }) => {
                committed.push(input.accountId);
                return {
                    outcome: "success",
                    token: "synthetic-session-result",
                };
            },
        );
        host.capabilities.contribute(
            "auth:buildAccessTokenCookie",
            () => "synthetic-cookie",
        );
        host.adapter.renderMethodDetails = async ({ accountId }) => ({
            details: { accountId },
        });
        host.adapter.cancelSetup = async () => undefined;
        const base = "/api/v1/tfa/methods/totp";
        const suffix = "?accountId=owner-target";
        const begin = await host.request(
            `${base}/setup/begin${suffix}`,
            "POST",
            {},
        );
        assert.equal(begin.status, 200);
        const verified = await host.request(
            `${base}/setup/verify${suffix}`,
            "POST",
            {
                setupId: begin.body.data.setupId,
                code: "123456",
            },
        );
        assert.equal(verified.status, 200);
        assert.deepEqual(committed, ["actor"]);
        const details = await host.request(`${base}/details${suffix}`);
        assert.equal(details.status, 200);
        assert.equal(details.body.data.details.accountId, "actor");
        const pending = await host.request(
            `${base}/setup/begin${suffix}`,
            "POST",
            {},
        );
        const cancelled = await host.request(
            `${base}/setup/cancel${suffix}`,
            "POST",
            {
                setupId: pending.body.data.setupId,
            },
        );
        assert.equal(cancelled.status, 200);
        assert.equal(
            await host.store.getPendingSetup(pending.body.data.setupId),
            null,
        );
        assert.deepEqual(host.state.policyCalls, []);
        const adapterCalls = host.calls.filter((call) =>
            [
                "beginSetup",
                "verifySetup",
                "renderMethodDetails",
                "cancelSetup",
            ].includes(call.operation),
        );
        assert.ok(adapterCalls.length >= 5);
        assert.ok(
            adapterCalls.every(
                (call) =>
                    (call.args[0] as { accountId: string }).accountId ===
                    "actor",
            ),
        );
    });
}

test("login resend and verification use the owned pending attempt account, never a query target", async (context) => {
    const host = await createTargetFixture(context, { role: "user" });
    const controller = new AbortController();
    const attempt = {
        id: "synthetic-pending-attempt",
        accountId: "actor",
        displayName: "Synthetic actor",
        provider: "synthetic",
        providerId: "synthetic",
        role: "user",
        isFounder: false,
        userValidationMode: "none",
        requiredUserValidation: false,
        ttlSeconds: 1800,
    };
    let pending = true;
    const lifetime = {
        id: attempt.id,
        accountId: attempt.accountId,
        expiresAt: Date.now() + 60_000,
        signal: controller.signal,
    };
    const commits: string[] = [];
    await runBootstrapScope(
        host.root,
        "gateway:auth",
        async () => {
            host.root
                .requireCapability<CapabilityContracts>("system:contracts")
                .define("auth:getPendingLoginLifetime", {
                    version: 1,
                    kind: "function",
                    description: "Synthetic pending-login lifetime.",
                });
            host.root.contributePublicCapability(
                "auth:getPendingLoginLifetime",
                (id: string) =>
                    pending && id === attempt.id ? lifetime : null,
            );
        },
        (dispose) => host.registry.retainBootstrapDisposer("auth", dispose),
    );
    host.capabilities.contribute("tfa:getPendingLoginAttempt", (id: string) =>
        pending && id === attempt.id ? attempt : null,
    );
    host.capabilities.contribute(
        "auth:consumePendingLoginAttempt",
        (id: string) => {
            if (!pending || id !== attempt.id) return false;
            pending = false;
            controller.abort();
            return true;
        },
    );
    host.capabilities.contribute(
        "auth:completeSession",
        async (input: { accountId: string }) => {
            commits.push(input.accountId);
            return { outcome: "success", token: "synthetic-session-result" };
        },
    );
    host.capabilities.contribute(
        "auth:buildAccessTokenCookie",
        () => "synthetic-cookie",
    );
    const body = {
        loginAttemptId: attempt.id,
        methodId: "totp",
        code: "123456",
    };
    for (const operation of ["resend", "verify"]) {
        const reply = await host.request(
            `/api/v1/tfa/login/${operation}?accountId=owner-target`,
            "POST",
            body,
        );
        assert.equal(reply.status, 200);
    }
    assert.deepEqual(commits, ["actor"]);
    assert.deepEqual(host.state.policyCalls, []);
    const adapterCalls = host.calls.filter((call) =>
        ["beginLoginChallenge", "verifyLogin"].includes(call.operation),
    );
    assert.equal(adapterCalls.length, 2);
    assert.ok(
        adapterCalls.every(
            (call) =>
                (call.args[0] as { accountId: string }).accountId === "actor",
        ),
    );
});

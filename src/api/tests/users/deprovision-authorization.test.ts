import assert from "node:assert/strict";
import test from "node:test";
import type { AccountTargetDecision } from "../../routes/users/account-target.js";
import { allowTarget } from "./reuse/context.js";
import { createHarness } from "./reuse/harness.js";
import { issueAccessToken, verifyAccessToken } from "./reuse/sessions.js";

for (const action of ["disable", ""]) {
    test(`${action || "delete"} rejects lease expiry inside extensible flow preparation`, async () => {
        let current = true;
        const fixture = await createHarness({
            policy: async ({ accountId }) => ({
                allowed: true,
                accountId,
                isCurrent: () => current,
            }),
        });
        const token = issueAccessToken("target", "user", 60);
        fixture.context.flow.extend(
            "deprovision-user",
            "authorize-request",
            { id: "test:expire-lease", order: 1000 },
            async () => {
                await Promise.resolve();
                current = false;
            },
        );
        const response = await fixture.request({
            action,
            method: action ? "POST" : "DELETE",
        });
        assert.equal(response.status, 503);
        assert.equal(response.body.error.code, "account_policy_unavailable");
        assert.equal(response.headerCount, 1);
        assert.equal(response.responseCount, 1);
        assert.deepEqual(fixture.accounts.calls, ["getInfo"]);
        assert.deepEqual(fixture.activity, []);
        assert.equal(verifyAccessToken(token)?.sub, "target");
    });

    for (const denial of [
        { allowed: false, status: 400, code: "bad_request" },
        { allowed: false, status: 403, code: "forbidden" },
        { allowed: false, status: 403, code: "protected_admin_account" },
        { allowed: false, status: 403, code: "protected_self_account" },
        { allowed: false, status: 403, code: "protected_founder_account" },
        { allowed: false, status: 404, code: "not_found" },
        { allowed: false, status: 503, code: "account_policy_unavailable" },
    ] as const) {
        test(`${action || "delete"} preserves terminal ${denial.status} ${denial.code}`, async () => {
            let decision: AccountTargetDecision = allowTarget("target");
            const fixture = await createHarness({
                policy: async () => decision,
            });
            fixture.context.flow.extend(
                "deprovision-user",
                "authorize-request",
                { id: "test:change-target", order: 1000 },
                async () => {
                    await Promise.resolve();
                    decision = denial;
                },
            );
            const response = await fixture.request({
                action,
                method: action ? "POST" : "DELETE",
            });
            assert.equal(response.status, denial.status);
            assert.equal(response.body.error.code, denial.code);
            assert.equal(fixture.context.policyCalls.length, 3);
            assert.equal(response.headerCount, 1);
            assert.equal(response.responseCount, 1);
            assert.deepEqual(fixture.accounts.calls, ["getInfo"]);
            assert.deepEqual(fixture.activity, []);
        });
    }

    test(`${action || "delete"} checks the supplied lease after the terminal policy await`, async () => {
        let calls = 0;
        let current = true;
        const fixture = await createHarness({
            policy: async ({ accountId }) => {
                calls += 1;
                if (calls === 3) {
                    await Promise.resolve();
                    current = false;
                }
                return { allowed: true, accountId, isCurrent: () => true };
            },
        });
        fixture.context.flow.extend(
            "deprovision-user",
            "authorize-request",
            { id: "test:revoke-current-claims", order: 1000 },
            () => {
                const getClaims = fixture.context.getAuthClaims;
                fixture.context.getAuthClaims = (req) =>
                    current ? getClaims(req) : null;
            },
        );
        const response = await fixture.request({
            action,
            method: action ? "POST" : "DELETE",
        });
        assert.equal(response.status, 503);
        assert.equal(response.body.error.code, "account_policy_unavailable");
        assert.equal(response.responseCount, 1);
        assert.deepEqual(fixture.accounts.calls, ["getInfo"]);
        assert.deepEqual(fixture.activity, []);
    });
}

for (const source of ["requireAuth", "getAuthClaims"] as const) {
    test(`deprovision receives the immutable actor even when ${source} returns a mutable object`, async () => {
        const earlierClaims: { sub: string; role: "admin" | "owner" } = {
            sub: "administrator",
            role: "admin",
        };
        const fixture = await createHarness({
            policy: async ({ accountId }) => {
                earlierClaims.role = "owner";
                return allowTarget(accountId);
            },
        });
        if (source === "requireAuth") {
            fixture.context.requireAuth = () => earlierClaims;
        } else {
            let reads = 0;
            fixture.context.getAuthClaims = () =>
                ++reads === 1
                    ? earlierClaims
                    : { sub: "administrator", role: "admin" };
        }
        let envelope: Record<string, unknown> | undefined;
        const mutationResults: boolean[] = [];
        fixture.context.flow.extend(
            "deprovision-user",
            "authorize-request",
            { id: "test:capture-actor", order: 1000 },
            ({ input }) => {
                envelope = input as Record<string, unknown>;
                mutationResults.push(
                    Reflect.set(envelope, "callerRole", "owner"),
                    Reflect.set(envelope, "username", "other"),
                    Reflect.set(envelope.actor as object, "role", "owner"),
                );
            },
        );
        const response = await fixture.request({ method: "DELETE" });
        assert.equal(response.status, 200);
        assert.deepEqual(mutationResults, [false, false, false]);
        assert.equal(envelope?.callerRole, "admin");
        assert.deepEqual(envelope?.actor, {
            sub: "administrator",
            role: "admin",
        });
        assert.equal(typeof envelope?.isAuthorizationCurrent, "function");
        assert.equal(fixture.context.policyCalls.length, 3);
        assert.ok(
            fixture.context.policyCalls.every(
                ({ actor }) => actor.role === "admin",
            ),
        );
        assert.deepEqual(fixture.accounts.calls, ["getInfo", "delete"]);
    });
}

for (const result of [
    undefined,
    { persisted: false, reason: "private-payload" },
    { persisted: false, status: "403", reason: "forbidden" },
]) {
    test(`an invalid deprovision persistence result cannot claim success: ${JSON.stringify(result)}`, async () => {
        const fixture = await createHarness();
        fixture.context.runtime.removeFlowStageHook(
            "deprovision-user",
            "persist-state",
            "test:apply-deprovision",
        );
        fixture.context.flow.extend(
            "deprovision-user",
            "persist-state",
            { id: "test:invalid-persistence" },
            () => result,
        );
        const response = await fixture.request({ action: "disable" });
        assert.equal(response.status, 503);
        assert.equal(response.body.error.code, "account_policy_unavailable");
        assert.equal(response.headerCount, 1);
        assert.equal(response.responseCount, 1);
        assert.equal(
            JSON.stringify(response).includes("private-payload"),
            false,
        );
        assert.equal(
            JSON.stringify(fixture.logs).includes("private-payload"),
            false,
        );
        assert.deepEqual(fixture.accounts.calls, ["getInfo"]);
        assert.deepEqual(fixture.activity, []);
    });
}

for (const action of ["disable", ""]) {
    test(`owner ${action || "delete"} honors the terminal current-founder denial`, async () => {
        const fixture = await createHarness({
            policy: async ({ accountId, allowFounder }) =>
                allowFounder === false
                    ? {
                          allowed: false,
                          status: 403,
                          code: "protected_founder_account",
                      }
                    : allowTarget(accountId),
        });
        const response = await fixture.request({
            action,
            method: action ? "POST" : "DELETE",
            role: "owner",
        });
        assert.equal(response.status, 403);
        assert.equal(response.body.error.code, "protected_founder_account");
        assert.deepEqual(
            fixture.context.policyCalls.map((input) => input.allowFounder),
            [undefined, undefined, false],
        );
        assert.ok(
            fixture.context.policyCalls.every(
                ({ actor }) => actor.role === "owner",
            ),
        );
        assert.deepEqual(fixture.accounts.calls, ["getInfo"]);
        assert.deepEqual(fixture.context.revocationCalls, []);
        assert.deepEqual(fixture.activity, []);
        assert.equal(response.responseCount, 1);
    });
}

test("ordinary owner management leaves founder handling at the policy default", async () => {
    const fixture = await createHarness({
        policy: async ({ accountId, allowFounder }) =>
            allowFounder === false
                ? {
                      allowed: false,
                      status: 403,
                      code: "protected_founder_account",
                  }
                : allowTarget(accountId),
    });
    await fixture.accounts.setFounder("target", true);
    fixture.accounts.calls.length = 0;
    const response = await fixture.request({ action: "enable", role: "owner" });
    assert.equal(response.status, 200);
    assert.deepEqual(
        fixture.context.policyCalls.map((input) => input.allowFounder),
        [undefined],
    );
    assert.deepEqual(fixture.accounts.calls, ["setEnabled"]);
});

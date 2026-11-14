import assert from "node:assert/strict";
import test from "node:test";
import type { AccountTargetDecision } from "../../routes/users/account-target.js";
import { allowTarget } from "./reuse/context.js";
import { createHarness } from "./reuse/harness.js";
import { issueAccessToken, verifyAccessToken } from "./reuse/sessions.js";

const changes = [
    {
        name: "promotion",
        decision: {
            allowed: false,
            status: 403,
            code: "protected_admin_account",
        },
    },
    {
        name: "deletion",
        decision: { allowed: false, status: 404, code: "not_found" },
    },
] satisfies Array<{ name: string; decision: AccountTargetDecision }>;

for (const action of ["role", "password", "isfounder"]) {
    for (const change of changes) {
        test(`${action} refreshes policy after ${change.name} while reading the body`, async () => {
            let decision = allowTarget("target");
            const fixture = await createHarness({
                policy: async () => decision,
            });
            const response = await fixture.request({
                action,
                body: {
                    role: "user",
                    password: "synthetic-only",
                    isFounder: true,
                },
                onBody: () => {
                    decision = change.decision;
                },
            });
            assert.equal(response.status, change.decision.status);
            assert.equal(response.body.error.code, change.decision.code);
            assert.equal(fixture.context.policyCalls.length, 2);
            assert.deepEqual(
                fixture.accounts.calls,
                action === "password" ? ["getInfo"] : [],
            );
            assert.deepEqual(fixture.activity, ["readBody"]);
        });
    }
}

for (const action of ["password", "disable", ""]) {
    for (const change of changes) {
        test(`${action || "delete"} refreshes policy after ${change.name} during metadata preparation`, async () => {
            let decision = allowTarget("target");
            const fixture = await createHarness({
                policy: async () => decision,
            });
            const getInfo = fixture.accounts.getInfo.bind(fixture.accounts);
            fixture.accounts.getInfo = async (accountId) => {
                const previous = await getInfo(accountId);
                decision = change.decision;
                return previous;
            };
            const response = await fixture.request({
                action,
                method: action ? "POST" : "DELETE",
                body: { password: "synthetic-only" },
            });
            assert.equal(response.status, change.decision.status);
            assert.equal(response.body.error.code, change.decision.code);
            assert.equal(fixture.context.policyCalls.length, 2);
            assert.deepEqual(fixture.accounts.calls, ["getInfo"]);
            assert.deepEqual(
                fixture.activity,
                action === "password" ? ["readBody"] : [],
            );
        });
    }
}

test("an admin promotion completes profile synchronization within its authorized mutation sequence", async () => {
    let promoted = false;
    const events: string[] = [];
    const fixture = await createHarness({
        policy: async ({ accountId }) => {
            events.push("authorize");
            return promoted
                ? {
                      allowed: false,
                      status: 403,
                      code: "protected_admin_account",
                  }
                : allowTarget(accountId);
        },
        onProfileRole: () => {
            events.push("profileRole");
        },
        onProfileVisibility: () => {
            events.push("profileVisibility");
        },
    });
    const setRole = fixture.accounts.setRole.bind(fixture.accounts);
    fixture.accounts.setRole = async (accountId, role) => {
        await setRole(accountId, role);
        events.push("accountRole");
        promoted = true;
    };
    const response = await fixture.request({
        action: "role",
        body: { role: "admin" },
    });
    assert.equal(response.status, 200);
    assert.equal(fixture.context.policyCalls.length, 2);
    assert.deepEqual(events, [
        "authorize",
        "authorize",
        "accountRole",
        "profileRole",
        "profileVisibility",
    ]);
    assert.deepEqual(fixture.activity, [
        "readBody",
        "profileRole",
        "profileVisibility",
    ]);
    assert.equal((await fixture.accounts.getInfo("target"))?.role, "admin");
});

for (const step of ["accountRole", "profileRole"] as const) {
    test(`role synchronization retains the lifetime check after ${step}`, async () => {
        let current = true;
        const fixture = await createHarness({
            policy: async ({ accountId }) => ({
                allowed: true,
                accountId,
                isCurrent: () => current,
            }),
            onProfileRole: () => {
                if (step === "profileRole") current = false;
            },
        });
        const setRole = fixture.accounts.setRole.bind(fixture.accounts);
        fixture.accounts.setRole = async (accountId, role) => {
            await setRole(accountId, role);
            if (step === "accountRole") current = false;
        };
        const response = await fixture.request({
            action: "role",
            body: { role: "admin" },
        });
        assert.equal(response.status, 503);
        assert.equal(response.body.error.code, "account_policy_unavailable");
        assert.equal(fixture.context.policyCalls.length, 2);
        assert.deepEqual(fixture.accounts.calls, ["setRole"]);
        assert.deepEqual(
            fixture.activity,
            step === "accountRole" ? ["readBody"] : ["readBody", "profileRole"],
        );
    });
}

test("archive finishes the authorized mutation sequence after deprovision cleanup", async () => {
    let committed = false;
    const fixture = await createHarness({
        policy: async ({ accountId }) =>
            committed
                ? {
                      allowed: false,
                      status: 403,
                      code: "protected_admin_account",
                  }
                : allowTarget(accountId),
    });
    const token = issueAccessToken("target", "user", 60);
    let revokedBeforeCleanup = false;
    fixture.context.flow.extend(
        "deprovision-user",
        "cleanup-dependencies",
        { id: "test:mark-committed", order: 1000 },
        () => {
            revokedBeforeCleanup = verifyAccessToken(token) === null;
            committed = true;
        },
    );
    const response = await fixture.request({ action: "disable" });
    assert.equal(response.status, 200);
    assert.equal(verifyAccessToken(token), null);
    assert.equal(revokedBeforeCleanup, true);
    assert.deepEqual(fixture.context.revocationCalls, ["target"]);
    assert.equal(fixture.logs.at(-1)?.meta?.revokedTokenCount, 1);
    assert.equal(fixture.context.policyCalls.length, 3);
    assert.deepEqual(fixture.activity, ["lifecycle:archived"]);
});

test("successful deletion does not reauthorize a now-deleted target after commit", async () => {
    let deleted = false;
    const fixture = await createHarness({
        policy: async ({ accountId }) =>
            deleted
                ? { allowed: false, status: 404, code: "not_found" }
                : allowTarget(accountId),
    });
    const remove = fixture.accounts.delete.bind(fixture.accounts);
    fixture.accounts.delete = async (accountId) => {
        await remove(accountId);
        deleted = true;
    };
    const response = await fixture.request({ method: "DELETE" });
    assert.equal(response.status, 200);
    assert.equal(fixture.context.policyCalls.length, 3);
    assert.deepEqual(fixture.accounts.calls, ["getInfo", "delete"]);
    assert.equal(await fixture.accounts.has("target"), false);
});

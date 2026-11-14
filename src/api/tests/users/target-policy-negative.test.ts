import assert from "node:assert/strict";
import test from "node:test";
import type { CapabilityContracts, Ctx } from "@cognis/core";
import type {
    AccountTargetDecision,
    AuthorizeAccountTarget,
} from "../../routes/users/account-target.js";
import { allowTarget, type ContextOptions } from "./reuse/context.js";
import { createHarness, managementActions } from "./reuse/harness.js";

type Harness = Awaited<ReturnType<typeof createHarness>>;
const cases: Array<{
    name: string;
    options?: ContextOptions;
    change?: (fixture: Harness) => void | Promise<void>;
}> = [
    { name: "missing policy", options: { policy: false } },
    { name: "wrong contract version", options: { contractVersion: 2 } },
    {
        name: "throwing policy",
        options: {
            policy: async () => {
                throw new Error("private-payload");
            },
        },
    },
    {
        name: "missing root context",
        change: ({ context }) => {
            context.getCapability = () => undefined;
        },
    },
    {
        name: "missing contract registry",
        change: ({ context }) => {
            context.runtime.removeCapability("system:contracts");
        },
    },
    {
        name: "missing declaration",
        change: async ({ context }) => {
            await context.disposers[0]();
        },
    },
    {
        name: "non-function policy",
        change: ({ context }) => {
            context.runtime.contributePublicCapability(
                "auth:authorizeAccountTarget",
                {},
            );
        },
    },
];

const malformed = [
    null,
    {},
    { allowed: true, accountId: "target" },
    { allowed: true, accountId: "other", isCurrent: () => true },
    { allowed: true, accountId: "target", isCurrent: () => false },
    {
        allowed: true,
        accountId: "target",
        isCurrent: () => {
            throw new Error("private-payload");
        },
    },
    { allowed: true, accountId: "target", isCurrent: () => "true" },
    { allowed: false, status: "403", code: "forbidden" },
    { allowed: false, status: 403, code: { toString: () => "forbidden" } },
    { allowed: false, status: 200, code: "forbidden" },
    { allowed: false, status: 403, code: "private-payload" },
    { allowed: false, status: 404, code: "protected_admin_account" },
    { allowed: false, status: 503, code: "account_policy_unavailable" },
];
malformed.forEach((decision, index) => {
    cases.push({
        name: `malformed or unavailable outcome ${index + 1}`,
        options: { policy: async () => decision as AccountTargetDecision },
    });
});

for (const scenario of cases) {
    test(`management fails closed for ${scenario.name}`, async () => {
        const fixture = await createHarness(scenario.options);
        await scenario.change?.(fixture);
        const response = await fixture.request({ action: "enable" });
        assert.equal(response.status, 503);
        assert.equal(response.body.error.code, "account_policy_unavailable");
        assert.deepEqual(fixture.accounts.calls, []);
        assert.deepEqual(fixture.activity, []);
        assert.equal(fixture.logs.length, 1);
        assert.equal(fixture.logs[0].meta?.operation, "authorizeAccountTarget");
        assert.equal(
            JSON.stringify(fixture.logs).includes("private-payload"),
            false,
        );
        assert.equal(
            JSON.stringify(response).includes("private-payload"),
            false,
        );
    });
}

for (const operation of managementActions) {
    test(`${operation.action || "delete"} cannot bypass an unavailable policy`, async () => {
        const fixture = await createHarness({ policy: false });
        const response = await fixture.request(operation);
        assert.equal(response.status, 503);
        assert.deepEqual(fixture.accounts.calls, []);
        assert.deepEqual(fixture.activity, []);
    });
}

for (const decision of [
    { allowed: false, status: 400, code: "bad_request" },
    { allowed: false, status: 403, code: "forbidden" },
    { allowed: false, status: 404, code: "not_found" },
] as const) {
    test(`management preserves ${decision.status} ${decision.code}`, async () => {
        const fixture = await createHarness({ policy: async () => decision });
        const response = await fixture.request({
            action: "password",
            body: { password: "fixture-only" },
        });
        assert.equal(response.status, decision.status);
        assert.equal(response.body.error.code, decision.code);
        assert.deepEqual(fixture.accounts.calls, []);
        assert.deepEqual(fixture.activity, []);
    });
}

const pendingChanges: Array<{
    name: string;
    change: (fixture: Harness) => void | Promise<void>;
}> = [
    {
        name: "claims revoked",
        change: ({ context }) => {
            context.getAuthClaims = () => null;
        },
    },
    {
        name: "actor changed",
        change: ({ context }) => {
            context.getAuthClaims = () => ({ sub: "other", role: "admin" });
        },
    },
    {
        name: "actor role changed",
        change: ({ context }) => {
            context.getAuthClaims = () => ({
                sub: "administrator",
                role: "owner",
            });
        },
    },
    {
        name: "policy removed",
        change: ({ context }) => {
            context.runtime.removeCapability("auth:authorizeAccountTarget");
        },
    },
    {
        name: "policy replaced",
        change: ({ context }) => {
            context.runtime.contributePublicCapability(
                "auth:authorizeAccountTarget",
                async () => allowTarget("target"),
            );
        },
    },
    {
        name: "declaration removed",
        change: async ({ context }) => {
            await context.disposers[0]();
        },
    },
    {
        name: "registry replaced",
        change: ({ context }) => {
            context.runtime.contributePublicCapability(
                "system:contracts",
                {} as CapabilityContracts,
            );
        },
    },
    {
        name: "root replaced",
        change: ({ context }) => {
            context.getCapability = <T>() => ({}) as Ctx as T;
        },
    },
];

for (const scenario of pendingChanges) {
    test(`pending authorization is unusable after ${scenario.name}`, async () => {
        let resolvePolicy!: (decision: AccountTargetDecision) => void;
        let signalEntered!: () => void;
        const entered = new Promise<void>((resolve) => {
            signalEntered = resolve;
        });
        const fixture = await createHarness({
            policy: async () => {
                signalEntered();
                return new Promise<AccountTargetDecision>((resolve) => {
                    resolvePolicy = resolve;
                });
            },
        });
        const pending = fixture.request({ action: "enable" });
        await entered;
        await scenario.change(fixture);
        resolvePolicy(allowTarget("target"));
        const response = await pending;
        assert.equal(response.status, 503);
        assert.equal(response.body.error.code, "account_policy_unavailable");
        assert.deepEqual(fixture.accounts.calls, []);
        assert.deepEqual(fixture.activity, []);
    });
}

for (const action of ["role", "password", "isfounder"]) {
    test(`${action} rechecks authorization after reading its body`, async () => {
        let current = true;
        const fixture = await createHarness({
            policy: async () => ({
                allowed: true,
                accountId: "target",
                isCurrent: () => current,
            }),
        });
        const response = await fixture.request({
            action,
            body: { role: "user", password: "fixture-only", isFounder: true },
            onBody: () => {
                current = false;
            },
        });
        assert.equal(response.status, 503);
        assert.deepEqual(
            fixture.accounts.calls,
            action === "password" ? ["getInfo"] : [],
        );
        assert.deepEqual(fixture.activity, ["readBody"]);
    });
}

for (const action of ["disable", ""]) {
    test(`${action || "delete"} rechecks authorization after target metadata`, async () => {
        let current = true;
        const fixture = await createHarness({
            policy: async () => ({
                allowed: true,
                accountId: "target",
                isCurrent: () => current,
            }),
        });
        const getInfo = fixture.accounts.getInfo.bind(fixture.accounts);
        fixture.accounts.getInfo = async (accountId) => {
            const info = await getInfo(accountId);
            current = false;
            return info;
        };
        const response = await fixture.request({
            action,
            method: action ? "POST" : "DELETE",
        });
        assert.equal(response.status, 503);
        assert.deepEqual(fixture.accounts.calls, ["getInfo"]);
        assert.deepEqual(fixture.activity, []);
    });
}

test("disable rechecks authorization after lifecycle flow before profile mutation", async () => {
    let current = true;
    const fixture = await createHarness({
        policy: async () => ({
            allowed: true,
            accountId: "target",
            isCurrent: () => current,
        }),
    });
    fixture.context.flow.extend(
        "deprovision-user",
        "cleanup-dependencies",
        { id: "test:expire-lease" },
        () => {
            current = false;
            return { expired: true };
        },
    );
    const response = await fixture.request({ action: "disable" });
    assert.equal(response.status, 503);
    assert.deepEqual(fixture.activity, []);
});

test("malformed target encoding returns a client error without policy or downstream work", async () => {
    const fixture = await createHarness();
    const response = await fixture.request({
        path: "/api/v1/users/%E0%A4%A/enable",
    });
    assert.equal(response.status, 400);
    assert.equal(response.body.error.code, "bad_request");
    assert.deepEqual(fixture.context.policyCalls, []);
    assert.deepEqual(fixture.accounts.calls, []);
    assert.deepEqual(fixture.activity, []);
});

for (const [field, value] of [
    ["allowed", false],
    ["accountId", "another-account"],
    ["isCurrent", undefined],
] as const) {
    test(`role mutation rejects a changed authorization ${field}`, async () => {
        const decision: Record<string, unknown> = {
            allowed: true,
            accountId: "target",
            isCurrent: () => true,
        };
        const fixture = await createHarness({
            policy: async () => decision as AccountTargetDecision,
        });
        const response = await fixture.request({
            action: "role",
            body: { role: "user" },
            onBody: () => {
                decision[field] = value;
            },
        });
        assert.equal(response.status, 503);
        assert.deepEqual(fixture.accounts.calls, []);
        assert.deepEqual(fixture.activity, ["readBody"]);
    });
}

for (const [field, value] of [
    ["sub", "different-actor"],
    ["role", "owner"],
] as const) {
    test(`pending policy cannot replace the authenticated ${field} snapshot`, async () => {
        let input!: Parameters<AuthorizeAccountTarget>[0];
        let signalEntered!: () => void;
        let finishPolicy!: (decision: AccountTargetDecision) => void;
        const entered = new Promise<void>((resolve) => {
            signalEntered = resolve;
        });
        const fixture = await createHarness({
            policy: async (request) => {
                input = request;
                signalEntered();
                return new Promise<AccountTargetDecision>((resolve) => {
                    finishPolicy = resolve;
                });
            },
        });
        const pending = fixture.request({ action: "enable" });
        await entered;
        const mutated = Reflect.set(input.actor, field, value);
        fixture.context.getAuthClaims = () =>
            field === "sub"
                ? { sub: value, role: "admin" }
                : { sub: "administrator", role: "owner" };
        finishPolicy(allowTarget("target"));
        const response = await pending;
        assert.equal(mutated, false);
        assert.equal(response.status, 503);
        assert.equal(response.body.error.code, "account_policy_unavailable");
        assert.deepEqual(fixture.accounts.calls, []);
        assert.deepEqual(fixture.activity, []);
    });
}

import assert from "node:assert/strict";
import test from "node:test";
import type { AccessRole } from "@cognis/core";
import { allowTarget } from "./reuse/context.js";
import { createHarness, managementActions } from "./reuse/harness.js";

for (const operation of managementActions) {
    test(`${operation.method} ${operation.action || "delete"} consumes the authoritative target denial before any downstream work`, async () => {
        const fixture = await createHarness({
            policy: async () => ({
                allowed: false,
                status: 403,
                code: "protected_admin_account",
            }),
        });
        const response = await fixture.request(operation);
        assert.equal(response.status, 403);
        assert.equal(response.body.error.code, "protected_admin_account");
        assert.deepEqual(fixture.context.policyCalls, [
            {
                actor: { sub: "administrator", role: "admin" },
                accountId: "target",
                allowSelf: false,
            },
        ]);
        assert.deepEqual(fixture.accounts.calls, []);
        assert.deepEqual(fixture.activity, []);
    });

    for (const role of ["admin", "owner"] as const) {
        test(`${role} can ${operation.action || "delete"} an authorized other account`, async () => {
            const fixture = await createHarness();
            const response = await fixture.request({ ...operation, role });
            assert.equal(response.status, 200);
            const authorizationCount = ["disable", ""].includes(
                operation.action,
            )
                ? 3
                : ["enable", "dearchive", "preferences/clear"].includes(
                        operation.action,
                    )
                  ? 1
                  : 2;
            assert.equal(
                fixture.context.policyCalls.length,
                authorizationCount,
            );
            assert.ok(
                fixture.context.policyCalls.every(
                    (input) =>
                        input.actor.role === role && input.allowSelf === false,
                ),
            );
            assert.deepEqual(
                fixture.context.policyCalls.map((input) => input.allowFounder),
                authorizationCount === 3
                    ? [undefined, undefined, false]
                    : Array(authorizationCount).fill(undefined),
            );
            assert.equal(fixture.context.policyCalls[0].actor.role, role);
            assert.equal(fixture.context.policyCalls[0].allowSelf, false);
            assert.ok(
                fixture.accounts.calls.length + fixture.activity.length > 0,
            );
        });
    }

    test(`${operation.action || "delete"} preserves explicit self-management denial`, async () => {
        const fixture = await createHarness({
            policy: async () => ({
                allowed: false,
                status: 403,
                code: "protected_self_account",
            }),
        });
        const response = await fixture.request({
            ...operation,
            actorId: "target",
            role: "owner",
        });
        assert.equal(response.status, 403);
        assert.equal(response.body.error.code, "protected_self_account");
        assert.deepEqual(fixture.accounts.calls, []);
        assert.deepEqual(fixture.activity, []);
        assert.equal(fixture.context.policyCalls[0].allowSelf, false);
    });
}

const targetCases = [
    { name: "ordinary", adminCode: undefined },
    { name: "admin", adminCode: "protected_admin_account" },
    { name: "owner", adminCode: "protected_admin_account" },
    { name: "founder-admin", adminCode: "protected_admin_account" },
    { name: "founder-owner", adminCode: "protected_admin_account" },
] as const;

for (const actorRole of [
    "user",
    "teacher",
    "moderator",
    "admin",
    "owner",
] as AccessRole[]) {
    for (const target of targetCases) {
        test(`${actorRole} respects Auth's outcome for ${target.name}`, async () => {
            const denied = actorRole === "admin" && target.adminCode;
            const fixture = await createHarness({
                policy: async ({ accountId }) =>
                    denied
                        ? { allowed: false, status: 403, code: denied }
                        : allowTarget(accountId),
            });
            const response = await fixture.request({
                action: "enable",
                role: actorRole,
            });
            const allowedByGuard =
                actorRole === "admin" || actorRole === "owner";
            assert.equal(
                response.status,
                allowedByGuard && !denied ? 200 : 403,
            );
            assert.equal(
                fixture.context.policyCalls.length,
                allowedByGuard ? 1 : 0,
            );
            assert.deepEqual(
                fixture.accounts.calls,
                allowedByGuard && !denied ? ["setEnabled"] : [],
            );
        });
    }
}

test("Users does not substitute persisted role metadata for an allowed Auth outcome", async () => {
    const fixture = await createHarness();
    await fixture.accounts.setRole("target", "admin");
    await fixture.accounts.setFounder("target", true);
    fixture.accounts.calls.length = 0;
    const response = await fixture.request({ action: "enable" });
    assert.equal(response.status, 200);
    assert.deepEqual(fixture.accounts.calls, ["setEnabled"]);
});

test("owner still cannot manually assign the owner role after authorization", async () => {
    const fixture = await createHarness();
    const response = await fixture.request({
        role: "owner",
        action: "role",
        body: { role: "owner" },
    });
    assert.equal(response.status, 403);
    assert.equal(response.body.error.code, "forbidden");
    assert.deepEqual(fixture.accounts.calls, []);
});

for (const operation of managementActions.filter(
    ({ action }) => action === "disable" || action === "",
)) {
    test(`owner ${operation.action || "delete"} retains founder lifecycle protection`, async () => {
        const fixture = await createHarness();
        await fixture.accounts.setFounder("target", true);
        fixture.accounts.calls.length = 0;
        const response = await fixture.request({ ...operation, role: "owner" });
        assert.equal(response.status, 403);
        assert.equal(response.body.error.code, "protected_founder_account");
        assert.deepEqual(fixture.accounts.calls, ["getInfo"]);
        assert.deepEqual(fixture.activity, []);
    });
}

test("list, info, account creation and unhandled operations keep their existing policy scope", async () => {
    const fixture = await createHarness({ policy: false });
    assert.equal(
        (await fixture.request({ method: "GET", path: "/api/v1/users" }))
            .status,
        200,
    );
    assert.equal(
        (await fixture.request({ method: "GET", action: "info" })).status,
        200,
    );
    assert.equal(
        (
            await fixture.request({
                accountId: "new",
                body: { password: "fixture-only", role: "user" },
            })
        ).status,
        201,
    );
    assert.equal(
        (await fixture.request({ method: "GET", action: "enable" })).handled,
        false,
    );
    assert.equal(
        (await fixture.request({ method: "DELETE", action: "enable" })).handled,
        false,
    );
    assert.deepEqual(fixture.context.policyCalls, []);
});

test("decoded account identity is passed exactly to the public policy", async () => {
    const fixture = await createHarness({
        policy: async () => ({
            allowed: false,
            status: 404,
            code: "not_found",
        }),
    });
    const response = await fixture.request({
        accountId: "account+identity@local",
        action: "enable",
    });
    assert.equal(response.status, 404);
    assert.equal(
        fixture.context.policyCalls[0].accountId,
        "account+identity@local",
    );
    assert.deepEqual(fixture.accounts.calls, []);
});

test("the policy cannot redirect the immutable actor and request snapshot", async () => {
    const mutationResults: boolean[] = [];
    const fixture = await createHarness({
        policy: async (input) => {
            mutationResults.push(
                Reflect.set(input.actor, "sub", "different-actor"),
                Reflect.set(input.actor, "role", "owner"),
                Reflect.set(input, "accountId", "different-target"),
                Reflect.set(input, "allowSelf", true),
            );
            return allowTarget(input.accountId);
        },
    });
    const response = await fixture.request({ action: "enable" });
    assert.equal(response.status, 200);
    assert.deepEqual(mutationResults, [false, false, false, false]);
    assert.deepEqual(fixture.context.policyCalls, [
        {
            actor: { sub: "administrator", role: "admin" },
            accountId: "target",
            allowSelf: false,
        },
    ]);
    assert.deepEqual(fixture.accounts.calls, ["setEnabled"]);
});

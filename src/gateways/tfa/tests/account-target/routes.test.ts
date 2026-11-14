import assert from "node:assert/strict";
import test from "node:test";
import type { AccessRole } from "@cognis/core";
import { createTargetFixture, targetPath, targetRoutes } from "./fixture.js";

const decisions: Array<{
    role: AccessRole;
    target: string;
    status: number;
    code?: string;
}> = [
    { role: "user", target: "target", status: 403, code: "forbidden" },
    { role: "admin", target: "target", status: 200 },
    {
        role: "admin",
        target: "admin-target",
        status: 403,
        code: "protected_admin_account",
    },
    {
        role: "admin",
        target: "owner-target",
        status: 403,
        code: "protected_admin_account",
    },
    {
        role: "admin",
        target: "founder-target",
        status: 403,
        code: "protected_admin_account",
    },
    { role: "owner", target: "target", status: 200 },
    { role: "owner", target: "admin-target", status: 200 },
    { role: "owner", target: "owner-target", status: 200 },
    { role: "owner", target: "founder-target", status: 200 },
    { role: "admin", target: "missing-target", status: 404, code: "not_found" },
];

for (const route of targetRoutes) {
    for (const expected of decisions) {
        test(`${route.path}: ${expected.role} targeting ${expected.target} obeys the public Auth decision`, async (context) => {
            const host = await createTargetFixture(context, {
                role: expected.role,
            });
            host.state.decide = (input, isCurrent) =>
                expected.code
                    ? {
                          allowed: false,
                          status: expected.status,
                          code: expected.code,
                      }
                    : { allowed: true, accountId: input.accountId, isCurrent };
            const reply = await host.request(
                targetPath(route, expected.target),
                route.method,
            );
            assert.equal(reply.handled, true);
            assert.equal(reply.status, expected.status);
            assert.equal(reply.body.error?.code, expected.code);
            const guarded = "reset" in route && expected.role === "user";
            assert.deepEqual(host.state.guards, [
                "reset" in route ? "admin" : "user",
            ]);
            assert.deepEqual(
                host.state.stages,
                guarded ? [] : ["captureRequest", "evaluate"],
            );
            assert.deepEqual(
                host.state.policyCalls,
                guarded
                    ? []
                    : [
                          {
                              actor: { sub: "actor", role: expected.role },
                              accountId: expected.target,
                              allowSelf: true,
                          },
                      ],
            );
            if (expected.code) assert.deepEqual(host.calls, []);
            else {
                assert.ok(host.calls.some((call) => call.owner === "store"));
                const accounts = host.calls
                    .filter((call) =>
                        [
                            "listUserMethods",
                            "setPreferredOrder",
                            "listRecoveryCodes",
                            "hasUnusedRecoveryCodes",
                            "replaceRecoveryCodes",
                            "clearUserState",
                        ].includes(call.operation),
                    )
                    .map((call) => call.args[0]);
                assert.ok(accounts.length > 0);
                assert.ok(
                    accounts.every((account) => account === expected.target),
                );
            }
        });
    }
}

for (const role of ["user", "admin", "owner"] as const) {
    for (const route of targetRoutes) {
        if ("reset" in route && role === "user") continue;
        for (const explicit of [false, true]) {
            if ("reset" in route && !explicit) continue;
            test(`${role} retains ${explicit ? "explicit" : "implicit"} self service at ${route.path} without account metadata policy`, async (context) => {
                const host = await createTargetFixture(context, {
                    role,
                    missingPolicy: true,
                });
                const path = explicit ? targetPath(route, "actor") : route.path;
                const reply = await host.request(path, route.method);
                assert.equal(reply.status, 200);
                assert.equal(host.state.policyCalls.length, 0);
                assert.ok(host.calls.some((call) => call.owner === "store"));
            });
        }
    }
}

for (const route of targetRoutes) {
    const malformed =
        "reset" in route
            ? ["%E0%A4%A", "%00", "%20", "%2F", "%5C"]
            : [
                  "",
                  "target&accountId=target",
                  "%20target",
                  "target%20",
                  "tar%00get",
                  "tar%09get",
              ];
    for (const target of malformed) {
        test(`${route.path} rejects malformed target ${JSON.stringify(target)} before policy or TFA access`, async (context) => {
            const host = await createTargetFixture(context);
            const path =
                "reset" in route
                    ? `/api/v1/tfa/admin/users/${target}/reset`
                    : `${route.path}?accountId=${target}`;
            const reply = await host.request(path, route.method);
            assert.equal(reply.status, 400);
            assert.equal(reply.body.error.code, "bad_request");
            assert.deepEqual(host.calls, []);
            assert.deepEqual(host.state.policyCalls, []);
        });
    }
    test(`${route.path} requires authentication before any target operation`, async (context) => {
        const host = await createTargetFixture(context);
        host.state.authenticated = false;
        const reply = await host.request(
            targetPath(route, "target"),
            route.method,
        );
        assert.equal(reply.status, 401);
        assert.deepEqual(host.state.policyCalls, []);
        assert.deepEqual(host.calls, []);
    });
}

test("the dedicated reset uses its path target and preserves the administrator guard", async (context) => {
    const host = await createTargetFixture(context);
    const reply = await host.request(
        "/api/v1/tfa/admin/users/target/reset?accountId=owner-target",
        "POST",
    );
    assert.equal(reply.status, 200);
    assert.equal(host.state.policyCalls[0].accountId, "target");
    assert.deepEqual(host.state.guards, ["admin"]);
    assert.ok(
        host.calls.some(
            (call) =>
                call.operation === "clearUserState" &&
                call.args[0] === "target",
        ),
    );
});

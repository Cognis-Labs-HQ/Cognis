import assert from "node:assert/strict";
import test from "node:test";
import { createTargetFixture, targetPath, targetRoutes } from "./fixture.js";

const unavailable = [
    "missing",
    "wrong-version",
    "throws",
    "null",
    "malformed",
    "wrong-account",
    "missing-lease",
    "expired-lease",
    "throwing-lease",
    "invalid-denial",
    "invalid-denial-status",
] as const;

for (const route of targetRoutes) {
    for (const failure of unavailable) {
        test(`${route.path} fails closed for ${failure} account policy`, async (context) => {
            const host = await createTargetFixture(context, {
                missingPolicy: failure === "missing",
                policyVersion: failure === "wrong-version" ? 2 : 1,
            });
            host.state.decide = (input, isCurrent) => {
                switch (failure) {
                    case "throws":
                        throw new Error("synthetic-private-metadata");
                    case "null":
                        return null;
                    case "malformed":
                        return { allowed: "true" };
                    case "wrong-account":
                        return { allowed: true, accountId: "other", isCurrent };
                    case "missing-lease":
                        return { allowed: true, accountId: input.accountId };
                    case "expired-lease":
                        return {
                            allowed: true,
                            accountId: input.accountId,
                            isCurrent: () => false,
                        };
                    case "throwing-lease":
                        return {
                            allowed: true,
                            accountId: input.accountId,
                            isCurrent: () => {
                                throw new Error("synthetic-private-metadata");
                            },
                        };
                    case "invalid-denial-status":
                        return {
                            allowed: false,
                            status: "403",
                            code: "forbidden",
                        };
                    case "invalid-denial":
                        return {
                            allowed: false,
                            status: 403,
                            code: "synthetic-private-metadata",
                        };
                    default:
                        return {
                            allowed: true,
                            accountId: input.accountId,
                            isCurrent,
                        };
                }
            };
            const reply = await host.request(
                targetPath(route, "target"),
                route.method,
            );
            assert.equal(reply.status, 503);
            assert.equal(reply.body.error.code, "account_policy_unavailable");
            assert.deepEqual(host.calls, []);
            assert.ok(host.state.logs.length > 0);
            assert.equal(
                JSON.stringify([reply.body, host.state.logs]).includes(
                    "synthetic-private-metadata",
                ),
                false,
            );
        });
    }
}

for (const route of targetRoutes) {
    for (const change of [
        "contract-removal",
        "auth-disable-reenable",
        "provider-generation",
        "actor-change",
        "role-change",
        "claims-removal",
        "claims-replacement",
        "tfa-disable",
        "tfa-disable-reenable",
    ] as const) {
        test(`${route.path} rejects ${change} while its policy is pending`, async (context) => {
            const host = await createTargetFixture(context);
            const entered = Promise.withResolvers<void>();
            const release = Promise.withResolvers<void>();
            host.state.decide = async (input, isCurrent) => {
                entered.resolve();
                await release.promise;
                return { allowed: true, accountId: input.accountId, isCurrent };
            };
            const pending = host.request(
                targetPath(route, "target"),
                route.method,
            );
            await entered.promise;
            assert.deepEqual(host.calls, []);
            switch (change) {
                case "contract-removal":
                    host.root.removeCapability("auth:authorizeAccountTarget");
                    break;
                case "auth-disable-reenable":
                    await host.registry.disable("auth");
                    await host.registry.enable("auth");
                    break;
                case "provider-generation":
                    host.state.generation++;
                    break;
                case "actor-change":
                    host.state.claims = { ...host.state.claims, sub: "other" };
                    break;
                case "role-change":
                    host.state.claims = { ...host.state.claims, role: "user" };
                    break;
                case "claims-removal":
                    host.capabilities.remove("auth:getAuthClaims");
                    break;
                case "claims-replacement":
                    host.capabilities.contribute(
                        "auth:getAuthClaims",
                        () => null,
                    );
                    break;
                case "tfa-disable":
                    await host.registry.disable("tfa");
                    break;
                case "tfa-disable-reenable":
                    await host.registry.disable("tfa");
                    await host.registry.enable("tfa");
                    break;
            }
            release.resolve();
            const reply = await pending;
            assert.equal(reply.status, 503);
            assert.equal(reply.body.error.code, "account_policy_unavailable");
            assert.deepEqual(host.calls, []);
        });
    }
}

test("authorization is rechecked at the handler commit boundary after the resolver await", async (context) => {
    const host = await createTargetFixture(context);
    let checks = 0;
    host.state.decide = (input) => ({
        allowed: true,
        accountId: input.accountId,
        isCurrent: () => {
            if (++checks === 1)
                queueMicrotask(() => {
                    host.state.claims = { ...host.state.claims, role: "user" };
                });
            return true;
        },
    });
    const reply = await host.request(
        "/api/v1/tfa/admin/users/target/reset",
        "POST",
    );
    assert.equal(reply.status, 503);
    assert.deepEqual(host.calls, []);
});

test("registered routes resolve the current authentication guard instead of retaining an old capability", async (context) => {
    const host = await createTargetFixture(context);
    host.capabilities.contribute(
        "auth:requireAuth",
        (_request: unknown, response: import("node:http").ServerResponse) => {
            response.writeHead(401, { "content-type": "application/json" });
            response.end(JSON.stringify({ error: { code: "unauthorized" } }));
            return null;
        },
    );
    assert.equal((await host.request("/api/v1/tfa/status")).status, 401);
    assert.deepEqual(host.calls, []);
    host.capabilities.remove("auth:requireAuth");
    assert.equal((await host.request("/api/v1/tfa/status")).status, 503);
    assert.deepEqual(host.calls, []);
});

for (const target of ["actor", "target"]) {
    for (const change of [
        "revoked",
        "role-change",
        "actor-change",
        "claims-removal",
    ] as const) {
        test(`preferences for ${target} reject ${change} during body parsing`, async (context) => {
            const host = await createTargetFixture(context);
            const entered = Promise.withResolvers<void>();
            const release = Promise.withResolvers<void>();
            const pending = host.request(
                `/api/v1/tfa/methods/preferences?accountId=${target}`,
                "PUT",
                { methodIds: ["totp"] },
                async () => {
                    entered.resolve();
                    await release.promise;
                },
            );
            await entered.promise;
            if (change === "revoked") host.state.authenticated = false;
            else if (change === "role-change") host.state.claims.role = "user";
            else if (change === "actor-change") host.state.claims.sub = "other";
            else host.capabilities.remove("auth:getAuthClaims");
            release.resolve();
            const reply = await pending;
            assert.equal(reply.status, 503);
            assert.deepEqual(host.calls, []);
            assert.deepEqual(host.state.policyCalls, []);
        });
    }
}

test("exact self rechecks credentials after the authorization resolver await", async (context) => {
    const host = await createTargetFixture(context, { missingPolicy: true });
    host.capabilities.contribute("auth:requireAuth", () => {
        queueMicrotask(() => {
            host.state.authenticated = false;
        });
        return host.state.claims;
    });
    assert.equal(
        (await host.request("/api/v1/tfa/status?accountId=actor")).status,
        503,
    );
    assert.deepEqual(host.calls, []);
});

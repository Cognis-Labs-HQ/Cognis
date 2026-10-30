import assert from "node:assert/strict";
import test from "node:test";
import { CapabilityStore } from "@cognis/core";
import { CoreAuthGateway } from "../gateway.js";
import { issueAccessToken } from "../access-tokens.js";
import { createSessionRoutes } from "../bootstrap/routes/session.js";
import { createAuthRouteBootstrapRuntime } from "../bootstrap/route-runtime.js";
import { loadLocalAccountStore } from "../bootstrap/local-account.js";
import {
    makeInMemoryDb,
    makeJsonRequest,
    makeResponse,
} from "./auth-gateway-test-helpers.js";

test("setup status supplies owner integrations for SSO sessions after limited TFA setup", async () => {
    const db = makeInMemoryDb();
    const capabilities = new CapabilityStore();
    capabilities.contribute(
        "auth:getAccountInstanceId",
        async () => "instance:person",
    );
    let tfaPending = false;
    let verified = false;
    let calls = 0;
    capabilities.contribute("tfa:getUserStatus", async () => ({
        requiresSetup: tfaPending,
    }));
    capabilities.contribute(
        "auth:getSetupIntegrations",
        async (accountId: string, role: string) => {
            assert.equal(accountId, "x:person");
            assert.equal(role, "user");
            calls++;
            return verified
                ? []
                : [
                      {
                          scriptUrl:
                              "/static/gateways/notify/login-required-email-flow.js",
                      },
                  ];
        },
    );
    const route = createSessionRoutes({
        authGateway: new CoreAuthGateway(db),
        accountStore: await loadLocalAccountStore(db),
        capabilities,
        authRouteBootstrapRuntime: createAuthRouteBootstrapRuntime(),
        readSecuritySettings: async () => ({
            registrationsEnabled: false,
            userValidationMode: "none",
        }),
    });
    let token = issueAccessToken("x:person", "user", 60, { providerId: "x" });
    async function status(authenticated = true) {
        const response = makeResponse();
        await route(
            makeJsonRequest(
                "GET",
                {},
                authenticated ? { authorization: `Bearer ${token}` } : {},
            ),
            response as unknown as import("node:http").ServerResponse,
            new URL("http://localhost/api/v1/auth/setup-status"),
        );
        return { status: response.status, ...JSON.parse(response.payload) };
    }
    assert.equal((await status(false)).status, 401);
    assert.equal(calls, 0);
    const ready = await status();
    assert.equal(ready.data.integrations.length, 1);
    assert.equal(ready.data.accountInstanceId, "instance:person");
    tfaPending = true;
    const limited = await status();
    assert.equal(limited.data.requiresSetup, true);
    assert.deepEqual(limited.data.integrations, []);
    assert.equal(calls, 1);
    tfaPending = false;
    verified = true;
    assert.deepEqual((await status()).data.integrations, []);
    assert.equal(calls, 2);
    capabilities.contribute(
        "share:resolveGuestId",
        (claims: { sub: string }) =>
            claims.sub === "share:resource:guest" ? "resource" : "",
    );
    token = issueAccessToken("share:resource:guest", "user", 60, {
        providerId: "share",
    });
    tfaPending = true;
    const guest = await status();
    assert.equal(guest.status, 200);
    assert.equal(guest.data.requiresSetup, false);
    assert.deepEqual(guest.data.integrations, []);
    assert.equal(calls, 2);
});

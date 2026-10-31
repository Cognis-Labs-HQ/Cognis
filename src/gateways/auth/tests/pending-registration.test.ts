import assert from "node:assert/strict";
import test from "node:test";
import { CapabilityStore, CTX_CAPABILITY, createCtx } from "@cognis/core";
import { CoreAuthGateway } from "../gateway.js";
import { VolatileLocalAccountStore } from "../reuse/account-store.js";
import { registerAuthBootstrapHook } from "../bootstrap/flow-registrations.js";
import {
    createAuthRouteBootstrapRuntime,
    ACCOUNT_CREATION_ATTEMPT_TTL_MS,
    TFA_LOGIN_ATTEMPT_TTL_MS,
} from "../bootstrap/route-runtime.js";
import { createSessionRoutes } from "../bootstrap/routes/session.js";
import type { AuthAccountStore } from "../bootstrap/index.js";
import { createDefaultRouteContext } from "../../../api/reuse/route-context.js";
import { RouteRegistry } from "../../../api/reuse/route-registry.js";
import {
    dispatchRoute,
    makeJsonRequest,
    makeInMemoryDb,
} from "./auth-gateway-test-helpers.js";

async function registrationFixture() {
    const system = createCtx();
    const capabilities = new CapabilityStore();
    capabilities.contribute(CTX_CAPABILITY, system);
    const accounts = new VolatileLocalAccountStore();
    // Login creation uses the shared account identity methods, not local password registration.
    const accountStore = accounts as unknown as AuthAccountStore;
    const profiles: string[] = [];
    capabilities.contribute(
        "profile:createProfile",
        async (accountId: string) => {
            profiles.push(accountId);
        },
    );
    const authGateway = new CoreAuthGateway(makeInMemoryDb());
    authGateway.registerAdapter({
        id: "external-sso",
        name: "External SSO",
        locked: true,
        authenticate: async () => ({
            accountId: "x:person",
            externalUserId: "subject",
            username: "person",
            accountNamespace: "x",
            provider: "external-sso",
            email: "person@example.com",
        }),
        configure() {},
        getConfigSchema: () => [],
    });
    const runtime = createAuthRouteBootstrapRuntime();
    const readSecuritySettings = async () => ({
        userValidationMode: "none" as const,
        loginSessionTimeoutMinutes: 720,
    });
    await registerAuthBootstrapHook({
        accountStore,
        authGateway,
        authRouteBootstrapRuntime: runtime,
        readSecuritySettings,
        ctx: {
            capabilities,
            flow: system.flow,
            adaptersRoot: "/unused",
            routeRegistry: new RouteRegistry(),
        },
        routeContext: createDefaultRouteContext({ flow: system.flow }),
    });
    system.flow.extend(
        "gateAccountCreation",
        "authorizeCreation",
        { id: "test:invitePolicy" },
        ({ input }) => ({
            authorized: input.registrationToken === "valid-invitation",
        }),
    );
    const routes = new RouteRegistry();
    routes.register(
        createSessionRoutes({
            accountStore,
            authGateway,
            capabilities,
            authRouteBootstrapRuntime: runtime,
            readSecuritySettings,
        }),
    );
    return { accounts, profiles, routes };
}

for (const outcome of ["cancelled", "expired"] as const) {
    test(`a ${outcome} SSO invitation attempt never persists an account or profile`, async (context) => {
        context.mock.timers.enable({ apis: ["Date"], now: 1_800_000_000_000 });
        const host = await registrationFixture();
        const held = await dispatchRoute(
            host.routes,
            makeJsonRequest("POST", { provider: "external-sso" }),
            "/api/v1/auth/login",
        );
        assert.equal(held.res.status, 403);
        assert.equal(
            JSON.parse(held.res.payload).data.registrationTokenRequired,
            true,
        );
        const cookie = String(held.res.headers["set-cookie"]).split(";")[0];
        assert.equal((await host.accounts.list()).length, 0);
        assert.deepEqual(host.profiles, []);
        if (outcome === "cancelled") {
            const cancelled = await dispatchRoute(
                host.routes,
                makeJsonRequest("DELETE", {}, { cookie }),
                "/api/v1/auth/account-creation-attempt",
            );
            assert.equal(cancelled.res.status, 204);
        } else context.mock.timers.tick(ACCOUNT_CREATION_ATTEMPT_TTL_MS);
        const late = await dispatchRoute(
            host.routes,
            makeJsonRequest(
                "POST",
                { registrationToken: "valid-invitation" },
                { cookie },
            ),
            "/api/v1/auth/login",
        );
        assert.equal(late.res.status, 410);
        assert.equal((await host.accounts.list()).length, 0);
        assert.deepEqual(host.profiles, []);
        const fresh = await dispatchRoute(
            host.routes,
            makeJsonRequest("POST", {
                provider: "external-sso",
                registrationToken: "valid-invitation",
            }),
            "/api/v1/auth/login",
        );
        assert.equal(fresh.res.status, 200);
        const accountId = JSON.parse(fresh.res.payload).data.accountId;
        assert.match(accountId, /^u_/);
        assert.equal((await host.accounts.list()).length, 1);
        assert.deepEqual(host.profiles, [accountId]);
    });
}

test("TFA attempts expire exactly at their deadline", (context) => {
    context.mock.timers.enable({ apis: ["Date"], now: 1_800_000_000_000 });
    const runtime = createAuthRouteBootstrapRuntime();
    const attempt = runtime.createPendingTfaLoginAttempt({
        accountId: "u_person",
        role: "user",
        isFounder: false,
        provider: "local",
        providerId: "local",
        displayName: "Person",
        userValidationMode: "none",
        requiredUserValidation: false,
        ttlSeconds: 720,
    });
    assert.equal(runtime.getPendingTfaLoginAttempt(attempt.id)?.id, attempt.id);
    context.mock.timers.tick(TFA_LOGIN_ATTEMPT_TTL_MS);
    assert.equal(runtime.getPendingTfaLoginAttempt(attempt.id), null);
});

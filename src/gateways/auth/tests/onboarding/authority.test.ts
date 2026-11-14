import assert from "node:assert/strict";
import test from "node:test";
import { ServerResponse } from "node:http";
import { runBootstrapScope } from "@cognis/core";
import { registerAuthBootstrapHook } from "../../bootstrap/onboarding.js";
import { createRegistrationRoutes } from "../../bootstrap/routes/registration.js";
import { createOnboardingRoutes } from "../../bootstrap/routes/onboarding.js";
import { createLoginFixture } from "../session-assurance/fixture.js";
import { makeJsonRequest } from "../auth-gateway-test-helpers.js";
import { getAuthClaims } from "../../guard.js";
import {
    issueAccessToken,
    verifyAccessToken,
    lookupAccessToken,
    revokeAccessToken,
} from "../../access-tokens.js";
import type {
    OnboardingAuthority,
    OnboardingOperationContext,
} from "../../onboarding/contracts.js";

async function fixture() {
    const host = await createLoginFixture();
    let exists = true;
    host.context.accountStore.getInfo = async (username) =>
        exists ? { username, enabled: false } : null;
    const disposers: Array<
        (() => void | Promise<void>) & {
            reactivate?: () => void | Promise<void>;
        }
    > = [];
    await runBootstrapScope(host.root, "gateway:auth", async () =>
        registerAuthBootstrapHook(host.context),
    );
    const authority =
        host.capabilities.require<OnboardingAuthority>("auth:onboarding");
    const register = async (
        operation: Parameters<OnboardingAuthority["registerOperation"]>[0],
    ) =>
        runBootstrapScope(
            host.root,
            "module:example",
            async () => authority.registerOperation(operation),
            (dispose) => disposers.push(dispose),
        );
    const token = await authority.issue("assurance-user");
    const req = (credential = token) =>
        makeJsonRequest("POST", {}, { authorization: `Bearer ${credential}` });
    return {
        ...host,
        authority,
        token,
        req,
        register,
        disposers,
        removeAccount() {
            exists = false;
        },
    };
}

function deferred() {
    let resolve!: () => void;
    const promise = new Promise<void>((finish) => {
        resolve = finish;
    });
    return { promise, resolve };
}

test("onboarding authority is a bounded separate purpose and ordinary guards deny it", async () => {
    const host = await fixture();
    assert.equal(lookupAccessToken(host.token)?.purpose, "onboarding");
    assert.equal(verifyAccessToken(host.token), null);
    assert.equal(getAuthClaims(host.req()), null);
    assert.equal(
        verifyAccessToken(host.token, { purpose: "onboarding" })?.sub,
        "assurance-user",
    );
    await host.register({
        id: "example:self",
        execute: async (context, input) => {
            await context.assertCurrent();
            return { accountId: context.accountId, input };
        },
    });
    assert.deepEqual(
        await host.authority.dispatch(host.req(), "example:self", {
            accountId: "other",
        }),
        {
            accountId: "assurance-user",
            input: { accountId: "other" },
        },
    );
    for (const purpose of ["session", "share", "password-reset"] as const) {
        const token = issueAccessToken("assurance-user", "user", 60, {
            purpose,
        });
        await assert.rejects(
            host.authority.dispatch(host.req(token), "example:self", {}),
            /onboarding_unauthorized/,
        );
    }
});

test("registry captures contributor lifecycle, rejects duplicate and foreign IDs, and rolls back failed bootstrap", async () => {
    const host = await fixture();
    const operation = { id: "example:self", execute: async () => "ok" };
    assert.throws(
        () => host.authority.registerOperation(operation),
        /bootstrap_registration_closed/,
    );
    await host.register(operation);
    await assert.rejects(
        host.register(operation),
        /onboarding_operation_conflict/,
    );
    await assert.rejects(
        host.register({ ...operation, id: "notify:self" }),
        /invalid_onboarding_operation/,
    );
    for (const dispose of host.disposers) await dispose();
    await assert.rejects(
        host.authority.dispatch(host.req(), operation.id, {}),
        /onboarding_operation_unavailable/,
    );
    for (const dispose of host.disposers) await dispose.reactivate?.();
    assert.equal(
        await host.authority.dispatch(host.req(), operation.id, {}),
        "ok",
    );
    await assert.rejects(
        runBootstrapScope(host.root, "module:failed", async () => {
            host.authority.registerOperation({
                id: "failed:self",
                execute: async () => "bad",
            });
            throw new Error("bootstrap_failed");
        }),
        /bootstrap_failed/,
    );
    await assert.rejects(
        host.authority.dispatch(host.req(), "failed:self", {}),
        /onboarding_operation_unavailable/,
    );
});

for (const change of ["revoke", "delete", "disable", "complete"] as const) {
    test(`pending operation denies ${change} before effects`, async () => {
        const host = await fixture();
        const started = deferred();
        const release = deferred();
        let writes = 0;
        await host.register({
            id: "example:self",
            execute: async (context) => {
                started.resolve();
                await release.promise;
                await context.assertCurrent();
                writes++;
            },
        });
        const pending = host.authority.dispatch(host.req(), "example:self", {});
        await started.promise;
        if (change === "revoke") revokeAccessToken(host.token);
        if (change === "delete") host.removeAccount();
        if (change === "disable")
            for (const dispose of host.disposers) await dispose();
        if (change === "complete") await host.authority.complete(host.req());
        release.resolve();
        await assert.rejects(
            pending,
            /onboarding_unauthorized|onboarding_operation_unavailable/,
        );
        assert.equal(writes, 0);
    });
}

test("raw flow and captured operation work cannot replay authority", async () => {
    const host = await fixture();
    let captured: OnboardingOperationContext | undefined;
    let envelope: unknown;
    host.root.flow.extend(
        "auth:prepareOnboarding",
        "authorizeOperation",
        { id: "test:capture" },
        ({ input }) => {
            envelope = input;
        },
    );
    await host.register({
        id: "example:self",
        execute: async (context) => {
            captured = context;
            return true;
        },
    });
    await assert.rejects(
        host.root.flow.run("auth:prepareOnboarding", { action: "dispatch" }),
        /onboarding_unauthorized/,
    );
    assert.equal(
        await host.authority.dispatch(host.req(), "example:self", {}),
        true,
    );
    await assert.rejects(
        host.root.flow.run("auth:prepareOnboarding", envelope),
        /onboarding_unauthorized/,
    );
    await assert.rejects(captured!.assertCurrent(), /onboarding_unauthorized/);
});

test("completion is idempotent, revokes onboarding only and cannot exchange for a session", async () => {
    const host = await fixture();
    const session = issueAccessToken("assurance-user", "user", 60);
    const share = issueAccessToken("assurance-user", "user", 60, {
        purpose: "share",
    });
    await host.authority.complete(host.req());
    await host.authority.complete(host.req());
    assert.equal(
        verifyAccessToken(host.token, { purpose: "onboarding" }),
        null,
    );
    assert.ok(verifyAccessToken(session));
    assert.ok(verifyAccessToken(share, { purpose: "share" }));
    await assert.rejects(
        host.authority.complete(host.req(session)),
        /onboarding_unauthorized/,
    );
});

test("expiry and deletion fail closed", async (context) => {
    context.mock.timers.enable({ apis: ["Date"], now: Date.now() });
    const host = await fixture();
    await host.register({ id: "example:self", execute: async () => true });
    context.mock.timers.tick(1800 * 1000);
    await assert.rejects(
        host.authority.dispatch(host.req(), "example:self", {}),
        /onboarding_unauthorized/,
    );
    host.removeAccount();
    await assert.rejects(
        host.authority.issue("assurance-user"),
        /onboarding_unauthorized/,
    );
});

async function invoke(
    handler: ReturnType<typeof createOnboardingRoutes>,
    body: Record<string, unknown>,
    token: string,
    path: string,
) {
    const req = makeJsonRequest("POST", body, {
        authorization: `Bearer ${token}`,
    });
    const res = new ServerResponse(req);
    let payload = "";
    res.end = (chunk?: unknown) => {
        payload += String(chunk ?? "");
        return res;
    };
    await handler(req, res, new URL(path, "http://localhost"), {
        component: "test",
        method: "POST",
        path,
    });
    return {
        status: res.statusCode,
        payload: payload ? JSON.parse(payload) : null,
    };
}

for (const status of [400, 409, 422, 429, 503]) {
    test(`HTTP dispatch preserves owner-safe ${status} without internal errors`, async () => {
        const host = await fixture();
        await host.register({
            id: "example:self",
            execute: async () => {
                throw { status, code: "fixture_failure" };
            },
        });
        const result = await invoke(
            createOnboardingRoutes(host.capabilities),
            { operation: "example:self", input: {} },
            host.token,
            "/api/v1/auth/onboarding/operations",
        );
        assert.equal(result.status, status);
        assert.equal(result.payload.error.code, "fixture_failure");
    });
}

test("public registration issues onboarding and reports post-create issuance failure honestly", async () => {
    const host = await fixture();
    host.capabilities.contribute("registration:public:register", async () => ({
        username: "assurance-user",
        role: "user",
        enabled: false,
    }));
    const handler = createRegistrationRoutes({
        accountStore: host.context.accountStore,
        capabilities: host.capabilities,
        registrationsEnabled: async () => true,
        readSecuritySettings: async () => ({ userValidationMode: "none" }),
    });
    const result = await invoke(
        handler,
        { username: "synthetic", password: "fixture-only" },
        "",
        "/api/v1/auth/register",
    );
    assert.equal(result.status, 201);
    assert.equal(
        lookupAccessToken(result.payload.data.verifyToken)?.purpose,
        "onboarding",
    );
    host.removeAccount();
    const failed = await invoke(
        handler,
        { username: "synthetic", password: "fixture-only" },
        "",
        "/api/v1/auth/register",
    );
    assert.equal(failed.status, 503);
    assert.equal(failed.payload.data.accountCreated, true);
});

for (const state of [
    "absent",
    "disabled",
    "required",
    "missing",
    "failed",
    "assured",
] as const) {
    test(`registration onboarding cannot bypass subsequent real login with TFA ${state}`, async () => {
        const host = await createLoginFixture();
        await runBootstrapScope(host.root, "gateway:auth", async () =>
            registerAuthBootstrapHook(host.context),
        );
        const authority =
            host.capabilities.require<OnboardingAuthority>("auth:onboarding");
        host.capabilities.contribute(
            "registration:public:register",
            async () => ({
                username: "assurance-user",
                role: "user",
                enabled: true,
            }),
        );
        const handler = createRegistrationRoutes({
            accountStore: host.context.accountStore,
            capabilities: host.capabilities,
            registrationsEnabled: async () => true,
            readSecuritySettings: async () => ({ userValidationMode: "none" }),
        });
        const registered = await invoke(
            handler,
            { username: "synthetic", password: "fixture-only" },
            "",
            "/api/v1/auth/register",
        );
        const token = registered.payload.data.verifyToken;
        assert.equal(verifyAccessToken(token), null);
        if (state !== "absent") host.requireTfa();
        if (state === "disabled") await host.gatewayRegistry.disable("tfa");
        if (state === "required")
            host.capabilities.contribute("tfa:assessSession", async () => ({
                outcome: "tfa_required",
            }));
        if (state === "failed")
            host.capabilities.contribute("tfa:assessSession", async () => {
                throw new Error("fixture_failure");
            });
        if (state === "assured")
            host.capabilities.contribute("tfa:assessSession", async () => ({
                outcome: "assured",
                isAssuranceCurrent: () => true,
            }));
        const ordinary = issueAccessToken("assurance-user", "user", 60);
        const share = issueAccessToken("assurance-user", "user", 60, {
            purpose: "share",
        });
        const result = await host.request();
        const body = JSON.parse(result.payload);
        if (["absent", "disabled", "assured"].includes(state)) {
            assert.equal(result.status, 200);
            assert.ok(verifyAccessToken(body.data.token));
            assert.equal(
                verifyAccessToken(token, { purpose: "onboarding" }),
                null,
            );
        } else {
            if (state === "required") {
                assert.equal(body.data.tfaRequired, true);
            } else assert.ok(result.status >= 400);
            assert.equal(body.data?.token, undefined);
            assert.ok(verifyAccessToken(token, { purpose: "onboarding" }));
        }
        assert.ok(verifyAccessToken(ordinary));
        assert.ok(verifyAccessToken(share, { purpose: "share" }));
        authority.revokeForAccount("assurance-user");
    });
}

test("unavailable registered operations remain discoverable and deny dispatch", async () => {
    const host = await fixture();
    await host.register({
        id: "example:unavailable",
        available: () => false,
        execute: async () => {
            throw new Error("unexpected_execution");
        },
    });
    assert.deepEqual(host.authority.listOperations(), ["example:unavailable"]);
    await assert.rejects(
        host.authority.dispatch(host.req(), "example:unavailable", {}),
        /onboarding_operation_unavailable/,
    );
});

test("account cleanup invalidates pending issuance without blocking unrelated accounts", async () => {
    const host = await fixture();
    const started = deferred();
    const release = deferred();
    host.context.accountStore.getInfo = async (username) => {
        if (username === "assurance-user") {
            started.resolve();
            await release.promise;
        }
        return { username, enabled: true };
    };
    const pending = host.authority.issue("assurance-user");
    await started.promise;
    host.authority.revokeForAccount("assurance-user");
    const unrelated = await host.authority.issue("unrelated-account");
    release.resolve();
    await assert.rejects(pending, /onboarding_unauthorized/);
    assert.equal(
        verifyAccessToken(unrelated, { purpose: "onboarding" })?.sub,
        "unrelated-account",
    );
});

test("unverified registration cleanup revokes onboarding before deleting the account", async (context) => {
    context.mock.timers.enable({ apis: ["setTimeout"] });
    const host = await fixture();
    host.capabilities.contribute("registration:public:register", async () => ({
        username: "assurance-user",
        role: "user",
        enabled: false,
    }));
    host.capabilities.contribute("notify:hasVerifiedEmail", async () => false);
    const deleted = deferred();
    host.context.accountStore.delete = async () => {
        assert.equal(
            verifyAccessToken(host.token, { purpose: "onboarding" }),
            null,
        );
        host.removeAccount();
        deleted.resolve();
    };
    const handler = createRegistrationRoutes({
        accountStore: host.context.accountStore,
        capabilities: host.capabilities,
        registrationsEnabled: async () => true,
        readSecuritySettings: async () => ({ userValidationMode: "email" }),
    });
    const registered = await invoke(
        handler,
        { username: "synthetic", password: "fixture-only" },
        "",
        "/api/v1/auth/register",
    );
    assert.equal(registered.status, 201);
    const ordinary = issueAccessToken("assurance-user", "user", 60);
    context.mock.timers.tick(5 * 60 * 1000);
    await deleted.promise;
    assert.equal(
        verifyAccessToken(registered.payload.data.verifyToken, {
            purpose: "onboarding",
        }),
        null,
    );
    assert.ok(verifyAccessToken(ordinary));
});

test("operation availability changes across awaits cannot authorize stale work", async () => {
    const host = await fixture();
    const entered = deferred();
    const release = deferred();
    let effects = 0;
    await host.register({
        id: "example:self",
        available: async () => {
            entered.resolve();
            await release.promise;
            return true;
        },
        execute: async () => {
            effects++;
        },
    });
    const pending = host.authority.dispatch(host.req(), "example:self", {});
    await entered.promise;
    host.removeAccount();
    release.resolve();
    await assert.rejects(pending, /onboarding_unauthorized/);
    assert.equal(effects, 0);
});

test("availability is checked again after account lookup before effects", async () => {
    const host = await fixture();
    let available = true;
    let effects = 0;
    host.context.accountStore.getInfo = async (username) => {
        available = false;
        return { username, enabled: true };
    };
    await host.register({
        id: "example:self",
        available: () => available,
        execute: async () => {
            effects++;
        },
    });
    await assert.rejects(
        host.authority.dispatch(host.req(), "example:self", {}),
        /onboarding_operation_unavailable/,
    );
    assert.equal(effects, 0);
});

for (const options of [
    { setupPending: "false" },
    { setupPending: true },
    { providerId: "external" },
    { providerId: "" },
    { issuedAt: NaN },
    { extraAuthority: true },
]) {
    test(`unsafe onboarding issuance options fail before token creation ${JSON.stringify(options)}`, () => {
        assert.throws(
            () =>
                Reflect.apply(issueAccessToken, null, [
                    "synthetic",
                    "user",
                    1800,
                    { purpose: "onboarding", ...options },
                ]),
            /invalid_onboarding_credential/,
        );
    });
}

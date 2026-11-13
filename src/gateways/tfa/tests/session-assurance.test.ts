import assert from "node:assert/strict";
import test from "node:test";
import { createSessionFixture, candidate } from "./reuse/session-fixture.js";

for (const failure of ["status-read", "provider-outage", "challenge-error"]) {
    test(`registered TFA assessment fails closed for ${failure}`, async () => {
        const fixture = await createSessionFixture();
        if (failure === "status-read")
            fixture.store.listUserMethods = async () => {
                throw new Error("synthetic_read_failure");
            };
        if (failure === "provider-outage")
            await fixture.store.upsertUserMethod({
                accountId: "alice",
                methodId: "missing",
                enabled: true,
                sortOrder: 0,
                state: {},
            });
        if (failure === "challenge-error") {
            await fixture.enroll();
            fixture.adapter.beginLoginChallenge = async () => {
                throw new Error("synthetic_challenge_failure");
            };
        }
        assert.equal((await fixture.assess()).outcome, "tfa_unavailable");
        assert.equal(fixture.state.commits, 0);
        assert.equal(fixture.state.issued.length, 0);
    });
}

test("explicitly unenrolled account passes assessment without issuing a token", async () => {
    const fixture = await createSessionFixture();
    assert.equal((await fixture.assess()).outcome, "assured");
    assert.equal(fixture.state.issued.length, 0);
});

test("provider outage retains enrollment and recovery-code verification", async () => {
    const fixture = await createSessionFixture();
    await fixture.store.upsertUserMethod({
        accountId: "alice",
        methodId: "missing",
        enabled: true,
        sortOrder: 0,
        state: {},
    });
    fixture.store.recoveryCodes.push({
        accountId: "alice",
        codeHash: "local-recovery-proof",
        sortOrder: 0,
        createdAt: new Date().toISOString(),
        usedAt: null,
    });
    const result = await fixture.assess();
    assert.equal(result.outcome, "tfa_required");
    assert.deepEqual(
        (result.methods as Array<{ id: string }>).map((method) => method.id),
        ["recovery_code"],
    );
    const verified = await fixture.request("/api/v1/tfa/login/verify", {
        loginAttemptId: result.loginAttemptId,
        methodId: "recovery_code",
        code: "local-recovery-proof",
    });
    assert.equal(verified.status, 200);
    assert.equal(verified.body.data?.token, "assured-token");
    assert.equal(fixture.state.commits, 1);
});

test("persisted administrative disablement differs from provider unavailability", async () => {
    const fixture = await createSessionFixture();
    await fixture.store.upsertUserMethod({
        accountId: "alice",
        methodId: "missing",
        enabled: true,
        sortOrder: 0,
        state: {},
    });
    await fixture.store.saveAdapterConfig("missing", false, {});
    await fixture.gateway.loadPersistedConfigs();
    assert.equal((await fixture.assess()).outcome, "assured");
});

test("failed administrator disable persistence does not waive factor enforcement", async () => {
    const fixture = await createSessionFixture();
    await fixture.enroll();
    fixture.store.saveAdapterConfig = async () => {
        throw new Error("synthetic_write_failure");
    };
    await assert.rejects(fixture.gateway.disableAdapter("totp"));
    assert.equal((await fixture.assess()).outcome, "tfa_required");
});

test("pending and failed factor attempts do not call the final session owner", async () => {
    const fixture = await createSessionFixture();
    await fixture.enroll();
    const result = await fixture.assess();
    assert.equal(result.outcome, "tfa_required");
    assert.equal(result.token, undefined);
    assert.equal(fixture.state.commits, 0);
    const failed = await fixture.request("/api/v1/tfa/login/verify", {
        loginAttemptId: result.loginAttemptId,
        methodId: "totp",
        code: "wrong",
    });
    assert.equal(failed.status, 401);
    assert.equal(fixture.state.commits, 0);
    assert.equal(fixture.state.issued.length, 0);
});

test("successful concurrent factor verification consumes an attempt and commits exactly once", async () => {
    const fixture = await createSessionFixture();
    await fixture.enroll();
    const result = await fixture.assess();
    const body = {
        loginAttemptId: result.loginAttemptId,
        methodId: "totp",
        code: "123456",
    };
    const replies = await Promise.all([
        fixture.request("/api/v1/tfa/login/verify", body),
        fixture.request("/api/v1/tfa/login/verify", body),
    ]);
    assert.deepEqual(replies.map((reply) => reply.status).sort(), [200, 401]);
    assert.equal(fixture.state.commits, 1);
    assert.equal(fixture.attempts.size, 0);
    assert.equal(
        (await fixture.request("/api/v1/tfa/login/verify", body)).status,
        401,
    );
});

for (const outcome of [
    "session_unavailable",
    "account_archived",
    "account_disabled",
]) {
    test(`final session ${outcome} cannot return a token or cookie`, async () => {
        const fixture = await createSessionFixture();
        await fixture.enroll();
        const result = await fixture.assess();
        fixture.state.commitOutcome = outcome;
        const reply = await fixture.request("/api/v1/tfa/login/verify", {
            loginAttemptId: result.loginAttemptId,
            methodId: "totp",
            code: "123456",
        });
        assert.equal(
            reply.status,
            outcome === "session_unavailable" ? 503 : 403,
        );
        assert.equal(reply.body.error?.code, outcome);
        assert.equal(reply.headers["set-cookie"], undefined);
        assert.equal(reply.body.data, undefined);
    });
}

test("enforced setup stays restricted and completes through the final session owner", async () => {
    const fixture = await createSessionFixture();
    fixture.store.getEnforceAllUsers = async () => true;
    const assessment = await fixture.assess();
    assert.equal(assessment.outcome, "tfa_setup_required");
    assert.deepEqual(fixture.state.issued, [
        { providerId: "local", setupPending: true },
    ]);
    assert.equal(fixture.state.commits, 0);
    const setup = await fixture.gateway.beginMethodSetup({
        accountId: candidate.accountId,
        displayName: "Alice",
        methodId: "totp",
    });
    const reply = await fixture.request(
        "/api/v1/tfa/methods/totp/setup/verify",
        { setupId: setup.setupId, verification: { code: "123456" } },
    );
    assert.equal(reply.status, 200);
    assert.equal(reply.body.data?.token, "assured-token");
    assert.equal(fixture.state.commits, 1);
});

test("assessment cleanup rejects retained calls and re-enable restores the flow", async () => {
    const fixture = await createSessionFixture();
    for (const dispose of [...fixture.disposers].reverse()) await dispose();
    assert.equal((await fixture.assess()).outcome, "tfa_unavailable");
    for (const dispose of fixture.disposers) await dispose.reactivate?.();
    assert.equal((await fixture.assess()).outcome, "assured");
});

test("concurrent setup completion commits only once and preserves the session TTL", async () => {
    const fixture = await createSessionFixture();
    const setup = await fixture.gateway.beginMethodSetup({
        accountId: candidate.accountId,
        displayName: "Alice",
        methodId: "totp",
    });
    const request = {
        setupId: setup.setupId,
        verification: { code: "123456" },
    };
    const replies = await Promise.all([
        fixture.request("/api/v1/tfa/methods/totp/setup/verify", request),
        fixture.request("/api/v1/tfa/methods/totp/setup/verify", request),
    ]);
    assert.deepEqual(replies.map((reply) => reply.status).sort(), [200, 422]);
    assert.equal(fixture.state.commits, 1);
    assert.deepEqual(fixture.state.committedInputs, [
        {
            accountId: "alice",
            role: "user",
            ttlSeconds: 1800,
            providerId: "local",
        },
    ]);
    assert.equal(
        replies.find((reply) => reply.status === 200)?.body.data?.ttlSeconds,
        1800,
    );
});

test("login verification preserves finite and non-expiring session TTLs", async () => {
    for (const ttlSeconds of [42, null]) {
        const fixture = await createSessionFixture();
        await fixture.enroll();
        const result = await fixture.assess();
        const attempt = fixture.attempts.get(String(result.loginAttemptId))!;
        Object.assign(attempt, { ttlSeconds });
        const reply = await fixture.request("/api/v1/tfa/login/verify", {
            loginAttemptId: result.loginAttemptId,
            methodId: "totp",
            code: "123456",
        });
        assert.equal(reply.status, 200);
        assert.equal(reply.body.data?.ttlSeconds, ttlSeconds);
        assert.deepEqual(fixture.state.committedInputs, [
            {
                accountId: "alice",
                role: "user",
                ttlSeconds,
                providerId: "local",
            },
        ]);
    }
});

test("cleanup during a policy read cannot create a challenge or setup token afterward", async () => {
    const fixture = await createSessionFixture();
    const entered = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    fixture.store.getEnforceAllUsers = async () => {
        entered.resolve();
        await release.promise;
        return true;
    };
    const pending = fixture.assess();
    await entered.promise;
    for (const dispose of [...fixture.disposers].reverse()) await dispose();
    release.resolve();
    assert.equal((await pending).outcome, "tfa_unavailable");
    assert.equal(fixture.state.issued.length, 0);
    assert.equal(fixture.attempts.size, 0);
});

test("client completion claims cannot replace a live attempt or valid factor", async () => {
    const fixture = await createSessionFixture();
    await fixture.enroll();
    const result = await fixture.assess();
    const flags = {
        verified: true,
        outcome: "success",
        accountId: "other-account",
        role: "owner",
        ttlSeconds: null,
        code: "wrong",
    };
    assert.equal(
        (
            await fixture.request("/api/v1/tfa/login/verify", {
                ...flags,
                loginAttemptId: "invented",
                methodId: "totp",
            })
        ).status,
        401,
    );
    assert.equal(
        (
            await fixture.request("/api/v1/tfa/login/verify", {
                ...flags,
                loginAttemptId: result.loginAttemptId,
                methodId: "totp",
            })
        ).status,
        401,
    );
    assert.equal(fixture.state.commits, 0);
    const verified = await fixture.request("/api/v1/tfa/login/verify", {
        ...flags,
        loginAttemptId: result.loginAttemptId,
        methodId: "totp",
        code: "123456",
    });
    assert.equal(verified.status, 200);
    assert.deepEqual(fixture.state.committedInputs, [
        {
            accountId: "alice",
            role: "user",
            ttlSeconds: 1800,
            providerId: "local",
        },
    ]);
});

test("setup completion requires real validation and cannot be replayed or promoted by client claims", async () => {
    const fixture = await createSessionFixture();
    const setup = await fixture.gateway.beginMethodSetup({
        accountId: "alice",
        displayName: "Alice",
        methodId: "totp",
    });
    const flags = {
        setupId: setup.setupId,
        verified: true,
        accountId: "other-account",
        role: "owner",
        verification: { verified: true, code: "wrong" },
    };
    assert.equal(
        (await fixture.request("/api/v1/tfa/methods/totp/setup/verify", flags))
            .status,
        422,
    );
    assert.equal(fixture.state.commits, 0);
    const valid = { ...flags, verification: { code: "123456" } };
    assert.equal(
        (await fixture.request("/api/v1/tfa/methods/totp/setup/verify", valid))
            .status,
        200,
    );
    assert.deepEqual(fixture.state.committedInputs, [
        {
            accountId: "alice",
            role: "user",
            ttlSeconds: 1800,
            providerId: "local",
        },
    ]);
    assert.equal(
        (await fixture.request("/api/v1/tfa/methods/totp/setup/verify", valid))
            .status,
        422,
    );
    assert.equal(fixture.state.commits, 1);
});

test("TFA disable and re-enable invalidate an already running factor completion", async () => {
    const fixture = await createSessionFixture();
    await fixture.enroll();
    const result = await fixture.assess();
    const entered = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    fixture.adapter.verifyLogin = async () => {
        entered.resolve();
        await release.promise;
        return { verified: true };
    };
    const pending = fixture.request("/api/v1/tfa/login/verify", {
        loginAttemptId: result.loginAttemptId,
        methodId: "totp",
        code: "123456",
    });
    await entered.promise;
    await fixture.gatewayRegistry.disable("tfa");
    assert.equal(fixture.routeRegistry.getEntries().length, 0);
    await fixture.gatewayRegistry.enable("tfa");
    assert.equal(fixture.routeRegistry.getEntries().length, 1);
    release.resolve();
    assert.equal((await pending).status, 503);
    assert.equal(fixture.state.commits, 0);
});

for (const rejection of ["returned", "mutated", "thrown"]) {
    test(`late assessment ${rejection} policy denial cannot return assured`, async () => {
        const fixture = await createSessionFixture();
        fixture.root.flow.extend(
            "tfa:assessSession",
            "resolveChallenge",
            { id: "proof:finalGate", order: 1000 },
            ({ data }) => {
                if (rejection === "thrown")
                    throw new Error("synthetic_policy_failure");
                const result = { outcome: "tfa_unavailable" };
                if (rejection === "mutated") data.result = result;
                else return { result };
            },
        );
        assert.equal((await fixture.assess()).outcome, "tfa_unavailable");
        assert.equal(fixture.state.commits, 0);
        assert.equal(fixture.state.issued.length, 0);
    });
}

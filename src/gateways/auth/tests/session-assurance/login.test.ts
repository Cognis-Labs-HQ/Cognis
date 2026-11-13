import assert from "node:assert/strict";
import test from "node:test";
import {
    revokeAccessTokensForSubject,
    verifyAccessToken,
} from "../../access-tokens.js";
import type {
    SessionCommitInput,
    SessionCommitResult,
} from "../../bootstrap/session-commit.js";
import { createLoginFixture } from "./fixture.js";

const candidate: SessionCommitInput = {
    accountId: "assurance-user",
    role: "user",
    providerId: "local",
    ttlSeconds: 1800,
};

for (const lifecycle of ["active", "deactivated", "absent"]) {
    test(`registered login commits a session with ${lifecycle} optional lifecycle`, async () => {
        const fixture = await createLoginFixture();
        fixture.state.lifecycle = lifecycle;
        if (lifecycle === "absent")
            fixture.capabilities.remove("social:profileLifecycle");
        const result = await fixture.login();
        assert.equal(result.outcome, "success");
        assert.equal(
            verifyAccessToken(String(result.token))?.setupPending,
            false,
        );
        assert.equal(
            fixture.state.activations,
            lifecycle === "deactivated" ? 1 : 0,
        );
        assert.equal(fixture.state.logins, 1);
        revokeAccessTokensForSubject(candidate.accountId);
    });
}

for (const failure of [
    "archived",
    "read",
    "write",
    "missing-assessment",
    "unavailable",
    "pending",
    "abandoned",
]) {
    test(`registered login never commits an ordinary session for ${failure}`, async () => {
        revokeAccessTokensForSubject(candidate.accountId);
        const fixture = await createLoginFixture();
        if (failure === "archived") fixture.state.lifecycle = "archived";
        if (failure === "read") fixture.state.readFails = true;
        if (failure === "write") fixture.state.writeFails = true;
        if (
            [
                "missing-assessment",
                "unavailable",
                "pending",
                "abandoned",
            ].includes(failure)
        ) {
            fixture.requireTfa();
            if (failure !== "missing-assessment") {
                fixture.capabilities.contribute(
                    "tfa:assessSession",
                    async () => ({
                        outcome:
                            failure === "unavailable"
                                ? "tfa_unavailable"
                                : "tfa_required",
                    }),
                );
            }
        }
        const result = await fixture.login();
        const expected =
            failure === "archived"
                ? "account_archived"
                : ["read", "write"].includes(failure)
                  ? "session_unavailable"
                  : ["pending", "abandoned"].includes(failure)
                    ? "tfa_required"
                    : "tfa_unavailable";
        assert.equal(result.outcome, expected);
        assert.equal(result.token, undefined);
        assert.equal(fixture.state.activations, 0);
        assert.equal(fixture.state.logins, 0);
        // Counts the real token store, including tokens not returned by the flow.
        assert.equal(revokeAccessTokensForSubject(candidate.accountId), 0);
    });
}

test("explicitly disabled TFA permits the intentional primary-only policy", async () => {
    const fixture = await createLoginFixture();
    fixture.requireTfa();
    await fixture.gatewayRegistry.disable("tfa");
    const result = await fixture.login();
    assert.equal(result.outcome, "success");
    revokeAccessTokensForSubject(candidate.accountId);
});

test("successful assurance and concurrent commits activate a profile only once", async () => {
    const fixture = await createLoginFixture();
    fixture.requireTfa();
    fixture.capabilities.contribute("tfa:assessSession", async () => ({
        outcome: "assured",
        isAssuranceCurrent: () => true,
    }));
    const results = await Promise.all([fixture.login(), fixture.login()]);
    assert.deepEqual(
        results.map((result) => result.outcome),
        ["success", "success"],
    );
    assert.equal(fixture.state.activations, 1);
    assert.equal(fixture.state.logins, 2);
    assert.equal(revokeAccessTokensForSubject(candidate.accountId), 2);
});

test("final completion rechecks archive and enabled state after challenge", async () => {
    const fixture = await createLoginFixture();
    const complete = fixture.capabilities.require<
        (input: SessionCommitInput) => Promise<SessionCommitResult>
    >("auth:completeSession");
    fixture.state.lifecycle = "archived";
    assert.deepEqual(await complete(candidate), {
        outcome: "account_archived",
    });
    fixture.state.lifecycle = "deactivated";
    fixture.state.enabled = false;
    assert.deepEqual(await complete(candidate), {
        outcome: "account_disabled",
    });
    assert.equal(fixture.state.activations, 0);
    assert.equal(revokeAccessTokensForSubject(candidate.accountId), 0);
});

test("retained completion authority fails closed after owner cleanup and reactivates safely", async () => {
    const fixture = await createLoginFixture();
    const complete = fixture.capabilities.require<
        (input: SessionCommitInput) => Promise<SessionCommitResult>
    >("auth:completeSession");
    for (const dispose of [...fixture.disposers].reverse()) await dispose();
    assert.equal((await complete(candidate)).outcome, "session_unavailable");
    assert.equal(fixture.state.activations, 0);
    for (const dispose of fixture.disposers) await dispose.reactivate?.();
    assert.equal((await complete(candidate)).outcome, "success");
    assert.equal(fixture.state.activations, 1);
    revokeAccessTokensForSubject(candidate.accountId);
});

test("cleanup during lifecycle lookup prevents late profile activation and token issuance", async () => {
    const fixture = await createLoginFixture();
    const complete = fixture.capabilities.require<
        (input: SessionCommitInput) => Promise<SessionCommitResult>
    >("auth:completeSession");
    const entered = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    fixture.state.readBarrier = async () => {
        entered.resolve();
        await release.promise;
    };
    const pending = complete(candidate);
    await entered.promise;
    for (const dispose of [...fixture.disposers].reverse()) await dispose();
    release.resolve();
    assert.equal((await pending).outcome, "session_unavailable");
    assert.equal(fixture.state.activations, 0);
    assert.equal(revokeAccessTokensForSubject(candidate.accountId), 0);
});

test("login HTTP failure exposes no token or cookie when lifecycle read fails", async () => {
    const fixture = await createLoginFixture();
    fixture.state.readFails = true;
    const res = await fixture.request();
    assert.equal(res.status, 503);
    assert.equal(JSON.parse(res.payload).error.code, "session_unavailable");
    assert.equal(res.headers["set-cookie"], undefined);
});

test("primary flow alone prepares credentials without session or lifecycle commitment", async () => {
    const fixture = await createLoginFixture();
    const prepared = await fixture.root.flow.run("login", {
        provider: "local",
    });
    const result = prepared.data.sessionResult as Record<string, unknown>;
    assert.equal(result.outcome, "authenticated");
    assert.equal(result.token, undefined);
    assert.equal(fixture.state.activations, 0);
    assert.equal(revokeAccessTokensForSubject(candidate.accountId), 0);
});

for (const laterGate of ["pending", "throws"]) {
    test(`later primary-flow ${laterGate} gate precedes final session commitment`, async () => {
        const fixture = await createLoginFixture();
        fixture.root.flow.extend(
            "login",
            "establish-session",
            { id: "proof:lateGate", order: 1000 },
            ({ data }) => {
                if (laterGate === "throws")
                    throw new Error("synthetic_late_gate_failure");
                data.sessionResult = { outcome: "tfa_required" };
            },
        );
        if (laterGate === "throws")
            assert.equal(
                (await fixture.login()).outcome,
                "session_unavailable",
            );
        else assert.equal((await fixture.login()).outcome, "tfa_required");
        assert.equal(fixture.state.activations, 0);
        assert.equal(revokeAccessTokensForSubject(candidate.accountId), 0);
    });
}

test("an old primary-flow completion cannot resume after Auth cleanup and re-enable", async () => {
    const fixture = await createLoginFixture();
    const entered = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    fixture.root.flow.extend(
        "login",
        "establish-session",
        { id: "proof:delayedGate", order: 1000 },
        async () => {
            entered.resolve();
            await release.promise;
        },
    );
    const pending = fixture.login();
    await entered.promise;
    for (const dispose of [...fixture.disposers].reverse()) await dispose();
    for (const dispose of fixture.disposers) await dispose.reactivate?.();
    release.resolve();
    assert.equal((await pending).outcome, "session_unavailable");
    assert.equal(fixture.state.activations, 0);
    assert.equal(revokeAccessTokensForSubject(candidate.accountId), 0);
});

test("client-supplied authentication and completion claims cannot bypass primary credentials", async () => {
    const fixture = await createLoginFixture();
    fixture.state.credentialsValid = false;
    const reply = await fixture.request({
        provider: "local",
        verified: true,
        outcome: "assured",
        token: "forged",
        authenticatedSession: {
            accountId: "assurance-user",
            role: "owner",
            provider: "local",
        },
    });
    assert.equal(reply.status, 401);
    assert.equal(fixture.state.activations, 0);
    assert.equal(revokeAccessTokensForSubject(candidate.accountId), 0);
});

test("final Auth commit rechecks the factor owner lifetime after an awaited lifecycle read", async () => {
    const fixture = await createLoginFixture();
    const complete = fixture.capabilities.require<
        (input: SessionCommitInput) => Promise<SessionCommitResult>
    >("auth:completeSession");
    const entered = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    let current = true;
    fixture.state.readBarrier = async () => {
        entered.resolve();
        await release.promise;
    };
    const pending = complete({
        ...candidate,
        isAssuranceCurrent: () => current,
    });
    await entered.promise;
    current = false;
    release.resolve();
    assert.equal((await pending).outcome, "session_unavailable");
    assert.equal(fixture.state.activations, 0);
    assert.equal(revokeAccessTokensForSubject(candidate.accountId), 0);
});

test("a failing final-session extension cannot leave an issued ordinary token active", async () => {
    const fixture = await createLoginFixture();
    fixture.root.flow.extend(
        "auth:prepareSession",
        "authorizeSession",
        { id: "proof:lateCommitFailure", order: 1000 },
        () => {
            throw new Error("synthetic_commit_extension_failure");
        },
    );
    assert.equal((await fixture.login()).outcome, "session_unavailable");
    assert.equal(revokeAccessTokensForSubject(candidate.accountId), 0);
});

test("return-only primary-flow denials precede final assurance and session commitment", async () => {
    const fixture = await createLoginFixture();
    fixture.root.flow.extend(
        "login",
        "establish-session",
        { id: "proof:returnOnlyDenial", order: 1000 },
        () => ({ sessionResult: { outcome: "tfa_required" } }),
    );
    assert.equal((await fixture.login()).outcome, "tfa_required");
    assert.equal(fixture.state.activations, 0);
    assert.equal(revokeAccessTokensForSubject(candidate.accountId), 0);
});

for (const rejection of ["overwritten-outcome", "expired-assurance"]) {
    test(`final preparation ${rejection} denies before token issuance`, async () => {
        const fixture = await createLoginFixture();
        let current = true;
        fixture.root.flow.extend(
            "auth:prepareSession",
            "authorizeSession",
            { id: "proof:lateRejection", order: 1000 },
            ({ data }) => {
                if (rejection === "overwritten-outcome")
                    data.result = { outcome: "session_unavailable" };
                else current = false;
            },
        );
        const complete = fixture.capabilities.require<
            (input: SessionCommitInput) => Promise<SessionCommitResult>
        >("auth:completeSession");
        assert.equal(
            (
                await complete({
                    ...candidate,
                    isAssuranceCurrent: () => current,
                })
            ).outcome,
            "session_unavailable",
        );
        assert.equal(revokeAccessTokensForSubject(candidate.accountId), 0);
    });
}

for (const flowId of ["auth:prepareLogin", "auth:prepareSession"]) {
    for (const rejection of ["returned", "mutated", "thrown"]) {
        test(`${flowId} terminal preparation ${rejection} gate denies before activation or issuance`, async () => {
            const fixture = await createLoginFixture();
            const key =
                flowId === "auth:prepareLogin" ? "sessionResult" : "result";
            fixture.root.flow.extend(
                flowId,
                "authorizeSession",
                { id: "proof:finalPolicy", order: 1000 },
                ({ data }) => {
                    if (rejection === "thrown")
                        throw new Error("synthetic_policy_failure");
                    const denial = { outcome: "account_disabled" };
                    if (rejection === "mutated") data[key] = denial;
                    else return { [key]: denial };
                },
            );
            assert.equal(
                (await fixture.login()).outcome,
                rejection === "thrown"
                    ? "session_unavailable"
                    : "account_disabled",
            );
            assert.equal(fixture.state.activations, 0);
            assert.equal(revokeAccessTokensForSubject(candidate.accountId), 0);
        });
    }
}

for (const outcome of ["success", "assured"]) {
    test(`premature primary ${outcome} cannot bypass final assurance`, async () => {
        const fixture = await createLoginFixture();
        fixture.root.flow.extend(
            "login",
            "establish-session",
            { id: "proof:prematureCompletion", order: 1000 },
            () => ({
                sessionResult: { ...candidate, outcome, token: "untrusted" },
            }),
        );
        assert.equal((await fixture.login()).outcome, "session_unavailable");
        assert.equal(fixture.state.activations, 0);
        assert.equal(revokeAccessTokensForSubject(candidate.accountId), 0);
    });
}

test("return-only account validation denial is honored before lifecycle mutation", async () => {
    const fixture = await createLoginFixture();
    fixture.root.flow.extend(
        "auth:prepareSession",
        "validateAccount",
        { id: "proof:accountGate", order: 1000 },
        () => ({ result: { outcome: "account_disabled" } }),
    );
    assert.equal((await fixture.login()).outcome, "account_disabled");
    assert.equal(fixture.state.activations, 0);
    assert.equal(revokeAccessTokensForSubject(candidate.accountId), 0);
});

test("successful return-only final policy gate permits terminal commit", async () => {
    const fixture = await createLoginFixture();
    fixture.root.flow.extend(
        "auth:prepareSession",
        "authorizeSession",
        { id: "proof:ready", order: 1000 },
        () => ({ result: { outcome: "ready" } }),
    );
    assert.equal((await fixture.login()).outcome, "success");
    assert.equal(fixture.state.activations, 1);
    assert.equal(revokeAccessTokensForSubject(candidate.accountId), 1);
});

test("lease invalidation immediately after issuance revokes only this operation's token", async () => {
    const fixture = await createLoginFixture();
    const complete = fixture.capabilities.require<
        (input: SessionCommitInput) => Promise<SessionCommitResult>
    >("auth:completeSession");
    const previous = await complete(candidate);
    assert.equal(previous.outcome, "success");
    const recordedLogins = fixture.state.logins;
    let checksAfterLogin = 0;
    const denied = await complete({
        ...candidate,
        isAssuranceCurrent: () => {
            if (fixture.state.logins === recordedLogins) return true;
            checksAfterLogin += 1;
            return checksAfterLogin === 1;
        },
    });
    assert.equal(checksAfterLogin, 2);
    assert.equal(denied.outcome, "session_unavailable");
    if (previous.outcome !== "success")
        assert.fail("expected existing session");
    assert.equal(verifyAccessToken(previous.token)?.sub, candidate.accountId);
    assert.equal(revokeAccessTokensForSubject(candidate.accountId), 1);
});

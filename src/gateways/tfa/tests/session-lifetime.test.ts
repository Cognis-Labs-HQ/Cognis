import assert from "node:assert/strict";
import test from "node:test";
import { createSessionFixture } from "./reuse/session-fixture.js";

for (const method of ["totp", "smtp", "recovery_code"])
    test(`${method} completion cancels challenge resources without cancelling the assured session commit`, async () => {
        const host = await createSessionFixture();
        await host.enroll();
        let challengeSignal: AbortSignal | undefined;
        host.adapter.beginLoginChallenge = async (input) => {
            challengeSignal = input.lifetime.signal;
            assert.equal(host.attempts.size, 1);
            assert.equal(host.state.commits, 0);
            assert.equal(host.state.issued.length, 0);
            return { ready: true, deliveryStatus: "queued" };
        };
        // The owner contract fake represents either a TOTP verifier or SMTP's single-use verifier.
        if (method === "smtp")
            host.adapter.verifyLogin = async () => ({ verified: true });
        const result = await host.assess();
        const owner = host.lifetimes.get(String(result.loginAttemptId))!;
        assert.equal(challengeSignal?.aborted, false);
        if (method === "recovery_code")
            host.store.recoveryCodes.push({
                accountId: "alice",
                codeHash: "RECOVERY",
                sortOrder: 0,
                createdAt: "",
                usedAt: null,
            });
        const reply = await host.request("/api/v1/tfa/login/verify", {
            loginAttemptId: result.loginAttemptId,
            methodId: method === "recovery_code" ? method : host.adapter.id,
            code: method === "recovery_code" ? "RECOVERY" : "123456",
        });
        assert.equal(reply.status, 200);
        assert.equal(reply.body.data?.token, "assured-token");
        assert.equal(host.state.commits, 1);
        assert.equal(owner.signal.aborted, true);
        assert.equal(challengeSignal?.aborted, true);
    });

test("missing versioned Auth lifetime fails closed and clears early allocation", async () => {
    const host = await createSessionFixture({ lifetimeAvailable: false });
    await host.enroll();
    let admissions = 0;
    host.adapter.beginLoginChallenge = async () => {
        admissions++;
        return { ready: true };
    };
    assert.equal((await host.assess()).outcome, "tfa_unavailable");
    assert.equal(admissions, 0);
    assert.equal(host.attempts.size, 0);
    assert.equal(host.state.commits, 0);
});

test("failed preparation cleans authority and parallel successful logins own distinct lifetimes", async () => {
    const host = await createSessionFixture();
    await host.enroll();
    host.adapter.beginLoginChallenge = async () => {
        throw new Error("synthetic_prepare_failure");
    };
    assert.equal((await host.assess()).outcome, "tfa_unavailable");
    assert.equal(host.attempts.size, 0);
    host.adapter.beginLoginChallenge = async () => ({ ready: true });
    const [first, second] = await Promise.all([host.assess(), host.assess()]);
    assert.notEqual(first.loginAttemptId, second.loginAttemptId);
    assert.equal(host.attempts.size, 2);
    assert.equal(host.state.commits, 0);
    host.lifetimes.forEach((owner) => owner.controller.abort());
});

test("delivery failure can be explicitly resent on the same unextended pending attempt", async () => {
    const host = await createSessionFixture();
    await host.enroll();
    let valid = false,
        admission = 0;
    host.adapter.beginLoginChallenge = async () => {
        valid = ++admission > 1;
        return { ready: true, deliveryStatus: "queued" };
    };
    host.adapter.verifyLogin = async () => ({ verified: valid });
    const result = await host.assess();
    const owner = host.lifetimes.get(String(result.loginAttemptId))!;
    const body = {
        loginAttemptId: result.loginAttemptId,
        methodId: host.adapter.id,
        code: "123456",
    };
    assert.equal(
        (await host.request("/api/v1/tfa/login/verify", body)).status,
        401,
    );
    assert.equal(host.attempts.size, 1);
    const resent = await host.request("/api/v1/tfa/login/resend", body);
    assert.equal(resent.status, 200);
    assert.equal(
        (resent.body.data?.challenge as { deliveryStatus: string })
            .deliveryStatus,
        "queued",
    );
    assert.equal(host.lifetimes.get(String(result.loginAttemptId)), owner);
    assert.equal(
        (await host.request("/api/v1/tfa/login/verify", body)).status,
        200,
    );
    assert.equal(host.state.commits, 1);
});

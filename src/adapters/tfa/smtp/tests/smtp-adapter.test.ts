import test from "node:test";
import assert from "node:assert/strict";
import { createAdapter } from "../index.js";

test("smtp adapter setup sends a code and verifies it", async () => {
    const sentCodes: Array<{ to: string; code: string }> = [];
    const adapter = createAdapter({
        getEmailDeliveryPolicy: () => ({
            codeLength: 6,
            minimumIntervalMs: 15000,
        }),
        canSendVerificationEmail: () => true,
        sendVerificationEmail: async (to, code) => {
            sentCodes.push({ to, code });
        },
        getPrimaryEmail: async () => "alice@example.com",
    });
    const setup = await adapter.beginSetup({
        accountId: "alice",
        displayName: "Alice",
        issuer: "Cognis",
    });
    assert.equal(sentCodes.length, 1);
    assert.equal(setup.view.fields?.[0]?.maxLength, 6);
    const verified = await adapter.verifySetup({
        accountId: "alice",
        pendingPayload: setup.pendingPayload,
        verification: { code: sentCodes[0].code },
    });
    assert.equal(verified.verified, true);
    assert.equal(verified.state?.email, "alice@example.com");
});

test("smtp adapter login challenge sends a code and verifyLogin consumes it", async () => {
    const sentCodes: string[] = [];
    const adapter = createAdapter({
        getEmailDeliveryPolicy: () => ({
            codeLength: 6,
            minimumIntervalMs: 15000,
        }),
        canSendVerificationEmail: () => true,
        sendVerificationEmail: async (_to, code) => {
            sentCodes.push(code);
        },
    });
    const challenge = await adapter.beginLoginChallenge?.({
        accountId: "alice",
        state: { email: "alice@example.com" },
    });
    assert.equal(challenge?.ready, true);
    assert.equal(typeof challenge?.retryAfterSeconds, "number");
    assert.equal(typeof challenge?.resendAvailableAt, "string");
    const verified = await adapter.verifyLogin({
        accountId: "alice",
        state: { email: "alice@example.com" },
        payload: { code: sentCodes[0] },
    });
    assert.equal(verified.verified, true);
    const secondTry = await adapter.verifyLogin({
        accountId: "alice",
        state: { email: "alice@example.com" },
        payload: { code: sentCodes[0] },
    });
    assert.equal(secondTry.verified, false);
});

test("smtp adapter resend invalidates the previous login code and issues a new one", async () => {
    const sentCodes: string[] = [];
    const adapter = createAdapter({
        getEmailDeliveryPolicy: () => ({
            codeLength: 6,
            minimumIntervalMs: 15000,
        }),
        canSendVerificationEmail: () => true,
        sendVerificationEmail: async (_to, code) => {
            sentCodes.push(code);
        },
    });
    await adapter.beginLoginChallenge?.({
        accountId: "alice",
        state: { email: "alice@example.com" },
    });
    await adapter.beginLoginChallenge?.({
        accountId: "alice",
        state: { email: "alice@example.com" },
    });
    assert.equal(sentCodes.length, 2);
    assert.notEqual(sentCodes[0], sentCodes[1]);
    const firstCodeAttempt = await adapter.verifyLogin({
        accountId: "alice",
        state: { email: "alice@example.com" },
        payload: { code: sentCodes[0] },
    });
    assert.equal(firstCodeAttempt.verified, false);
    const secondCodeAttempt = await adapter.verifyLogin({
        accountId: "alice",
        state: { email: "alice@example.com" },
        payload: { code: sentCodes[1] },
    });
    assert.equal(secondCodeAttempt.verified, true);
});

test("smtp adapter reads code length from the delivery policy", async () => {
    const sentCodes: string[] = [];
    const adapter = createAdapter({
        canSendVerificationEmail: () => true,
        sendVerificationEmail: async (_to, code) => {
            sentCodes.push(code);
        },
        getPrimaryEmail: async () => "alice@example.com",
        getEmailDeliveryPolicy: () => ({
            codeLength: 8,
            minimumIntervalMs: 15000,
        }),
    });
    const setup = await adapter.beginSetup({
        accountId: "alice",
        displayName: "Alice",
        issuer: "Cognis",
    });
    assert.equal(sentCodes[0].length, 8);
    assert.equal(setup.view.fields?.[0]?.maxLength, 8);
});

test("smtp adapter login challenge reports unavailable when SMTP sender is missing", async () => {
    const adapter = createAdapter({
        getEmailDeliveryPolicy: () => ({
            codeLength: 6,
            minimumIntervalMs: 15000,
        }),
        canSendVerificationEmail: () => false,
    });
    const challenge = await adapter.beginLoginChallenge?.({
        accountId: "alice",
        state: { email: "alice@example.com" },
    });
    assert.equal(challenge?.ready, false);
});

test("smtp adapter login challenge surfaces retry countdown when SMTP is rate-limited", async () => {
    const adapter = createAdapter({
        getEmailDeliveryPolicy: () => ({
            codeLength: 6,
            minimumIntervalMs: 15000,
        }),
        canSendVerificationEmail: () => true,
        sendVerificationEmail: async () => {
            throw new Error("email_rate_limited");
        },
    });
    const challenge = await adapter.beginLoginChallenge?.({
        accountId: "alice",
        state: { email: "alice@example.com" },
    });
    assert.equal(challenge?.ready, true);
    assert.equal(challenge?.message, "email_rate_limited");
    assert.equal(typeof challenge?.retryAfterSeconds, "number");
    assert.equal(typeof challenge?.resendAvailableAt, "string");
});

test("smtp adapter login challenge surfaces queued rate limits without replacing a live code", async () => {
    let queueCallCount = 0;
    let firstIssuedCode = "";
    let secondIssuedCode = "";
    const adapter = createAdapter({
        getEmailDeliveryPolicy: () => ({
            codeLength: 6,
            minimumIntervalMs: 15000,
        }),
        canSendVerificationEmail: () => true,
        queueVerificationEmail: async (_to, code) => {
            queueCallCount += 1;
            if (queueCallCount === 1) {
                firstIssuedCode = code;
                return {
                    notificationId: "first-send",
                    status: "queued",
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
            }
            secondIssuedCode = code;
            return {
                notificationId: "rate-limited-send",
                status: "waiting_rate_limit",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                availableAt: new Date(Date.now() + 30_000).toISOString(),
            };
        },
    });
    const firstChallenge = await adapter.beginLoginChallenge?.({
        accountId: "alice",
        state: { email: "alice@example.com" },
    });
    assert.equal(firstChallenge?.ready, true);
    assert.equal(typeof firstChallenge?.retryAfterSeconds, "number");
    assert.equal(typeof firstChallenge?.resendAvailableAt, "string");
    const secondChallenge = await adapter.beginLoginChallenge?.({
        accountId: "alice",
        state: { email: "alice@example.com" },
    });
    assert.equal(secondChallenge?.ready, true);
    assert.equal(secondChallenge?.message, "email_rate_limited");
    assert.equal(typeof secondChallenge?.retryAfterSeconds, "number");
    const verified = await adapter.verifyLogin({
        accountId: "alice",
        state: { email: "alice@example.com" },
        payload: { code: firstIssuedCode },
    });
    assert.equal(verified.verified, true);
    const secondCodeAttempt = await adapter.verifyLogin({
        accountId: "alice",
        state: { email: "alice@example.com" },
        payload: { code: secondIssuedCode },
    });
    assert.equal(secondCodeAttempt.verified, false);
});

test("smtp adapter login challenge rolls back on queued failed status", async () => {
    let queueCallCount = 0;
    let firstIssuedCode = "";
    let failedAttemptCode = "";
    const adapter = createAdapter({
        getEmailDeliveryPolicy: () => ({
            codeLength: 6,
            minimumIntervalMs: 15000,
        }),
        canSendVerificationEmail: () => true,
        queueVerificationEmail: async (_to, code) => {
            queueCallCount += 1;
            if (queueCallCount === 1) {
                firstIssuedCode = code;
                return {
                    notificationId: "first-send",
                    status: "queued",
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
            }
            failedAttemptCode = code;
            return {
                notificationId: "failed-send",
                status: "failed",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                error: "delivery_failed",
            };
        },
    });
    const firstChallenge = await adapter.beginLoginChallenge?.({
        accountId: "alice",
        state: { email: "alice@example.com" },
    });
    assert.equal(firstChallenge?.ready, true);
    const failedChallenge = await adapter.beginLoginChallenge?.({
        accountId: "alice",
        state: { email: "alice@example.com" },
    });
    assert.equal(failedChallenge?.ready, false);
    assert.equal(failedChallenge?.message, "email_delivery_unavailable");
    const originalCodeAttempt = await adapter.verifyLogin({
        accountId: "alice",
        state: { email: "alice@example.com" },
        payload: { code: firstIssuedCode },
    });
    assert.equal(originalCodeAttempt.verified, true);
    const failedCodeAttempt = await adapter.verifyLogin({
        accountId: "alice",
        state: { email: "alice@example.com" },
        payload: { code: failedAttemptCode },
    });
    assert.equal(failedCodeAttempt.verified, false);
});

test("smtp adapter renderMethodDetails returns empty details for configured email state", async () => {
    const adapter = createAdapter();
    const details = await adapter.renderMethodDetails?.({
        accountId: "alice",
        state: { email: "alice@example.com" },
        issuer: "Cognis",
    });
    assert.deepEqual(details, { details: {} });
});

test("smtp adapter renders management details without exposing setup state", async () => {
    const adapter = createAdapter();
    const details = await adapter.renderMethodDetails?.({
        accountId: "alice",
        state: {},
        issuer: "Cognis",
    });
    assert.deepEqual(details, { details: {} });
});

test("setup constraints retain the issued code length when policy changes during delivery", async () => {
    let length = 10;
    let deliveredCode = "";
    const adapter = createAdapter({
        getEmailDeliveryPolicy: () => ({
            codeLength: length,
            minimumIntervalMs: 0,
        }),
        canSendVerificationEmail: () => true,
        getPrimaryEmail: async () => "pending@example.test",
        sendVerificationEmail: async (_recipient, code) => {
            deliveredCode = code;
            length = 4;
        },
    });
    const setup = await adapter.beginSetup({
        accountId: "pending",
        displayName: "Pending",
        issuer: "Cognis",
    });
    assert.equal(deliveredCode.length, 10);
    assert.equal(setup.view.fields?.[0].maxLength, 10);
    assert.equal(
        (
            await adapter.verifySetup({
                accountId: "pending",
                pendingPayload: setup.pendingPayload,
                verification: { code: deliveredCode },
            })
        ).verified,
        true,
    );
    const next = await adapter.beginSetup({
        accountId: "pending",
        displayName: "Pending",
        issuer: "Cognis",
    });
    assert.equal(next.view.fields?.[0].maxLength, 4);
    assert.equal(deliveredCode.length, 4);
});

for (const length of [undefined, 0, 3, 11, 5.5, Number.NaN]) {
    test(`TFA rejects missing or invalid owner policy (${String(length)}) without delivery`, async () => {
        let deliveries = 0;
        const adapter = createAdapter({
            getEmailDeliveryPolicy:
                length === undefined
                    ? undefined
                    : () => ({ codeLength: length, minimumIntervalMs: 0 }),
            canSendVerificationEmail: () => true,
            getPrimaryEmail: async () => "pending@example.test",
            sendVerificationEmail: async () => {
                deliveries++;
            },
        });
        await assert.rejects(
            adapter.beginSetup({
                accountId: "pending",
                displayName: "Pending",
                issuer: "Cognis",
            }),
            /email_delivery_unavailable/,
        );
        assert.equal(
            (
                await adapter.beginLoginChallenge!({
                    accountId: "pending",
                    state: { email: "pending@example.test" },
                })
            ).ready,
            false,
        );
        assert.equal(deliveries, 0);
    });
}

test("rate-limited resend keeps the pending code input length after a policy change", async () => {
    let length = 10;
    let calls = 0;
    let pendingCode = "";
    const adapter = createAdapter({
        getEmailDeliveryPolicy: () => ({
            codeLength: length,
            minimumIntervalMs: 0,
        }),
        canSendVerificationEmail: () => true,
        queueVerificationEmail: async (_recipient, code) => {
            calls++;
            if (calls === 1) pendingCode = code;
            return {
                notificationId: String(calls),
                status: calls === 1 ? "queued" : "waiting_rate_limit",
                createdAt: "",
                updatedAt: "",
            };
        },
    });
    const input = {
        accountId: "pending",
        state: { email: "pending@example.test" },
    };
    assert.equal((await adapter.beginLoginChallenge!(input)).maxLength, 10);
    length = 4;
    assert.equal((await adapter.beginLoginChallenge!(input)).maxLength, 10);
    assert.equal(
        (
            await adapter.verifyLogin({
                ...input,
                payload: { code: pendingCode },
            })
        ).verified,
        true,
    );
});

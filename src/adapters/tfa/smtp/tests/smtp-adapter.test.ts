import test from "node:test";
import assert from "node:assert/strict";
import { createAdapter } from "../index.js";

test("smtp adapter setup sends a code and verifies it", async () => {
    const sentCodes: Array<{ to: string; code: string }> = [];
    const adapter = createAdapter({
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

test("smtp adapter supports configurable code length", async () => {
    const sentCodes: string[] = [];
    const adapter = createAdapter({
        canSendVerificationEmail: () => true,
        sendVerificationEmail: async (_to, code) => {
            sentCodes.push(code);
        },
        getPrimaryEmail: async () => "alice@example.com",
    });
    adapter.configure({ codeLength: 8 });
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
        canSendVerificationEmail: () => true,
        sendVerificationEmail: async () => {
            throw new Error("smtp_rate_limited");
        },
    });
    const challenge = await adapter.beginLoginChallenge?.({
        accountId: "alice",
        state: { email: "alice@example.com" },
    });
    assert.equal(challenge?.ready, true);
    assert.equal(challenge?.message, "smtp_rate_limited");
    assert.equal(typeof challenge?.retryAfterSeconds, "number");
    assert.equal(typeof challenge?.resendAvailableAt, "string");
});

test("smtp adapter login challenge surfaces queued rate limits without replacing a live code", async () => {
    let queueCallCount = 0;
    let firstIssuedCode = "";
    let secondIssuedCode = "";
    const adapter = createAdapter({
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
    const secondChallenge = await adapter.beginLoginChallenge?.({
        accountId: "alice",
        state: { email: "alice@example.com" },
    });
    assert.equal(secondChallenge?.ready, true);
    assert.equal(secondChallenge?.message, "smtp_rate_limited");
    assert.equal(typeof secondChallenge?.retryAfterSeconds, "number");
    assert.equal(secondIssuedCode, firstIssuedCode);
    const verified = await adapter.verifyLogin({
        accountId: "alice",
        state: { email: "alice@example.com" },
        payload: { code: firstIssuedCode },
    });
    assert.equal(verified.verified, true);
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

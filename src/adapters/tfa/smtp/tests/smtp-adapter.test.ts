import test from "node:test";
import assert from "node:assert/strict";
import { createAdapter } from "../index.js";
import { createDeliveryFixture, lifetime } from "./fixtures/delivery.js";

test("SMTP setup admits a code and verifies it once", async () => {
    const host = createDeliveryFixture();
    const setup = await host.setup();
    assert.equal(setup.view.fields?.[0]?.maxLength, 6);
    assert.equal(setup.view.prompt, "adapter.tfa.smtp.setup_prompt_queued");
    const input = {
        accountId: "alice",
        pendingPayload: setup.pendingPayload,
        verification: { code: host.deliveries[0].code },
    };
    const result = await host.adapter.verifySetup(input);
    assert.equal(result.verified, true);
    assert.equal(result.state?.email, "alice@example.test");
    assert.equal((await host.adapter.verifySetup(input)).verified, false);
    assert.equal(host.deliveries[0].signal.aborted, true);
});

test("SMTP login admission supplies retry metadata and single-use verification", async () => {
    const host = createDeliveryFixture();
    const challenge = await host.begin();
    assert.equal(challenge.ready, true);
    assert.equal(challenge.deliveryStatus, "queued");
    assert.equal(typeof challenge.retryAfterSeconds, "number");
    assert.equal(typeof challenge.resendAvailableAt, "string");
    const results = await Promise.all([
        host.verify(host.deliveries[0].code),
        host.verify(host.deliveries[0].code),
    ]);
    assert.deepEqual(
        results.map((result) => result.verified),
        [true, false],
    );
});

test("first deferred admission retains the exact code until delivery", async () => {
    const host = createDeliveryFixture();
    host.state.status = "waiting_rate_limit";
    host.state.availableAt = new Date(Date.now() + 30_000).toISOString();
    const challenge = await host.begin();
    assert.equal(challenge.ready, true);
    assert.equal(challenge.deliveryStatus, "queued");
    assert.equal(challenge.retryAfterSeconds, 30);
    host.deliveries[0].complete("sent");
    await Promise.resolve();
    assert.equal((await host.verify(host.deliveries[0].code)).verified, true);
});

test("deferred resend replaces and cancels the superseded queued message", async () => {
    const host = createDeliveryFixture();
    await host.begin();
    host.state.status = "waiting_rate_limit";
    const resent = await host.begin();
    assert.equal(resent.ready, true);
    assert.equal(resent.deliveryStatus, "queued");
    assert.equal(host.deliveries[0].signal.aborted, true);
    assert.notEqual(host.deliveries[0].code, host.deliveries[1].code);
    assert.equal((await host.verify(host.deliveries[0].code)).verified, false);
    assert.equal((await host.verify(host.deliveries[1].code)).verified, true);
});

for (const failure of ["throw", "receipt"] as const)
    test(`rejected ${failure} admission preserves the previous live code`, async () => {
        const host = createDeliveryFixture();
        await host.begin();
        if (failure === "throw") host.state.failAdmission = true;
        else host.state.status = "failed";
        const rejected = await host.begin();
        assert.equal(rejected.ready, false);
        assert.equal(rejected.deliveryStatus, undefined);
        assert.equal(host.deliveries[0].signal.aborted, false);
        if (failure === "receipt")
            assert.equal(host.deliveries[1].signal.aborted, true);
        assert.equal(
            (await host.verify(host.deliveries[0].code)).verified,
            true,
        );
    });

test("concurrent resends coalesce within one owner operation", async () => {
    const host = createDeliveryFixture();
    const results = await Promise.all([
        host.begin(),
        host.begin(),
        host.begin(),
    ]);
    assert.equal(host.deliveries.length, 1);
    assert.ok(results.every((result) => result.ready));
});

for (const failure of ["receipt", "rejection"] as const)
    test(`asynchronous ${failure} failure invalidates the candidate and explicit resend recovers`, async () => {
        const host = createDeliveryFixture();
        await host.begin();
        const failedCode = host.deliveries[0].code;
        if (failure === "receipt")
            host.deliveries[0].complete("failed", "synthetic_failure");
        else host.deliveries[0].reject();
        await Promise.resolve();
        assert.equal((await host.verify(failedCode)).verified, false);
        await host.begin();
        assert.equal((await host.verify(failedCode)).verified, false);
        assert.equal(
            (await host.verify(host.deliveries[1].code)).verified,
            true,
        );
    });

test("late superseded completion cannot invalidate a replacement", async () => {
    const host = createDeliveryFixture();
    await host.begin();
    await host.begin();
    host.deliveries[0].complete("failed", "late_failure");
    await Promise.resolve();
    assert.equal((await host.verify(host.deliveries[1].code)).verified, true);
});

test("owner cancellation and expiry are exclusive and cannot be resurrected by late completion", async (context) => {
    context.mock.timers.enable({ apis: ["Date"], now: 1000 });
    const host = createDeliveryFixture();
    await host.begin();
    assert.equal(host.deliveries[0].expiresAt, host.owner.expiresAt);
    context.mock.timers.setTime(host.owner.expiresAt);
    assert.equal((await host.verify(host.deliveries[0].code)).verified, false);
    assert.equal(host.deliveries[0].signal.aborted, true);
    host.deliveries[0].complete("sent");
    assert.equal((await host.verify(host.deliveries[0].code)).verified, false);
});

test("concurrent independent setups do not share delivery or cancellation", async () => {
    const host = createDeliveryFixture();
    const [first, second] = await Promise.all([host.setup(), host.setup()]);
    assert.equal(host.deliveries.length, 2);
    assert.notEqual(
        first.pendingPayload.challengeId,
        second.pendingPayload.challengeId,
    );
    await host.adapter.cancelSetup!({
        accountId: "alice",
        pendingPayload: first.pendingPayload,
    });
    assert.equal(host.deliveries[0].signal.aborted, true);
    assert.equal(host.deliveries[1].signal.aborted, false);
    const result = await host.adapter.verifySetup({
        accountId: "alice",
        pendingPayload: second.pendingPayload,
        verification: { code: host.deliveries[1].code },
    });
    assert.equal(result.verified, true);
});

test("independent login owners isolate cancellation on the same account", async () => {
    const host = createDeliveryFixture();
    await host.begin();
    const second = {
        accountId: "alice",
        state: { email: "alice@example.test" },
        lifetime: lifetime("second"),
    };
    await host.adapter.beginLoginChallenge!(second);
    host.owner.controller.abort();
    assert.equal(host.deliveries[0].signal.aborted, true);
    assert.equal(host.deliveries[1].signal.aborted, false);
    assert.equal(
        (
            await host.adapter.verifyLogin({
                ...second,
                payload: { code: host.deliveries[1].code },
            })
        ).verified,
        true,
    );
});

for (const length of [4, 6, 8, 10])
    test(`SMTP owner policy issues ${length} digits with matching input constraints`, async () => {
        const host = createDeliveryFixture();
        host.state.length = length;
        const setup = await host.setup();
        assert.match(host.deliveries[0].code, new RegExp(`^\\d{${length}}$`));
        assert.equal(setup.view.fields?.[0].maxLength, length);
        host.state.length = length === 4 ? 10 : 4;
        assert.equal(
            (
                await host.adapter.verifySetup({
                    accountId: "alice",
                    pendingPayload: setup.pendingPayload,
                    verification: { code: host.deliveries[0].code },
                })
            ).verified,
            true,
        );
    });

test("accepted deferred resend uses the new policy length without retaining a stale code", async () => {
    const host = createDeliveryFixture();
    host.state.length = 10;
    assert.equal((await host.begin()).maxLength, 10);
    host.state.length = 4;
    host.state.status = "waiting_rate_limit";
    assert.equal((await host.begin()).maxLength, 4);
    assert.equal((await host.verify(host.deliveries[0].code)).verified, false);
    assert.equal((await host.verify(host.deliveries[1].code)).verified, true);
});

for (const length of [undefined, 0, 3, 11, 5.5, Number.NaN])
    test(`invalid owner policy ${String(length)} fails without delivery`, async () => {
        const host = createDeliveryFixture({
            getEmailDeliveryPolicy:
                length === undefined
                    ? undefined
                    : () => ({ codeLength: length, minimumIntervalMs: 0 }),
        });
        await assert.rejects(host.setup(), /email_delivery_unavailable/);
        assert.equal((await host.begin()).ready, false);
        assert.equal(host.deliveries.length, 0);
    });

test("unavailable provider and missing primary email fail closed", async () => {
    const unavailable = createDeliveryFixture({
        deliverVerificationEmail: undefined,
    });
    assert.equal((await unavailable.begin()).ready, false);
    await assert.rejects(unavailable.setup(), /email_delivery_unavailable/);
    const missing = createDeliveryFixture({
        getPrimaryEmail: async () => null,
    });
    await assert.rejects(missing.setup(), /primary_email_required/);
});

test("management details never expose setup state", async () => {
    const adapter = createAdapter();
    for (const state of [{}, { email: "alice@example.test" }])
        assert.deepEqual(
            await adapter.renderMethodDetails!({
                accountId: "alice",
                state,
                issuer: "Cognis",
            }),
            { details: {} },
        );
});

test("verification consumes the old code and cancels a replacement still awaiting admission", async () => {
    const host = createDeliveryFixture();
    await host.begin();
    let release!: () => void;
    host.state.admissionGate = new Promise<void>((resolve) => {
        release = resolve;
    });
    const pending = host.begin();
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(host.deliveries.length, 2);
    assert.equal((await host.verify(host.deliveries[0].code)).verified, true);
    assert.equal(host.deliveries[1].signal.aborted, true);
    release();
    assert.equal((await pending).ready, false);
    assert.equal((await host.verify(host.deliveries[1].code)).verified, false);
});

for (const ending of ["cancel", "expiry"])
    test(`${ending} during admission cannot install a late SMTP code`, async (context) => {
        context.mock.timers.enable({ apis: ["Date"], now: 1000 });
        const host = createDeliveryFixture();
        let release!: () => void;
        host.state.admissionGate = new Promise<void>((resolve) => {
            release = resolve;
        });
        const pending = host.begin();
        await Promise.resolve();
        await Promise.resolve();
        if (ending === "cancel") host.owner.controller.abort();
        else context.mock.timers.setTime(host.owner.expiresAt);
        release();
        assert.equal((await pending).ready, false);
        assert.equal(host.deliveries[0].signal.aborted, true);
        assert.equal(
            (await host.verify(host.deliveries[0].code)).verified,
            false,
        );
    });

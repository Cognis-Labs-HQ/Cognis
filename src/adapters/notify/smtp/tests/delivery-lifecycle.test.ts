import test from "node:test";
import assert from "node:assert/strict";
import {
    SmtpNotificationQueue,
    SmtpRateLimiter,
} from "../notification-queue.js";

const payload = {
    purpose: "synthetic",
    recipientEmail: "synthetic@example.test",
    subject: "Synthetic",
    body: "synthetic-code",
};
for (const ownerMinutes of [5, 10])
    test(`queue never sends after its ${ownerMinutes}-minute owner deadline`, async (context) => {
        context.mock.timers.enable({ apis: ["Date", "setTimeout"], now: 1000 });
        const sent: unknown[] = [];
        const limiter = new SmtpRateLimiter((ownerMinutes + 1) * 60000);
        limiter.record(payload.recipientEmail);
        const queue = new SmtpNotificationQueue(
            limiter,
            (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
            async (message) => {
                sent.push(message);
            },
            payload.purpose,
        );
        context.after(() => queue.close());
        const id = queue.enqueue({
            ...payload,
            signal: new AbortController().signal,
            expiresAt: Date.now() + ownerMinutes * 60000,
        }).notificationId;
        assert.equal(queue.getQueueItem(id)?.status, "waiting_rate_limit");
        const completion = queue.completion(id);
        context.mock.timers.tick(ownerMinutes * 60000);
        assert.equal((await completion).error, "smtp_delivery_expired");
        context.mock.timers.tick(60001);
        await Promise.resolve();
        assert.equal(sent.length, 0);
    });

for (const reason of ["superseded", "consumed", "owner-disposed"] as const)
    test(`${reason} cancels matching queued mail but ordinary deferred mail still sends`, async (context) => {
        context.mock.timers.enable({ apis: ["Date", "setTimeout"], now: 1000 });
        const sent: string[] = [];
        const limiter = new SmtpRateLimiter(15000);
        limiter.record(payload.recipientEmail);
        const queue = new SmtpNotificationQueue(
            limiter,
            (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
            async (message) => {
                sent.push(message.body);
            },
            payload.purpose,
        );
        context.after(() => queue.close());
        const controller = new AbortController();
        const id = queue.enqueue({
            ...payload,
            signal: controller.signal,
            expiresAt: Date.now() + 300000,
        }).notificationId;
        const completion = queue.completion(id);
        if (reason === "owner-disposed") queue.close();
        else controller.abort();
        assert.equal((await completion).status, "failed");
        assert.equal(
            (await completion).error,
            reason === "owner-disposed"
                ? "smtp_purpose_disposed"
                : "smtp_delivery_cancelled",
        );
        if (reason !== "owner-disposed") {
            const ordinary = queue.enqueue({
                ...payload,
                body: "ordinary-notification",
            }).notificationId;
            const done = queue.completion(ordinary);
            context.mock.timers.tick(15000);
            assert.equal((await done).status, "sent");
            assert.deepEqual(sent, ["ordinary-notification"]);
        } else {
            context.mock.timers.tick(15000);
            assert.deepEqual(sent, []);
        }
    });

test("in-progress expiry aborts transport and late completion cannot turn failure into sent", async (context) => {
    context.mock.timers.enable({ apis: ["Date", "setTimeout"], now: 1000 });
    let release!: () => void;
    let signal: AbortSignal | undefined;
    const queue = new SmtpNotificationQueue(
        new SmtpRateLimiter(0),
        async () => {},
        async (message) => {
            signal = message.signal;
            await new Promise<void>((resolve) => {
                release = resolve;
            });
        },
        payload.purpose,
    );
    context.after(() => queue.close());
    const id = queue.enqueue({
        ...payload,
        signal: new AbortController().signal,
        expiresAt: 2000,
    }).notificationId;
    const done = queue.completion(id);
    context.mock.timers.tick(1000);
    assert.equal(signal?.aborted, true);
    assert.equal((await done).status, "failed");
    release();
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(queue.getQueueItem(id)?.error, "smtp_delivery_expired");
});

test("transport failure has a final receipt and later queue work can recover", async (context) => {
    let fail = true;
    const queue = new SmtpNotificationQueue(
        new SmtpRateLimiter(0),
        async () => {},
        async () => {
            if (fail) throw new Error("synthetic_transport_failure");
        },
        payload.purpose,
    );
    context.after(() => queue.close());
    const input = {
        ...payload,
        signal: new AbortController().signal,
        expiresAt: Date.now() + 300000,
    };
    const first = queue.enqueue(input).notificationId;
    assert.equal((await queue.completion(first)).status, "failed");
    fail = false;
    const second = queue.enqueue(input).notificationId;
    assert.equal((await queue.completion(second)).status, "sent");
});

test("invalid, expired, or cancelled lifetimes are rejected before admission", () => {
    const queue = new SmtpNotificationQueue(
        new SmtpRateLimiter(0),
        async () => {},
        async () => {},
        payload.purpose,
    );
    const controller = new AbortController();
    controller.abort();
    assert.throws(
        () =>
            queue.enqueue({
                ...payload,
                signal: controller.signal,
                expiresAt: Date.now() + 1000,
            }),
        /smtp_delivery_cancelled/,
    );
    assert.throws(
        () =>
            queue.enqueue({
                ...payload,
                signal: new AbortController().signal,
                expiresAt: Date.now(),
            }),
        /smtp_delivery_expired/,
    );
    assert.throws(
        () => queue.enqueue({ ...payload, expiresAt: Date.now() + 1000 }),
        /smtp_delivery_lifetime_invalid/,
    );
    assert.deepEqual(queue.listQueue(), []);
    queue.close();
});

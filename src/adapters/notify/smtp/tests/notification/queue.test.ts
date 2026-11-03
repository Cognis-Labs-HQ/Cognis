import {
    createMockSmtpServer,
    smtpSuccessHandler,
} from "../fixtures/server.js";
import { createTestSender } from "../fixtures/sender.js";
import test from "node:test";
import assert from "node:assert/strict";
import {
    SmtpRateLimiter,
    SmtpNotificationQueue,
} from "../../notification-queue.js";

const RATE_LIMIT_DELAY_MS = 250;

function sleepWithoutKeepingProcessAlive(ms: number): Promise<void> {
    return new Promise((resolve) => {
        const timer = setTimeout(resolve, ms);
        timer.unref();
    });
}

test("SMTP queue carries test configuration through rate-limited delivery", async () => {
    const delivered: Array<Record<string, unknown> | undefined> = [];
    const queue = new SmtpNotificationQueue(
        new SmtpRateLimiter(0),
        async () => undefined,
        async (payload) => {
            delivered.push(payload.config);
        },
        "test",
    );
    const config = { host: "smtp.example.org", port: 2525 };
    const queued = queue.enqueue({
        purpose: "test",
        recipientEmail: "admin@example.org",
        subject: "SMTP test",
        body: "Test",
        config,
    });
    await queue.waitForResult(queued.notificationId);
    assert.deepEqual(delivered, [config]);
});

async function waitFor(
    predicate: () => boolean,
    timeoutMs = 2_000,
): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (predicate()) return;
        await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error("timed_out_waiting_for_condition");
}

test("SmtpNotificationSender.sendTracked returns IDs and exposes queue status", async () => {
    const server = await createMockSmtpServer((conn) =>
        smtpSuccessHandler(conn),
    );
    try {
        const sender = await createTestSender({
            host: server.host,
            port: server.port,
            from: "test@example.com",
            secure: "none",
            greylistRetries: 0,
        });
        const receipt = await sender.sendTracked({
            purpose: "test",
            category: "test",
            recipientUsername: "alice",
            recipientEmail: "alice@example.com",
            subject: "Tracked notification",
            body: "Tracked body",
        });
        const queuedItem = sender.getQueueItem(receipt.notificationId);
        assert.ok(queuedItem);
        assert.equal(queuedItem?.notificationId, receipt.notificationId);
        await waitFor(() => {
            const updated = sender.getQueueItem(receipt.notificationId);
            return updated?.status === "sent" || updated?.status === "failed";
        });
        const completed = sender.getQueueItem(receipt.notificationId);
        assert.equal(completed?.status, "sent", completed?.error);
    } finally {
        await server.close();
    }
});

test("SmtpNotificationSender queue applies recipient rate-limit spacing", async () => {
    const server = await createMockSmtpServer((conn) =>
        smtpSuccessHandler(conn),
    );
    const limiter = new SmtpRateLimiter(250);
    try {
        const sender = await createTestSender(
            {
                host: server.host,
                port: server.port,
                from: "test@example.com",
                secure: "none",
                greylistRetries: 0,
            },
            undefined,
            sleepWithoutKeepingProcessAlive,
            () => limiter,
        );
        const first = await sender.sendTracked({
            purpose: "test",
            category: "test",
            recipientUsername: "alice",
            recipientEmail: "alice@example.com",
            subject: "First",
            body: "First body",
        });
        const second = await sender.sendTracked({
            purpose: "test",
            category: "test",
            recipientUsername: "alice",
            recipientEmail: "alice@example.com",
            subject: "Second",
            body: "Second body",
        });
        const secondQueued = sender.getQueueItem(second.notificationId);
        assert.equal(secondQueued?.status, "waiting_rate_limit");
        assert.equal(typeof secondQueued?.availableAt, "string");
        assert.notEqual(first.notificationId, second.notificationId);
    } finally {
        await server.close();
    }
});

test("SmtpNotificationQueue wakes during rate-limit sleep when a different recipient is ready", async () => {
    const limiter = new SmtpRateLimiter(RATE_LIMIT_DELAY_MS);
    limiter.record("delayed@example.com", Date.now());
    const sentRecipients: string[] = [];
    const queue = new SmtpNotificationQueue(
        limiter,
        (ms) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
        async (payload) => {
            sentRecipients.push(payload.recipientEmail);
        },
        "test",
    );

    queue.enqueue({
        purpose: "test",
        category: "test",
        recipientUsername: "delayed",
        recipientEmail: "delayed@example.com",
        subject: "Delayed",
        body: "Delayed body",
    });

    queue.enqueue({
        purpose: "test",
        category: "test",
        recipientUsername: "ready",
        recipientEmail: "ready@example.com",
        subject: "Ready",
        body: "Ready body",
    });

    await waitFor(() => sentRecipients.length > 0);
    assert.deepEqual(sentRecipients, ["ready@example.com"]);

    await waitFor(() => sentRecipients.length === 2);
    assert.deepEqual(sentRecipients, [
        "ready@example.com",
        "delayed@example.com",
    ]);
});

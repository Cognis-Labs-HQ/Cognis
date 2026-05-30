import test from "node:test";
import assert from "node:assert/strict";
import net from "node:net";
import {
    SmtpNotificationSender,
    SmtpRateLimiter,
} from "../smtp-notification-sender.js";
import { SmtpNotificationQueue } from "../smtp-notification-queue.js";

type MockSmtpServer = {
    host: string;
    port: number;
    close: () => Promise<void>;
};

function createMockSmtpServer(
    handleConnection: (conn: net.Socket) => void,
): Promise<MockSmtpServer> {
    return new Promise((resolve) => {
        const server = net.createServer((conn) => {
            handleConnection(conn);
        });
        server.listen(0, "127.0.0.1", () => {
            const addr = server.address() as net.AddressInfo;
            resolve({
                host: "127.0.0.1",
                port: addr.port,
                close: () =>
                    new Promise<void>((res, rej) =>
                        server.close((err) => (err ? rej(err) : res())),
                    ),
            });
        });
    });
}

function smtpSuccessHandler(conn: net.Socket): void {
    let buf = "";
    let dataMode = false;
    conn.setEncoding("utf8");
    conn.write("220 mock.example.com SMTP\r\n");

    conn.on("data", (chunk: string) => {
        buf += chunk;
        const lines = buf.split("\r\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
            if (dataMode) {
                if (line === ".") {
                    dataMode = false;
                    conn.write("250 OK\r\n");
                }
                continue;
            }
            if (!line) continue;
            const upper = line.toUpperCase();
            if (upper.startsWith("EHLO") || upper.startsWith("HELO")) {
                conn.write("250 OK\r\n");
            } else if (upper.startsWith("MAIL FROM")) {
                conn.write("250 OK\r\n");
            } else if (upper.startsWith("RCPT TO")) {
                conn.write("250 OK\r\n");
            } else if (upper === "DATA") {
                dataMode = true;
                conn.write("354 Start mail input\r\n");
            } else if (upper.startsWith("QUIT")) {
                conn.write("221 Bye\r\n");
                conn.end();
            }
        }
    });
}

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
        const sender = new SmtpNotificationSender({
            host: server.host,
            port: server.port,
            from: "test@example.com",
            secure: "none",
            greylistRetries: 0,
        });
        const receipt = await sender.sendTracked({
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
            return updated?.status === "sent";
        });
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
        const sender = new SmtpNotificationSender(
            {
                host: server.host,
                port: server.port,
                from: "test@example.com",
                secure: "none",
                greylistRetries: 0,
            },
            undefined,
            undefined,
            limiter,
        );
        const first = await sender.sendTracked({
            category: "test",
            recipientUsername: "alice",
            recipientEmail: "alice@example.com",
            subject: "First",
            body: "First body",
        });
        const second = await sender.sendTracked({
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

test("SmtpNotificationQueue wakes while sleeping when a different recipient is ready", async () => {
    let now = 0;
    const limiter = new SmtpRateLimiter(250, () => now);
    limiter.record("delayed@example.com", now);
    let resolveSleep: (() => void) | null = null;
    const sleepCalls: number[] = [];
    const sentRecipients: string[] = [];
    const queue = new SmtpNotificationQueue(
        limiter,
        (ms) =>
            new Promise<void>((resolve) => {
                sleepCalls.push(ms);
                resolveSleep = () => {
                    now += ms;
                    resolve();
                };
            }),
        async (payload) => {
            sentRecipients.push(payload.recipientEmail);
        },
    );

    queue.enqueue({
        category: "test",
        recipientUsername: "delayed",
        recipientEmail: "delayed@example.com",
        subject: "Delayed",
        body: "Delayed body",
    });
    await waitFor(() => sleepCalls.length > 0);

    queue.enqueue({
        category: "test",
        recipientUsername: "ready",
        recipientEmail: "ready@example.com",
        subject: "Ready",
        body: "Ready body",
    });

    await waitFor(() => sentRecipients.length > 0);
    assert.deepEqual(sentRecipients, ["ready@example.com"]);

    assert.ok(resolveSleep);
    resolveSleep();
    await waitFor(() => sentRecipients.length === 2);
    assert.deepEqual(sentRecipients, [
        "ready@example.com",
        "delayed@example.com",
    ]);
});

import test from "node:test";
import assert from "node:assert/strict";
import {
    SmtpNotificationQueue,
    SmtpRateLimiter,
} from "../../notification-queue.js";

for (const deliveryDelay of [0, 500]) {
    test(`a blocked purpose queue cannot stall an independently registered purpose (${deliveryDelay}ms)`, async (context) => {
        context.mock.timers.enable({ apis: ["Date"], now: 1000 });
        const sent: Array<{ purpose: string; at: number }> = [];
        let release!: () => void;
        const gate = new Promise<void>((resolve) => {
            release = resolve;
        });
        let first = true;
        const primary = new SmtpNotificationQueue(
            new SmtpRateLimiter(250),
            async (ms) => {
                context.mock.timers.tick(ms);
            },
            async (payload) => {
                if (first) {
                    first = false;
                    await gate;
                }
                sent.push({ purpose: payload.purpose, at: Date.now() });
            },
            "customDigest",
        );
        const independent = new SmtpNotificationQueue(
            new SmtpRateLimiter(250),
            async (ms) => {
                context.mock.timers.tick(ms);
            },
            async (payload) => {
                sent.push({ purpose: payload.purpose, at: Date.now() });
            },
            "customReminder",
        );
        const one = primary.enqueue({
            purpose: "customDigest",
            recipientEmail: "USER@example.test",
            subject: "One",
            body: "one",
        });
        const two = primary.enqueue({
            purpose: "customDigest",
            recipientEmail: "user@example.test",
            subject: "Two",
            body: "two",
        });
        context.mock.timers.tick(deliveryDelay);
        const three = independent.enqueue({
            purpose: "customReminder",
            recipientEmail: "user@example.test",
            subject: "Three",
            body: "three",
        });
        await independent.waitForResult(three.notificationId);
        assert.deepEqual(sent, [
            { purpose: "customReminder", at: 1000 + deliveryDelay },
        ]);
        release();
        await Promise.all(
            [one, two].map((item) =>
                primary.waitForResult(item.notificationId),
            ),
        );
        assert.deepEqual(sent.slice(1), [
            { purpose: "customDigest", at: 1000 + deliveryDelay },
            { purpose: "customDigest", at: 1250 + deliveryDelay },
        ]);
    });
}

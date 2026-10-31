import test from "node:test";
import assert from "node:assert/strict";
import {
    SmtpNotificationQueue,
    SmtpRateLimiter,
} from "../../notification-queue.js";

for (const deliveryDelay of [0, 500]) {
    test(`verification and login messages remain independent with ${deliveryDelay}ms delivery delay`, async (context) => {
        context.mock.timers.enable({ apis: ["Date"], now: 1000 });
        const sent: Array<{ purpose: string | undefined; at: number }> = [];
        let release: () => void = () => {};
        const gate = new Promise<void>((resolve) => {
            release = resolve;
        });
        let first = true;
        const queue = new SmtpNotificationQueue(
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
        );
        const verification = queue.enqueue({
            recipientEmail: "User@example.com",
            subject: "Verification",
            body: "one",
            purpose: "emailVerification",
        });
        const again = queue.enqueue({
            recipientEmail: "USER@example.com",
            subject: "Verification",
            body: "three",
            purpose: "emailVerification",
        });
        context.mock.timers.tick(deliveryDelay);
        const code = queue.enqueue({
            recipientEmail: "user@example.com",
            subject: "Login",
            body: "two",
            purpose: "loginCode",
        });
        assert.equal(
            queue.getQueueItem(code.notificationId)?.availableAt,
            undefined,
        );
        assert.equal(
            Date.parse(
                queue.getQueueItem(again.notificationId)?.availableAt ?? "",
            ),
            1250,
        );
        release();
        await Promise.all(
            [verification, code, again].map(({ notificationId }) =>
                queue.waitForResult(notificationId),
            ),
        );
        assert.deepEqual(sent, [
            { purpose: "emailVerification", at: 1000 + deliveryDelay },
            { purpose: "loginCode", at: 1000 + deliveryDelay },
            { purpose: "emailVerification", at: 1250 + deliveryDelay },
        ]);
    });
}

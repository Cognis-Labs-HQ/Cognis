import test from "node:test";
import assert from "node:assert/strict";
import { createNotificationRoutes } from "../notifications.js";
import {
    CoreNotificationGateway,
    VolatileNotificationPreferenceStore,
} from "../../gateway.js";
import { issueAccessToken } from "../../../auth/access-tokens.js";
import type { NotificationSender } from "@cognis/core";

function requestWithBody(
    method: string,
    body: Record<string, unknown>,
    token: string,
) {
    const chunks = [Buffer.from(JSON.stringify(body))];
    return {
        method,
        headers: { authorization: `Bearer ${token}` },
        [Symbol.asyncIterator]: async function* () {
            for (const chunk of chunks) yield chunk;
        },
    } as any;
}

function makeResponse() {
    let status = 0;
    let payload = "";
    return {
        writeHead(code: number) {
            status = code;
        },
        end(responseBody: string) {
            payload = responseBody;
        },
        get status() {
            return status;
        },
        get payload() {
            return payload;
        },
    } as any;
}

test("POST /api/v1/notifications/providers/:id/test returns SMTP failure details", async () => {
    class FailingTestSender implements NotificationSender {
        readonly senderId = "smtp";
        async send(): Promise<void> {}
        async sendTestEmail(): Promise<void> {
            throw new Error("smtp_rcpt_to_failed:550");
        }
    }

    const prefStore = new VolatileNotificationPreferenceStore();
    const gateway = new CoreNotificationGateway(prefStore);
    gateway.registerSender(new FailingTestSender());
    const route = createNotificationRoutes(gateway);
    const adminToken = issueAccessToken("admin", "admin", 60);
    const res = makeResponse();

    await route(
        requestWithBody("POST", { to: "admin@example.com" }, adminToken),
        res,
        new URL("http://localhost/api/v1/notifications/providers/smtp/test"),
    );

    assert.equal(res.status, 400);
    const payload = JSON.parse(res.payload);
    assert.equal(payload.error.code, "smtp_test_failed");
    assert.equal(payload.error.details.smtpCode, 550);
    assert.equal(payload.error.details.smtpCommand, "RCPT TO");
    assert.match(payload.error.message, /RCPT TO/);
});

import test from "node:test";
import assert from "node:assert/strict";
import { createNotificationRoutes } from "../index.js";
import {
    CoreNotificationGateway,
    VolatileNotificationPreferenceStore,
} from "../../gateway.js";
import { issueAccessToken } from "../../../auth/access-tokens.js";
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
        end(value: string) {
            payload = value;
        },
        get status() {
            return status;
        },
        get payload() {
            return payload;
        },
    } as any;
}

test("POST /api/v1/notify/broadcasts/:id/acknowledge marks broadcast state", async () => {
    const prefStore = new VolatileNotificationPreferenceStore();
    const gateway = new CoreNotificationGateway(prefStore);
    let acknowledgedBy = "";
    let acknowledgedId = "";
    const route = createNotificationRoutes(gateway, {
        async getUserNotifPrefs() {
            return [];
        },
        async saveUserNotifPrefs() {},
        async markBroadcastAcknowledged(accountId, broadcastId) {
            acknowledgedBy = accountId;
            acknowledgedId = broadcastId;
        },
    });
    const userToken = issueAccessToken("alice", "user", 60);
    const response = makeResponse();

    await route(
        requestWithBody("POST", {}, userToken),
        response,
        new URL(
            "http://localhost/api/v1/notify/broadcasts/broadcast-9/acknowledge",
        ),
    );

    assert.equal(response.status, 200);
    assert.equal(acknowledgedBy, "alice");
    assert.equal(acknowledgedId, "broadcast-9");
});

test("POST /api/v1/notify/broadcasts/:id/dismiss marks broadcast state", async () => {
    const prefStore = new VolatileNotificationPreferenceStore();
    const gateway = new CoreNotificationGateway(prefStore);
    let dismissedBy = "";
    let dismissedId = "";
    const route = createNotificationRoutes(gateway, {
        async getUserNotifPrefs() {
            return [];
        },
        async saveUserNotifPrefs() {},
        async markBroadcastDismissed(accountId, broadcastId) {
            dismissedBy = accountId;
            dismissedId = broadcastId;
        },
    });
    const userToken = issueAccessToken("alice", "user", 60);
    const response = makeResponse();

    await route(
        requestWithBody("POST", {}, userToken),
        response,
        new URL(
            "http://localhost/api/v1/notify/broadcasts/broadcast-9/dismiss",
        ),
    );

    assert.equal(response.status, 200);
    assert.equal(dismissedBy, "alice");
    assert.equal(dismissedId, "broadcast-9");
});

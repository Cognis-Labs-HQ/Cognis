import test from "node:test";
import assert from "node:assert/strict";

import type {
    NotificationEnvelope,
    NotificationSender,
} from "../../contracts/sender.js";
import { issueAccessToken } from "../../../auth/access-tokens.js";
import {
    CoreNotificationGateway,
    VolatileNotificationPreferenceStore,
} from "../../gateway.js";
import { createNotificationRoutes } from "../index.js";

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

class QueueAwareSender implements NotificationSender {
    readonly senderId: string;

    constructor(id: string) {
        this.senderId = id;
    }

    async send(_envelope: NotificationEnvelope): Promise<void> {}

    listQueue() {
        return [
            {
                notificationId: "smtp-1",
                status: "queued" as const,
                createdAt: "2026-01-01T00:00:00.000Z",
                updatedAt: "2026-01-01T00:00:00.000Z",
                subject: "Queued test message",
                recipientEmail: "alice@example.com",
            },
        ];
    }

    getQueueItem(notificationId: string) {
        if (notificationId !== "smtp-1") return null;
        return this.listQueue()[0];
    }
}

test("GET /api/v1/notify/queue returns queue entries to admin", async () => {
    const preferenceStore = new VolatileNotificationPreferenceStore();
    const gateway = new CoreNotificationGateway(preferenceStore);
    gateway.registerSender(new QueueAwareSender("smtp"));
    const route = createNotificationRoutes(gateway);
    const adminToken = issueAccessToken("admin", "admin", 60);
    const response = makeResponse();

    await route(
        {
            method: "GET",
            headers: { authorization: "Bearer " + adminToken },
            [Symbol.asyncIterator]: async function* () {},
        } as any,
        response,
        new URL("http://localhost/api/v1/notify/queue"),
    );

    assert.equal(response.status, 200);
    const data = JSON.parse(response.payload);
    assert.equal(Array.isArray(data.data), true);
    assert.equal(data.data[0]?.notificationId, "smtp-1");
});

test("GET /api/v1/notify/queue returns 403 for non-admin users", async () => {
    const preferenceStore = new VolatileNotificationPreferenceStore();
    const gateway = new CoreNotificationGateway(preferenceStore);
    gateway.registerSender(new QueueAwareSender("smtp"));
    const route = createNotificationRoutes(gateway);
    const userToken = issueAccessToken("alice", "user", 60);
    const response = makeResponse();

    await route(
        {
            method: "GET",
            headers: { authorization: "Bearer " + userToken },
            [Symbol.asyncIterator]: async function* () {},
        } as any,
        response,
        new URL("http://localhost/api/v1/notify/queue"),
    );

    assert.equal(response.status, 403);
});

test("GET /api/v1/notify/queue/:id returns queue item details", async () => {
    const preferenceStore = new VolatileNotificationPreferenceStore();
    const gateway = new CoreNotificationGateway(preferenceStore);
    gateway.registerSender(new QueueAwareSender("smtp"));
    const route = createNotificationRoutes(gateway);
    const adminToken = issueAccessToken("admin", "admin", 60);
    const response = makeResponse();

    await route(
        {
            method: "GET",
            headers: { authorization: "Bearer " + adminToken },
            [Symbol.asyncIterator]: async function* () {},
        } as any,
        response,
        new URL("http://localhost/api/v1/notify/queue/smtp-1"),
    );

    assert.equal(response.status, 200);
    const data = JSON.parse(response.payload);
    assert.equal(data.data.notificationId, "smtp-1");
});

test("GET /api/v1/notify/queue/:id returns 404 for unknown item", async () => {
    const preferenceStore = new VolatileNotificationPreferenceStore();
    const gateway = new CoreNotificationGateway(preferenceStore);
    gateway.registerSender(new QueueAwareSender("smtp"));
    const route = createNotificationRoutes(gateway);
    const adminToken = issueAccessToken("admin", "admin", 60);
    const response = makeResponse();

    await route(
        {
            method: "GET",
            headers: { authorization: "Bearer " + adminToken },
            [Symbol.asyncIterator]: async function* () {},
        } as any,
        response,
        new URL("http://localhost/api/v1/notify/queue/unknown"),
    );

    assert.equal(response.status, 404);
    assert.match(response.payload, /not_found/);
});

test("GET /api/v1/notify/queue/:id returns 400 for invalid ID", async () => {
    const preferenceStore = new VolatileNotificationPreferenceStore();
    const gateway = new CoreNotificationGateway(preferenceStore);
    gateway.registerSender(new QueueAwareSender("smtp"));
    const route = createNotificationRoutes(gateway);
    const adminToken = issueAccessToken("admin", "admin", 60);
    const response = makeResponse();

    await route(
        {
            method: "GET",
            headers: { authorization: "Bearer " + adminToken },
            [Symbol.asyncIterator]: async function* () {},
        } as any,
        response,
        new URL("http://localhost/api/v1/notify/queue/%20"),
    );

    assert.equal(response.status, 400);
    assert.match(response.payload, /invalid_notification_id/);
});

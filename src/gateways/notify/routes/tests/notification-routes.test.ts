import test from "node:test";
import assert from "node:assert/strict";
import { createNotificationRoutes } from "../index.js";
import {
    CoreNotificationGateway,
    VolatileNotificationPreferenceStore,
} from "../../gateway.js";
import { issueAccessToken } from "../../../auth/access-tokens.js";
import type { NotificationEnvelope, NotificationSender } from "@cognis/core";

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
            for (const c of chunks) yield c;
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
        end(p: string) {
            payload = p;
        },
        get status() {
            return status;
        },
        get payload() {
            return payload;
        },
    } as any;
}

class CapturingSender implements NotificationSender {
    readonly senderId: string;
    readonly received: NotificationEnvelope[] = [];

    constructor(id: string) {
        this.senderId = id;
    }

    async send(envelope: NotificationEnvelope): Promise<void> {
        this.received.push(envelope);
    }
}

test("notification route dispatches to registered sender when prefs match", async () => {
    const prefStore = new VolatileNotificationPreferenceStore();
    prefStore.set("alice", "account_alert", ["test-sender"]);

    const sender = new CapturingSender("test-sender");
    const gateway = new CoreNotificationGateway(prefStore);
    gateway.registerSender(sender);

    const route = createNotificationRoutes(gateway);
    const adminToken = issueAccessToken("admin", "admin", 60);
    const res = makeResponse();

    await route(
        requestWithBody(
            "POST",
            {
                category: "account_alert",
                recipientUsername: "alice",
                recipientEmail: "alice@example.com",
                subject: "Hello",
                body: "Test message",
            },
            adminToken,
        ),
        res,
        new URL("http://localhost/api/v1/notify/send"),
    );

    assert.equal(res.status, 200);
    const data = JSON.parse(res.payload);
    assert.deepEqual(data.data.dispatched, ["test-sender"]);
    assert.equal(sender.received.length, 1);
    assert.equal(sender.received[0].recipientUsername, "alice");
    assert.equal(sender.received[0].category, "account_alert");
    assert.equal(sender.received[0].subject, "Hello");
});

test("notification route returns empty dispatched array when no prefs configured", async () => {
    const prefStore = new VolatileNotificationPreferenceStore();
    const gateway = new CoreNotificationGateway(prefStore);

    const route = createNotificationRoutes(gateway);
    const adminToken = issueAccessToken("admin", "admin", 60);
    const res = makeResponse();

    await route(
        requestWithBody(
            "POST",
            {
                category: "system_alert",
                recipientUsername: "bob",
                subject: "Alert",
                body: "Something happened",
            },
            adminToken,
        ),
        res,
        new URL("http://localhost/api/v1/notify/send"),
    );

    assert.equal(res.status, 200);
    const data = JSON.parse(res.payload);
    assert.deepEqual(data.data.dispatched, []);
});

test("notification route returns 400 when required fields are missing", async () => {
    const prefStore = new VolatileNotificationPreferenceStore();
    const gateway = new CoreNotificationGateway(prefStore);
    const route = createNotificationRoutes(gateway);
    const adminToken = issueAccessToken("admin", "admin", 60);
    const res = makeResponse();

    await route(
        requestWithBody("POST", { category: "account_alert" }, adminToken),
        res,
        new URL("http://localhost/api/v1/notify/send"),
    );

    assert.equal(res.status, 400);
    assert.match(res.payload, /missing_fields/);
});

test("notification route returns 401 without authentication", async () => {
    const prefStore = new VolatileNotificationPreferenceStore();
    const gateway = new CoreNotificationGateway(prefStore);
    const route = createNotificationRoutes(gateway);
    let status = 0;

    await route(
        {
            method: "POST",
            headers: {},
            [Symbol.asyncIterator]: async function* () {},
        } as any,
        {
            writeHead(c: number) {
                status = c;
            },
            end() {},
        } as any,
        new URL("http://localhost/api/v1/notify/send"),
    );

    assert.equal(status, 401);
});

test("notification route returns 403 for non-admin users", async () => {
    const prefStore = new VolatileNotificationPreferenceStore();
    const gateway = new CoreNotificationGateway(prefStore);
    const route = createNotificationRoutes(gateway);
    const userToken = issueAccessToken("alice", "user", 60);
    let status = 0;

    await route(
        requestWithBody(
            "POST",
            {
                category: "account_alert",
                recipientUsername: "alice",
                subject: "Hi",
                body: "Test",
            },
            userToken,
        ),
        {
            writeHead(c: number) {
                status = c;
            },
            end() {},
        } as any,
        new URL("http://localhost/api/v1/notify/send"),
    );

    assert.equal(status, 403);
});

test("notification route does not handle unrelated paths", async () => {
    const prefStore = new VolatileNotificationPreferenceStore();
    const gateway = new CoreNotificationGateway(prefStore);
    const route = createNotificationRoutes(gateway);
    const adminToken = issueAccessToken("admin", "admin", 60);

    const handled = await route(
        {
            method: "GET",
            headers: { authorization: `Bearer ${adminToken}` },
        } as any,
        { writeHead() {}, end() {} } as any,
        new URL("http://localhost/api/v1/other"),
    );

    assert.equal(handled, false);
});

test("GET /api/v1/notify/providers returns sender list to admin", async () => {
    const prefStore = new VolatileNotificationPreferenceStore();
    const gateway = new CoreNotificationGateway(prefStore);
    gateway.registerSender(new CapturingSender("smtp"));
    const route = createNotificationRoutes(gateway);
    const adminToken = issueAccessToken("admin", "admin", 60);
    const res = makeResponse();

    await route(
        {
            method: "GET",
            headers: { authorization: `Bearer ${adminToken}` },
            [Symbol.asyncIterator]: async function* () {},
        } as any,
        res,
        new URL("http://localhost/api/v1/notify/providers"),
    );

    assert.equal(res.status, 200);
    const data = JSON.parse(res.payload);
    assert.ok(Array.isArray(data.data));
    assert.equal(data.data.length, 1);
    assert.equal(data.data[0].senderId, "smtp");
});

test("GET /api/v1/notify/providers returns sender list to non-admin user", async () => {
    const prefStore = new VolatileNotificationPreferenceStore();
    const gateway = new CoreNotificationGateway(prefStore);
    gateway.registerSender(new CapturingSender("smtp"));
    const route = createNotificationRoutes(gateway);
    const userToken = issueAccessToken("alice", "user", 60);
    const res = makeResponse();

    await route(
        {
            method: "GET",
            headers: { authorization: `Bearer ${userToken}` },
            [Symbol.asyncIterator]: async function* () {},
        } as any,
        res,
        new URL("http://localhost/api/v1/notify/providers"),
    );

    assert.equal(res.status, 200);
    const data = JSON.parse(res.payload);
    assert.ok(Array.isArray(data.data));
});

test("GET /api/v1/notify/providers returns 401 without auth", async () => {
    const prefStore = new VolatileNotificationPreferenceStore();
    const gateway = new CoreNotificationGateway(prefStore);
    const route = createNotificationRoutes(gateway);
    const res = makeResponse();

    await route(
        {
            method: "GET",
            headers: {},
            [Symbol.asyncIterator]: async function* () {},
        } as any,
        res,
        new URL("http://localhost/api/v1/notify/providers"),
    );

    assert.equal(res.status, 401);
});

test("GET /api/v1/notify/categories returns categories to authenticated user", async () => {
    const prefStore = new VolatileNotificationPreferenceStore();
    const gateway = new CoreNotificationGateway(prefStore);
    gateway.registerCategory("system", "System");
    const route = createNotificationRoutes(gateway);
    const userToken = issueAccessToken("alice", "user", 60);
    const res = makeResponse();

    await route(
        {
            method: "GET",
            headers: { authorization: `Bearer ${userToken}` },
            [Symbol.asyncIterator]: async function* () {},
        } as any,
        res,
        new URL("http://localhost/api/v1/notify/categories"),
    );

    assert.equal(res.status, 200);
    const data = JSON.parse(res.payload);
    assert.ok(Array.isArray(data.data));
    assert.ok(data.data.some((c: { id: string }) => c.id === "system"));
});

test("GET /api/v1/notify/categories returns 401 without auth", async () => {
    const prefStore = new VolatileNotificationPreferenceStore();
    const gateway = new CoreNotificationGateway(prefStore);
    const route = createNotificationRoutes(gateway);
    const res = makeResponse();

    await route(
        {
            method: "GET",
            headers: {},
            [Symbol.asyncIterator]: async function* () {},
        } as any,
        res,
        new URL("http://localhost/api/v1/notify/categories"),
    );

    assert.equal(res.status, 401);
});

test("GET /api/v1/notify/providers/:id/config returns 404 for unknown sender", async () => {
    const prefStore = new VolatileNotificationPreferenceStore();
    const gateway = new CoreNotificationGateway(prefStore);
    const route = createNotificationRoutes(gateway);
    const adminToken = issueAccessToken("admin", "admin", 60);
    const res = makeResponse();

    await route(
        {
            method: "GET",
            headers: { authorization: `Bearer ${adminToken}` },
            [Symbol.asyncIterator]: async function* () {},
        } as any,
        res,
        new URL("http://localhost/api/v1/notify/providers/unknown/config"),
    );

    assert.equal(res.status, 404);
});

test("POST /api/v1/notify/providers/:id/test returns 400 when sender has no sendTestEmail", async () => {
    const prefStore = new VolatileNotificationPreferenceStore();
    const gateway = new CoreNotificationGateway(prefStore);
    gateway.registerSender(new CapturingSender("smtp"));
    const route = createNotificationRoutes(gateway);
    const adminToken = issueAccessToken("admin", "admin", 60);
    const res = makeResponse();

    await route(
        requestWithBody("POST", { to: "test@example.com" }, adminToken),
        res,
        new URL("http://localhost/api/v1/notify/providers/smtp/test"),
    );

    assert.equal(res.status, 400);
    assert.match(res.payload, /not_supported/);
});

test("GET /api/v1/notify/users/:username/notification-prefs returns 401 without auth", async () => {
    const prefStore = new VolatileNotificationPreferenceStore();
    const gateway = new CoreNotificationGateway(prefStore);
    const route = createNotificationRoutes(gateway);
    const res = makeResponse();

    await route(
        {
            method: "GET",
            headers: {},
            [Symbol.asyncIterator]: async function* () {},
        } as any,
        res,
        new URL(
            "http://localhost/api/v1/notify/users/alice/notification-prefs",
        ),
    );

    assert.equal(res.status, 401);
});

test("GET /api/v1/notify/users/:username/notification-prefs returns 403 for different user", async () => {
    const prefStore = new VolatileNotificationPreferenceStore();
    const gateway = new CoreNotificationGateway(prefStore);
    const route = createNotificationRoutes(gateway);
    const userToken = issueAccessToken("bob", "user", 60);
    const res = makeResponse();

    await route(
        {
            method: "GET",
            headers: { authorization: `Bearer ${userToken}` },
            [Symbol.asyncIterator]: async function* () {},
        } as any,
        res,
        new URL(
            "http://localhost/api/v1/notify/users/alice/notification-prefs",
        ),
    );

    assert.equal(res.status, 403);
});

test("GET /api/v1/notify/users/:username/notification-prefs returns empty array without notifStore", async () => {
    const prefStore = new VolatileNotificationPreferenceStore();
    const gateway = new CoreNotificationGateway(prefStore);
    const route = createNotificationRoutes(gateway);
    const userToken = issueAccessToken("alice", "user", 60);
    const res = makeResponse();

    await route(
        {
            method: "GET",
            headers: { authorization: `Bearer ${userToken}` },
            [Symbol.asyncIterator]: async function* () {},
        } as any,
        res,
        new URL(
            "http://localhost/api/v1/notify/users/alice/notification-prefs",
        ),
    );

    assert.equal(res.status, 200);
    const data = JSON.parse(res.payload);
    assert.deepEqual(data.data, []);
});

test("PUT /api/v1/notify/users/:username/notification-prefs returns 200 without notifStore", async () => {
    const prefStore = new VolatileNotificationPreferenceStore();
    const gateway = new CoreNotificationGateway(prefStore);
    const route = createNotificationRoutes(gateway);
    const userToken = issueAccessToken("alice", "user", 60);
    const res = makeResponse();

    await route(
        requestWithBody(
            "PUT",
            [{ category: "system", senderId: "smtp", enabled: true }],
            userToken,
        ),
        res,
        new URL(
            "http://localhost/api/v1/notify/users/alice/notification-prefs",
        ),
    );

    assert.equal(res.status, 200);
});

test("PUT /api/v1/notify/users/:username/notification-prefs strips disabled entries for always-on senders", async () => {
    const prefStore = new VolatileNotificationPreferenceStore();
    const gateway = new CoreNotificationGateway(prefStore);
    gateway.registerAlwaysOnSender("internal");

    let savedPrefs: Array<{
        category: string;
        senderId: string;
        enabled: boolean;
    }> = [];
    const mockStore = {
        async getUserNotifPrefs() {
            return savedPrefs;
        },
        async saveUserNotifPrefs(
            _username: string,
            prefs: Array<{
                category: string;
                senderId: string;
                enabled: boolean;
            }>,
        ) {
            savedPrefs = prefs;
        },
        async getConfig() {
            return null;
        },
        async saveConfig() {},
        async ensureSchema() {},
    };

    const route = createNotificationRoutes(gateway, mockStore as any);
    const userToken = issueAccessToken("alice", "user", 60);
    const res = makeResponse();

    await route(
        requestWithBody(
            "PUT",
            [
                { category: "system", senderId: "internal", enabled: false },
                { category: "system", senderId: "smtp", enabled: true },
            ],
            userToken,
        ),
        res,
        new URL(
            "http://localhost/api/v1/notify/users/alice/notification-prefs",
        ),
    );

    assert.equal(res.status, 200);
    assert.equal(
        savedPrefs.length,
        1,
        "always-on disabled entry must be stripped",
    );
    assert.equal(savedPrefs[0].senderId, "smtp");
});

test("GET /api/v1/notify/providers/:id/config includes requiredFields when sender implements getRequiredFields", async () => {
    class ConfiguredSender implements NotificationSender {
        readonly senderId = "smtp";
        async send() {}
        getConfig(): Record<string, unknown> {
            return {
                host: "smtp.example.com",
                port: 587,
                from: "noreply@example.com",
                secure: "starttls",
            };
        }
        getEnvValues(): Record<string, string | undefined> {
            return {};
        }
        getRequiredFields(): string[] {
            return ["host", "from"];
        }
        isConfigured(): boolean {
            return true;
        }
    }

    const prefStore = new VolatileNotificationPreferenceStore();
    const gateway = new CoreNotificationGateway(prefStore);
    gateway.registerSender(new ConfiguredSender());
    const route = createNotificationRoutes(gateway);
    const adminToken = issueAccessToken("admin", "admin", 60);
    const res = makeResponse();

    await route(
        {
            method: "GET",
            headers: { authorization: `Bearer ${adminToken}` },
            [Symbol.asyncIterator]: async function* () {},
        } as any,
        res,
        new URL("http://localhost/api/v1/notify/providers/smtp/config"),
    );

    assert.equal(res.status, 200);
    const body = JSON.parse(res.payload);
    assert.deepEqual(body.requiredFields, ["host", "from"]);
});

test("GET /api/v1/notify/providers/:id/config returns empty requiredFields when sender has no getRequiredFields", async () => {
    class MinimalSender implements NotificationSender {
        readonly senderId = "smtp";
        async send() {}
        getConfig(): Record<string, unknown> {
            return { host: "smtp.example.com" };
        }
        getEnvValues(): Record<string, string | undefined> {
            return {};
        }
    }

    const prefStore = new VolatileNotificationPreferenceStore();
    const gateway = new CoreNotificationGateway(prefStore);
    gateway.registerSender(new MinimalSender());
    const route = createNotificationRoutes(gateway);
    const adminToken = issueAccessToken("admin", "admin", 60);
    const res = makeResponse();

    await route(
        {
            method: "GET",
            headers: { authorization: `Bearer ${adminToken}` },
            [Symbol.asyncIterator]: async function* () {},
        } as any,
        res,
        new URL("http://localhost/api/v1/notify/providers/smtp/config"),
    );

    assert.equal(res.status, 200);
    const body = JSON.parse(res.payload);
    assert.deepEqual(body.requiredFields, []);
});

test("GET /api/v1/notify/users/:username/notification-prefs returns 200 for owner accessing another user", async () => {
    const prefStore = new VolatileNotificationPreferenceStore();
    const gateway = new CoreNotificationGateway(prefStore);
    const route = createNotificationRoutes(gateway);
    const ownerToken = issueAccessToken("owner-account", "owner", 60);
    const res = makeResponse();

    await route(
        {
            method: "GET",
            headers: { authorization: `Bearer ${ownerToken}` },
            [Symbol.asyncIterator]: async function* () {},
        } as any,
        res,
        new URL(
            "http://localhost/api/v1/notify/users/alice/notification-prefs",
        ),
    );

    assert.equal(res.status, 200);
    const data = JSON.parse(res.payload);
    assert.deepEqual(data.data, []);
});

test("POST /api/v1/notify/broadcasts creates a broadcast for admin users", async () => {
    const prefStore = new VolatileNotificationPreferenceStore();
    const gateway = new CoreNotificationGateway(prefStore);
    let createdPayload: Record<string, unknown> | null = null;
    const route = createNotificationRoutes(gateway, {
        async getUserNotifPrefs() {
            return [];
        },
        async saveUserNotifPrefs() {},
        async createBroadcast(input) {
            createdPayload = input as Record<string, unknown>;
            return { id: "broadcast-1", ...input };
        },
    });
    const adminToken = issueAccessToken("admin-user", "admin", 60);
    const response = makeResponse();

    await route(
        requestWithBody(
            "POST",
            {
                title: "Maintenance Window",
                message: "Planned outage at 22:00 UTC.",
                displayMode: "bar",
                targetRoles: ["user", "teacher"],
                startAt: 1_700_000_000_000,
                endAt: 1_700_000_360_000,
                requireAcknowledgement: true,
                redirectUrl: "/docs",
                enabled: true,
            },
            adminToken,
        ),
        response,
        new URL("http://localhost/api/v1/notify/broadcasts"),
    );

    assert.equal(response.status, 200);
    assert.ok(createdPayload);
    assert.equal(createdPayload?.createdBy, "admin-user");
    const body = JSON.parse(response.payload);
    assert.equal(body.data.id, "broadcast-1");
});

test("POST /api/v1/notify/broadcasts returns 400 for invalid payload", async () => {
    const prefStore = new VolatileNotificationPreferenceStore();
    const gateway = new CoreNotificationGateway(prefStore);
    const route = createNotificationRoutes(gateway, {
        async getUserNotifPrefs() {
            return [];
        },
        async saveUserNotifPrefs() {},
        async createBroadcast() {
            return {};
        },
    });
    const adminToken = issueAccessToken("admin-user", "admin", 60);
    const response = makeResponse();

    await route(
        requestWithBody(
            "POST",
            {
                title: "",
                message: "body",
                displayMode: "bar",
                targetRoles: ["user"],
            },
            adminToken,
        ),
        response,
        new URL("http://localhost/api/v1/notify/broadcasts"),
    );

    assert.equal(response.status, 400);
    assert.match(response.payload, /missing_broadcast_title/);
});

test("POST /api/v1/notify/broadcasts returns 400 when no target roles are selected", async () => {
    const prefStore = new VolatileNotificationPreferenceStore();
    const gateway = new CoreNotificationGateway(prefStore);
    const route = createNotificationRoutes(gateway, {
        async getUserNotifPrefs() {
            return [];
        },
        async saveUserNotifPrefs() {},
        async createBroadcast() {
            return {};
        },
    });
    const adminToken = issueAccessToken("admin-user", "admin", 60);
    const response = makeResponse();

    await route(
        requestWithBody(
            "POST",
            {
                title: "Maintenance Window",
                message: "body",
                displayMode: "bar",
                targetRoles: [],
            },
            adminToken,
        ),
        response,
        new URL("http://localhost/api/v1/notify/broadcasts"),
    );

    assert.equal(response.status, 400);
    assert.match(response.payload, /missing_broadcast_roles/);
});

test("POST /api/v1/notify/broadcasts returns 400 for invalid date ranges", async () => {
    const prefStore = new VolatileNotificationPreferenceStore();
    const gateway = new CoreNotificationGateway(prefStore);
    const route = createNotificationRoutes(gateway, {
        async getUserNotifPrefs() {
            return [];
        },
        async saveUserNotifPrefs() {},
        async createBroadcast() {
            return {};
        },
    });
    const adminToken = issueAccessToken("admin-user", "admin", 60);
    const response = makeResponse();

    await route(
        requestWithBody(
            "POST",
            {
                title: "Maintenance Window",
                message: "body",
                displayMode: "bar",
                targetRoles: ["user"],
                startAt: 1_700_000_360_000,
                endAt: 1_700_000_000_000,
            },
            adminToken,
        ),
        response,
        new URL("http://localhost/api/v1/notify/broadcasts"),
    );

    assert.equal(response.status, 400);
    assert.match(response.payload, /invalid_broadcast_window_range/);
});

test("POST /api/v1/notify/broadcasts rejects external redirect URLs", async () => {
    const prefStore = new VolatileNotificationPreferenceStore();
    const gateway = new CoreNotificationGateway(prefStore);
    const route = createNotificationRoutes(gateway, {
        async getUserNotifPrefs() {
            return [];
        },
        async saveUserNotifPrefs() {},
        async createBroadcast() {
            return {};
        },
    });
    const adminToken = issueAccessToken("admin-user", "admin", 60);
    const response = makeResponse();

    await route(
        requestWithBody(
            "POST",
            {
                title: "Maintenance Window",
                message: "Planned outage at 22:00 UTC.",
                displayMode: "bar",
                targetRoles: ["user"],
                redirectUrl: "https://malicious.example.com/landing",
            },
            adminToken,
        ),
        response,
        new URL("http://localhost/api/v1/notify/broadcasts"),
    );

    assert.equal(response.status, 400);
    assert.match(response.payload, /invalid_broadcast_redirect/);
});

test("POST /api/v1/notify/broadcasts accepts trusted external redirect URLs", async () => {
    const prefStore = new VolatileNotificationPreferenceStore();
    const gateway = new CoreNotificationGateway(prefStore);
    let createdPayload: Record<string, unknown> | null = null;
    const route = createNotificationRoutes(
        gateway,
        {
            async getUserNotifPrefs() {
                return [];
            },
            async saveUserNotifPrefs() {},
            async createBroadcast(input) {
                createdPayload = input as Record<string, unknown>;
                return { id: "broadcast-2", ...input };
            },
        },
        {
            async getTrustedDomains() {
                return ["example.com"];
            },
        },
    );
    const adminToken = issueAccessToken("admin-user", "admin", 60);
    const response = makeResponse();

    await route(
        requestWithBody(
            "POST",
            {
                title: "Maintenance Window",
                message: "Planned outage at 22:00 UTC.",
                displayMode: "bar",
                targetRoles: ["user"],
                redirectUrl: "https://status.example.com/landing",
            },
            adminToken,
        ),
        response,
        new URL("http://localhost/api/v1/notify/broadcasts"),
    );

    assert.equal(response.status, 200);
    assert.equal(
        createdPayload?.redirectUrl,
        "https://status.example.com/landing",
    );
});

test("GET /api/v1/notify/broadcasts/active returns role-targeted broadcasts", async () => {
    const prefStore = new VolatileNotificationPreferenceStore();
    const gateway = new CoreNotificationGateway(prefStore);
    let receivedRole = "";
    let receivedAccountId = "";
    const route = createNotificationRoutes(gateway, {
        async getUserNotifPrefs() {
            return [];
        },
        async saveUserNotifPrefs() {},
        async getActiveBroadcastsForRole(accountId, role) {
            receivedAccountId = accountId;
            receivedRole = role;
            return [{ id: "broadcast-1", title: "A", message: "B" }];
        },
    });
    const userToken = issueAccessToken("alice", "teacher", 60);
    const response = makeResponse();

    await route(
        {
            method: "GET",
            headers: { authorization: `Bearer ${userToken}` },
            [Symbol.asyncIterator]: async function* () {},
        } as any,
        response,
        new URL("http://localhost/api/v1/notify/broadcasts/active"),
    );

    assert.equal(response.status, 200);
    assert.equal(receivedAccountId, "alice");
    assert.equal(receivedRole, "teacher");
    const body = JSON.parse(response.payload);
    assert.equal(body.data[0].id, "broadcast-1");
});

test("GET /api/v1/notify/broadcasts/:id/states returns broadcast acknowledgement state rows for admin", async () => {
    const prefStore = new VolatileNotificationPreferenceStore();
    const gateway = new CoreNotificationGateway(prefStore);
    let requestedBroadcastId = "";
    const route = createNotificationRoutes(gateway, {
        async getUserNotifPrefs() {
            return [];
        },
        async saveUserNotifPrefs() {},
        async listBroadcastStates(broadcastId) {
            requestedBroadcastId = broadcastId;
            return [
                {
                    accountId: "alice",
                    broadcastId,
                    acknowledgedAt: 1_700_000_000_000,
                    dismissedAt: null,
                },
            ];
        },
    });
    const adminToken = issueAccessToken("admin-user", "admin", 60);
    const response = makeResponse();

    await route(
        {
            method: "GET",
            headers: { authorization: `Bearer ${adminToken}` },
            [Symbol.asyncIterator]: async function* () {},
        } as any,
        response,
        new URL("http://localhost/api/v1/notify/broadcasts/broadcast-9/states"),
    );

    assert.equal(response.status, 200);
    assert.equal(requestedBroadcastId, "broadcast-9");
    const body = JSON.parse(response.payload);
    assert.equal(body.data[0].accountId, "alice");
});

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

import test from "node:test";
import assert from "node:assert/strict";
import {
    CoreNotificationGateway,
    VolatileNotificationPreferenceStore,
} from "../gateway.js";
import type { NotificationEnvelope, NotificationSender } from "@cognis/core";

class CapturingSender implements NotificationSender {
    readonly senderId: string;
    readonly received: NotificationEnvelope[] = [];
    readonly senderName: string;

    constructor(id: string, name: string) {
        this.senderId = id;
        this.senderName = name;
    }

    async send(envelope: NotificationEnvelope): Promise<void> {
        this.received.push(envelope);
    }
}

class ConfigurableSender extends CapturingSender {
    private config: Record<string, unknown>;

    constructor(
        id: string,
        name: string,
        initialConfig: Record<string, unknown> = {},
    ) {
        super(id, name);
        this.config = { ...initialConfig };
    }

    getConfig(): Record<string, unknown> {
        return { ...this.config };
    }

    setConfig(cfg: Record<string, unknown>): void {
        this.config = { ...this.config, ...cfg };
    }
}

class TrackedQueueSender extends CapturingSender {
    readonly queue = new Map<
        string,
        { notificationId: string; status: "queued" }
    >();
    private receiptCounter = 0;

    async sendTracked(envelope: NotificationEnvelope): Promise<{
        notificationId: string;
    }> {
        this.received.push(envelope);
        this.receiptCounter++;
        const notificationId = `tracked-${this.receiptCounter}`;
        this.queue.set(notificationId, {
            notificationId,
            status: "queued",
        });
        return { notificationId };
    }

    listQueue() {
        return Array.from(this.queue.values()).map((entry) => ({
            ...entry,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
            subject: "Tracked",
        }));
    }

    getQueueItem(notificationId: string) {
        const entry = this.queue.get(notificationId);
        if (!entry) return null;
        return {
            ...entry,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
            subject: "Tracked",
        };
    }
}

test("CoreNotificationGateway.registerCategory and listCategories", () => {
    const prefStore = new VolatileNotificationPreferenceStore();
    const gateway = new CoreNotificationGateway(prefStore);

    gateway.registerCategory("system", "System Alerts");
    gateway.registerCategory("account", "Account Events");

    const categories = gateway.listCategories();
    assert.equal(categories.length, 2);
    assert.ok(
        categories.some(
            (c) => c.id === "system" && c.label === "System Alerts",
        ),
    );
    assert.ok(
        categories.some(
            (c) => c.id === "account" && c.label === "Account Events",
        ),
    );
});

test("CoreNotificationGateway.listSenders reflects registered senders", () => {
    const prefStore = new VolatileNotificationPreferenceStore();
    const gateway = new CoreNotificationGateway(prefStore);

    const sender = new CapturingSender("email", "Email Sender");
    gateway.registerSender(sender);

    const senders = gateway.listSenders();
    assert.equal(senders.length, 1);
    assert.equal(senders[0].senderId, "email");
    assert.equal(senders[0].name, "Email Sender");
});

test("CoreNotificationGateway.listSenders marks sender active when it has getConfig", () => {
    const prefStore = new VolatileNotificationPreferenceStore();
    const gateway = new CoreNotificationGateway(prefStore);

    const plainSender = new CapturingSender("plain", "Plain");
    const configSender = new ConfigurableSender("configured", "Configured");
    gateway.registerSender(plainSender);
    gateway.registerSender(configSender);

    const senders = gateway.listSenders();
    const plain = senders.find((s) => s.senderId === "plain");
    const configured = senders.find((s) => s.senderId === "configured");
    assert.equal(plain?.active, false);
    assert.equal(configured?.active, true);
});

test("CoreNotificationGateway.listSenders exposes supportsTest from sender capability", () => {
    const prefStore = new VolatileNotificationPreferenceStore();
    const gateway = new CoreNotificationGateway(prefStore);

    class TestableSender extends ConfigurableSender {
        async test(): Promise<void> {}
    }

    gateway.registerSender(new CapturingSender("plain", "Plain"));
    gateway.registerSender(new TestableSender("smtp", "SMTP"));

    const senders = gateway.listSenders();
    const plain = senders.find((sender) => sender.senderId === "plain");
    const smtp = senders.find((sender) => sender.senderId === "smtp");
    assert.equal(plain?.supportsTest, false);
    assert.equal(smtp?.supportsTest, true);
});

test("CoreNotificationGateway.getProviderConfig returns null for sender without getConfig", () => {
    const prefStore = new VolatileNotificationPreferenceStore();
    const gateway = new CoreNotificationGateway(prefStore);

    gateway.registerSender(new CapturingSender("plain", "Plain"));

    assert.equal(gateway.getProviderConfig("plain"), null);
    assert.equal(gateway.getProviderConfig("nonexistent"), null);
});

test("CoreNotificationGateway.getProviderConfig returns config for configurable sender", () => {
    const prefStore = new VolatileNotificationPreferenceStore();
    const gateway = new CoreNotificationGateway(prefStore);

    const sender = new ConfigurableSender("smtp", "SMTP", {
        host: "mail.example.com",
        port: 587,
    });
    gateway.registerSender(sender);

    const config = gateway.getProviderConfig("smtp");
    assert.ok(config !== null);
    assert.equal(config.host, "mail.example.com");
    assert.equal(config.port, 587);
});

test("CoreNotificationGateway.saveProviderConfig updates sender config", async () => {
    const prefStore = new VolatileNotificationPreferenceStore();
    const gateway = new CoreNotificationGateway(prefStore);

    const sender = new ConfigurableSender("smtp", "SMTP", {
        host: "old.example.com",
    });
    gateway.registerSender(sender);

    await gateway.saveProviderConfig("smtp", {
        host: "new.example.com",
        port: 465,
    });

    const config = gateway.getProviderConfig("smtp");
    assert.ok(config !== null);
    assert.equal(config.host, "new.example.com");
    assert.equal(config.port, 465);
});

test("CoreNotificationGateway.saveProviderConfig persists to configStore", async () => {
    const stored = new Map<string, Record<string, unknown>>();
    const configStore = {
        async getConfig(id: string) {
            return stored.get(id) ?? null;
        },
        async saveConfig(id: string, config: Record<string, unknown>) {
            stored.set(id, config);
        },
    };
    const prefStore = new VolatileNotificationPreferenceStore();
    const gateway = new CoreNotificationGateway(prefStore, configStore);

    const sender = new ConfigurableSender("smtp", "SMTP");
    gateway.registerSender(sender);

    await gateway.saveProviderConfig("smtp", { host: "new.example.com" });
    assert.deepEqual(stored.get("smtp"), { host: "new.example.com" });
});

test("CoreNotificationGateway.loadPersistedConfigs applies stored config to senders", async () => {
    const stored = new Map<string, Record<string, unknown>>();
    stored.set("smtp", { host: "persisted.example.com", port: 587 });

    const configStore = {
        async getConfig(id: string) {
            return stored.get(id) ?? null;
        },
        async saveConfig(id: string, config: Record<string, unknown>) {
            stored.set(id, config);
        },
    };
    const prefStore = new VolatileNotificationPreferenceStore();
    const gateway = new CoreNotificationGateway(prefStore, configStore);

    const sender = new ConfigurableSender("smtp", "SMTP", {
        host: "initial.example.com",
    });
    gateway.registerSender(sender);

    await gateway.loadPersistedConfigs();

    const config = gateway.getProviderConfig("smtp");
    assert.ok(config !== null);
    assert.equal(config.host, "persisted.example.com");
});

test("CoreNotificationGateway.dispatch routes envelope to correct senders", async () => {
    const prefStore = new VolatileNotificationPreferenceStore();
    prefStore.set("alice", "account_alert", ["smtp", "webhook"]);

    const smtpSender = new CapturingSender("smtp", "SMTP");
    const webhookSender = new CapturingSender("webhook", "Webhook");
    const otherSender = new CapturingSender("other", "Other");

    const gateway = new CoreNotificationGateway(prefStore);
    gateway.registerSender(smtpSender);
    gateway.registerSender(webhookSender);
    gateway.registerSender(otherSender);

    const result = await gateway.dispatch({
        category: "account_alert",
        recipientUsername: "alice",
        recipientEmail: "alice@example.com",
        subject: "Alert",
        body: "Content",
    });

    assert.deepEqual(result.dispatched.sort(), ["smtp", "webhook"]);
    assert.equal(smtpSender.received.length, 1);
    assert.equal(webhookSender.received.length, 1);
    assert.equal(otherSender.received.length, 0);
});

test("CoreNotificationGateway.dispatch returns empty array when no preferences set", async () => {
    const prefStore = new VolatileNotificationPreferenceStore();
    const gateway = new CoreNotificationGateway(prefStore);
    gateway.registerSender(new CapturingSender("smtp", "SMTP"));

    const result = await gateway.dispatch({
        category: "system_alert",
        recipientUsername: "bob",
        subject: "Info",
        body: "Details",
    });

    assert.deepEqual(result.dispatched, []);
});

test("CoreNotificationGateway.getProviderRequiredFields returns fields from sender", () => {
    const prefStore = new VolatileNotificationPreferenceStore();
    const gateway = new CoreNotificationGateway(prefStore);

    class RequiredFieldsSender extends CapturingSender {
        getRequiredFields(): string[] {
            return ["host", "from"];
        }
    }

    gateway.registerSender(new RequiredFieldsSender("smtp", "SMTP"));
    const required = gateway.getProviderRequiredFields("smtp");
    assert.deepEqual(required, ["host", "from"]);
});

test("CoreNotificationGateway.getProviderRequiredFields returns null for sender without getRequiredFields", () => {
    const prefStore = new VolatileNotificationPreferenceStore();
    const gateway = new CoreNotificationGateway(prefStore);
    gateway.registerSender(new CapturingSender("smtp", "SMTP"));

    const required = gateway.getProviderRequiredFields("smtp");
    assert.equal(required, null);
});

test("CoreNotificationGateway.getProviderRequiredFields returns null for unknown sender", () => {
    const prefStore = new VolatileNotificationPreferenceStore();
    const gateway = new CoreNotificationGateway(prefStore);

    const required = gateway.getProviderRequiredFields("unknown");
    assert.equal(required, null);
});

test("CoreNotificationGateway.saveProviderConfig with enabled:false disables sender in listSenders", async () => {
    const prefStore = new VolatileNotificationPreferenceStore();
    const gateway = new CoreNotificationGateway(prefStore);

    const sender = new ConfigurableSender("smtp", "SMTP", {
        host: "mail.example.com",
    });
    gateway.registerSender(sender);

    const before = gateway.listSenders().find((s) => s.senderId === "smtp");
    assert.equal(before?.active, true);

    await gateway.saveProviderConfig("smtp", {
        host: "mail.example.com",
        enabled: false,
    });

    const after = gateway.listSenders().find((s) => s.senderId === "smtp");
    assert.equal(after?.active, false);
});

test("CoreNotificationGateway.saveProviderConfig with enabled:true re-enables a disabled sender", async () => {
    const prefStore = new VolatileNotificationPreferenceStore();
    const gateway = new CoreNotificationGateway(prefStore);

    const sender = new ConfigurableSender("smtp", "SMTP", {
        host: "mail.example.com",
    });
    gateway.registerSender(sender);

    await gateway.saveProviderConfig("smtp", {
        host: "mail.example.com",
        enabled: false,
    });
    await gateway.saveProviderConfig("smtp", {
        host: "mail.example.com",
        enabled: true,
    });

    const info = gateway.listSenders().find((s) => s.senderId === "smtp");
    assert.equal(info?.active, true);
});

test("CoreNotificationGateway.getProviderConfig includes enabled field", async () => {
    const prefStore = new VolatileNotificationPreferenceStore();
    const gateway = new CoreNotificationGateway(prefStore);

    const sender = new ConfigurableSender("smtp", "SMTP", {
        host: "mail.example.com",
    });
    gateway.registerSender(sender);

    const configEnabled = gateway.getProviderConfig("smtp");
    assert.equal(configEnabled?.enabled, true);

    await gateway.saveProviderConfig("smtp", {
        host: "mail.example.com",
        enabled: false,
    });

    const configDisabled = gateway.getProviderConfig("smtp");
    assert.equal(configDisabled?.enabled, false);
});

test("CoreNotificationGateway.dispatch skips disabled senders", async () => {
    const prefStore = new VolatileNotificationPreferenceStore();
    prefStore.set("alice", "system", ["smtp"]);

    const smtpSender = new CapturingSender("smtp", "SMTP");
    const gateway = new CoreNotificationGateway(prefStore);
    gateway.registerSender(smtpSender);

    await gateway.saveProviderConfig("smtp", { enabled: false });

    const result = await gateway.dispatch({
        category: "system",
        recipientUsername: "alice",
        recipientEmail: "alice@example.com",
        subject: "Hello",
        body: "World",
    });

    assert.deepEqual(result.dispatched, []);
    assert.equal(smtpSender.received.length, 0);
});

test("CoreNotificationGateway.dispatch captures per-sender errors without throwing", async () => {
    const prefStore = new VolatileNotificationPreferenceStore();
    prefStore.set("alice", "system", ["smtp"]);

    class FailingSender extends CapturingSender {
        async send(): Promise<void> {
            throw new Error("smtp_sender_requires_recipient_email");
        }
    }

    const gateway = new CoreNotificationGateway(prefStore);
    gateway.registerSender(new FailingSender("smtp", "SMTP"));

    const result = await gateway.dispatch({
        category: "system",
        recipientUsername: "alice",
        subject: "Hello",
        body: "World",
    });

    assert.deepEqual(result.dispatched, []);
    assert.ok(Array.isArray(result.errors));
    assert.equal(result.errors?.[0]?.senderId, "smtp");
    assert.equal(
        result.errors?.[0]?.error,
        "smtp_sender_requires_recipient_email",
    );
});

test("CoreNotificationGateway.dispatch includes receipts for tracked senders", async () => {
    const prefStore = new VolatileNotificationPreferenceStore();
    prefStore.set("alice", "system", ["tracked"]);
    const gateway = new CoreNotificationGateway(prefStore);
    gateway.registerSender(new TrackedQueueSender("tracked", "Tracked"));

    const result = await gateway.dispatch({
        category: "system",
        recipientUsername: "alice",
        recipientEmail: "alice@example.com",
        subject: "Hello",
        body: "World",
    });

    assert.deepEqual(result.dispatched, ["tracked"]);
    assert.equal(result.notifications?.[0]?.senderId, "tracked");
    assert.equal(result.notifications?.[0]?.notificationId, "tracked-1");
});

test("CoreNotificationGateway exposes sender queue state", async () => {
    const prefStore = new VolatileNotificationPreferenceStore();
    prefStore.set("alice", "system", ["tracked"]);
    const gateway = new CoreNotificationGateway(prefStore);
    gateway.registerSender(new TrackedQueueSender("tracked", "Tracked"));

    await gateway.dispatch({
        category: "system",
        recipientUsername: "alice",
        recipientEmail: "alice@example.com",
        subject: "Hello",
        body: "World",
    });

    const queue = gateway.listNotificationQueue();
    assert.equal(queue.length, 1);
    assert.equal(queue[0]?.senderId, "tracked");
    assert.equal(queue[0]?.notificationId, "tracked-1");

    const queueItem = gateway.getNotificationQueueItem("tracked-1");
    assert.equal(queueItem?.senderId, "tracked");
    assert.equal(queueItem?.notificationId, "tracked-1");
});

test("CoreNotificationGateway.loadPersistedConfigs restores disabled state", async () => {
    const stored = new Map<string, Record<string, unknown>>();
    stored.set("smtp", { host: "mail.example.com", enabled: false });

    const configStore = {
        async getConfig(id: string) {
            return stored.get(id) ?? null;
        },
        async saveConfig(id: string, config: Record<string, unknown>) {
            stored.set(id, config);
        },
    };
    const prefStore = new VolatileNotificationPreferenceStore();
    const gateway = new CoreNotificationGateway(prefStore, configStore);

    const sender = new ConfigurableSender("smtp", "SMTP", {
        host: "initial.example.com",
    });
    gateway.registerSender(sender);

    await gateway.loadPersistedConfigs();

    const info = gateway.listSenders().find((s) => s.senderId === "smtp");
    assert.equal(info?.active, false);
});

test("CoreNotificationGateway keeps always-on senders enabled after reload", async () => {
    const configStore = {
        async getConfig() {
            return { enabled: false };
        },
        async saveConfig() {},
    };
    const gateway = new CoreNotificationGateway(
        new VolatileNotificationPreferenceStore(),
        configStore,
    );
    gateway.registerSender(new ConfigurableSender("internal", "Internal", {}));
    gateway.registerAlwaysOnSender("internal");

    await gateway.loadPersistedConfigs();

    assert.equal(gateway.isSenderEnabled("internal"), true);
    await assert.rejects(
        () => gateway.disableSender("internal"),
        /adapter_locked/,
    );
});

test("CoreNotificationGateway notifies sender enabled state listeners", async () => {
    const prefStore = new VolatileNotificationPreferenceStore();
    const gateway = new CoreNotificationGateway(prefStore);
    gateway.registerSender(new CapturingSender("smtp", "SMTP"));
    const changes: Array<{ senderId: string; enabled: boolean }> = [];
    gateway.onSenderEnabledChange("test", (senderId, enabled) => {
        changes.push({ senderId, enabled });
    });

    await gateway.disableSender("smtp");
    await gateway.enableSender("smtp");
    await gateway.enableSender("smtp");

    assert.deepEqual(changes, [
        { senderId: "smtp", enabled: false },
        { senderId: "smtp", enabled: true },
    ]);
});

test("CoreNotificationGateway updateProviderConfig merges patches and emits config listeners", async () => {
    const prefStore = new VolatileNotificationPreferenceStore();
    const gateway = new CoreNotificationGateway(prefStore);
    const sender = new ConfigurableSender("smtp", "SMTP", {
        host: "mail.example.com",
        codeLength: 6,
    });
    gateway.registerSender(sender);
    const changes: Array<Record<string, unknown>> = [];
    gateway.onSenderConfigChange("test", (_senderId, config) => {
        changes.push(config);
    });

    await gateway.updateProviderConfig("smtp", { codeLength: 8 });

    assert.equal(sender.getConfig().host, "mail.example.com");
    assert.equal(sender.getConfig().codeLength, 8);
    assert.equal(changes.at(-1)?.codeLength, 8);
});

test("shared notification channels retain their queue until every owner is disabled and reactivate without duplicate registration", async () => {
    const { runBootstrapScope } = await import("@cognis/core");
    const root = {};
    const preferenceStore = new VolatileNotificationPreferenceStore();
    preferenceStore.set("person", "shared", ["custom"]);
    const gateway = new CoreNotificationGateway(preferenceStore);
    let registrations = 0;
    let active = false;
    let sent = 0;
    gateway.registerSender({
        senderId: "custom",
        send: async () => {
            throw new Error("channel_unbound");
        },
        registerChannel: () => {
            registrations++;
            active = true;
            return Object.assign(
                () => {
                    active = false;
                },
                {
                    reactivate: () => {
                        active = true;
                    },
                    send: async () => {
                        assert.equal(active, true);
                        sent++;
                    },
                },
            );
        },
    });
    const scopes: Array<Array<import("@cognis/core").BootstrapDisposer>> = [
        [],
        [],
    ];
    for (const [index, owner] of ["gateway:first", "gateway:second"].entries())
        await runBootstrapScope(
            root,
            owner,
            async () => gateway.registerCategory("shared", "Shared"),
            (dispose) => scopes[index].push(dispose),
        );
    const message = {
        category: "shared",
        recipientUsername: "person",
        subject: "Subject",
        body: "Body",
    };
    assert.equal(registrations, 1);
    await scopes[0][0]();
    assert.equal((await gateway.dispatch(message)).errors, undefined);
    assert.equal(sent, 1);
    await scopes[1][0]();
    assert.equal(active, false);
    assert.equal(gateway.listCategories().length, 0);
    await scopes[0][0].reactivate!();
    await scopes[1][0].reactivate!();
    await gateway.dispatch(message);
    assert.equal(registrations, 1);
    assert.equal(sent, 2);
    await scopes[0][0]();
    assert.equal(active, true);
    await scopes[1][0]();
    assert.equal(active, false);
});

test("provider testing delegates through the neutral sender contract", async () => {
    const gateway = new CoreNotificationGateway(
        new VolatileNotificationPreferenceStore(),
    );
    const tested: unknown[] = [];
    gateway.registerSender({
        senderId: "custom",
        send: async () => {},
        test: async (...input) => {
            tested.push(input);
        },
    });
    await gateway.testSender("custom", "recipient@example.test", {
        endpoint: "configured",
    });
    assert.deepEqual(tested, [
        ["recipient@example.test", { endpoint: "configured" }],
    ]);
    await gateway.disableSender("custom");
    await assert.rejects(
        gateway.testSender("custom", "recipient@example.test"),
        /notification_sender_disabled/,
    );
    assert.equal(tested.length, 1);
});

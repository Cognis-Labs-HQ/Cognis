import test from "node:test";
import assert from "node:assert/strict";
import { DbNotificationStore } from "../notification-store.js";
import { NotificationTestDatabase } from "./reuse/database.js";

test("notification configuration round trips through the structured store contract", async () => {
    const database = new NotificationTestDatabase();
    const store = new DbNotificationStore(database);
    await store.ensureSchema();
    assert.equal(await store.getConfig("sender"), null);
    await store.saveConfig("sender", { enabled: true, port: 587 });
    assert.deepEqual(await store.getConfig("sender"), {
        enabled: true,
        port: 587,
    });
    await store.saveConfig("sender", { enabled: false });
    assert.deepEqual(await store.getConfig("sender"), { enabled: false });
});

test("notification configuration rejects a nontext persisted payload", async () => {
    const database = new NotificationTestDatabase();
    const store = new DbNotificationStore(database);
    await store.ensureSchema();
    await database.executeCommand({
        option: "INSERT",
        table: "notification_provider_configs",
        values: { sender_id: "sender", config_json: 123 },
    });
    await assert.rejects(
        store.getConfig("sender"),
        /invalid_notification_provider_config/,
    );
});

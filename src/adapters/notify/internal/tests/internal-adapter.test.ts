import test from "node:test";
import assert from "node:assert/strict";
import { InternalNotificationStore } from "../store.js";
import { AsyncInternalNotificationStore } from "../store.js";
import { createNotificationSender } from "../index.js";
import type { NotificationEnvelope } from "../../../../gateways/notify/gateway.js";

function makeEnvelope(
    recipientUsername: string,
    subject = "Test",
    body = "Body",
): NotificationEnvelope {
    return {
        category: "system",
        recipientUsername,
        subject,
        body,
    };
}

test("InternalNotificationStore: add and list", () => {
    const store = new InternalNotificationStore();
    store.add(makeEnvelope("alice", "Hello", "World"));
    const list = store.list("alice");
    assert.equal(list.length, 1);
    assert.equal(list[0].subject, "Hello");
    assert.equal(list[0].body, "World");
    assert.equal(list[0].read, false);
    assert.ok(typeof list[0].id === "string");
    assert.ok(typeof list[0].createdAt === "number");
});

test("InternalNotificationStore: countUnread", () => {
    const store = new InternalNotificationStore();
    store.add(makeEnvelope("bob", "One"));
    store.add(makeEnvelope("bob", "Two"));
    assert.equal(store.countUnread("bob"), 2);
});

test("InternalNotificationStore: markRead", () => {
    const store = new InternalNotificationStore();
    store.add(makeEnvelope("carol", "Msg"));
    const [notif] = store.list("carol");
    const found = store.markRead("carol", notif.id);
    assert.equal(found, true);
    assert.equal(store.countUnread("carol"), 0);
    assert.equal(store.list("carol")[0].read, true);
});

test("InternalNotificationStore: markRead returns false for unknown id", () => {
    const store = new InternalNotificationStore();
    store.add(makeEnvelope("dave", "Hi"));
    const found = store.markRead("dave", "nonexistent-id");
    assert.equal(found, false);
});

test("InternalNotificationStore: markAllRead", () => {
    const store = new InternalNotificationStore();
    store.add(makeEnvelope("eve", "A"));
    store.add(makeEnvelope("eve", "B"));
    store.add(makeEnvelope("eve", "C"));
    store.markAllRead("eve");
    assert.equal(store.countUnread("eve"), 0);
    store.list("eve").forEach((n) => assert.equal(n.read, true));
});

test("InternalNotificationStore: delete", () => {
    const store = new InternalNotificationStore();
    store.add(makeEnvelope("frank", "Keep"));
    store.add(makeEnvelope("frank", "Delete me"));
    const [first] = store.list("frank");
    const found = store.delete("frank", first.id);
    assert.equal(found, true);
    assert.equal(store.list("frank").length, 1);
    assert.equal(store.list("frank")[0].subject, "Keep");
});

test("InternalNotificationStore: delete returns false for unknown id", () => {
    const store = new InternalNotificationStore();
    store.add(makeEnvelope("grace", "Hi"));
    const found = store.delete("grace", "bogus-id");
    assert.equal(found, false);
    assert.equal(store.list("grace").length, 1);
});

test("InternalNotificationStore: isolates by username", () => {
    const store = new InternalNotificationStore();
    store.add(makeEnvelope("heidi", "For heidi"));
    store.add(makeEnvelope("ivan", "For ivan"));
    assert.equal(store.list("heidi").length, 1);
    assert.equal(store.list("ivan").length, 1);
    assert.equal(store.list("judy").length, 0);
});

test("InternalNotificationStore: respects MAX_PER_USER cap (50)", () => {
    const store = new InternalNotificationStore();
    for (let i = 0; i < 60; i++) {
        store.add(makeEnvelope("maxed", `Msg ${i}`));
    }
    assert.equal(store.list("maxed").length, 50);
    assert.equal(store.list("maxed")[0].subject, "Msg 59");
});

test("InternalNotificationStore: list returns a copy", () => {
    const store = new InternalNotificationStore();
    store.add(makeEnvelope("tester", "Copy test"));
    const list1 = store.list("tester");
    list1.splice(0, 1);
    assert.equal(store.list("tester").length, 1);
});

test("createNotificationSender: returns a sender with correct id", () => {
    const sender = createNotificationSender();
    assert.equal(sender.senderId, "internal");
    assert.equal(sender.senderName, "Internal (In-App)");
    assert.equal(typeof sender.isConfigured, "function");
    assert.equal(sender.isConfigured?.(), true);
});

test("createNotificationSender: send adds to store", async () => {
    const store = new AsyncInternalNotificationStore();
    const sender = createNotificationSender(store);
    await sender.send(makeEnvelope("testuser", "Live test", "Live body"));
    const list = await store.list("testuser");
    assert.equal(list.length, 1);
    assert.equal(list[0].subject, "Live test");
    assert.equal(list[0].body, "Live body");
    assert.equal(list[0].read, false);
});

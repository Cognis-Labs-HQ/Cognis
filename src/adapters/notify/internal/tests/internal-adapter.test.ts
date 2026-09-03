import test from "node:test";
import assert from "node:assert/strict";
import { InternalNotificationStore } from "../store.js";
import { AsyncInternalNotificationStore } from "../store.js";
import {
    createNotificationSender,
    createInternalNotificationSenderForTesting,
    getActiveStoreForTesting,
} from "../index.js";
import type { NotificationEnvelope } from "../../../../gateways/notify/gateway.js";
import { createInternalNotificationRoutes } from "../routes/index.js";
import {
    createAuthContext,
    RequestRecorder,
    ResponseRecorder,
} from "../../../../api/tests/reuse/route-test-helpers.js";

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

test("internal inbox route marks one notification read at the canonical URL", async () => {
    const store = new AsyncInternalNotificationStore();
    await store.add(makeEnvelope("route-user", "Shared item"));
    const [notification] = await store.list("route-user");
    const token = "route-token";
    const handler = createInternalNotificationRoutes(
        store,
        createAuthContext(
            new Map([[token, { sub: "route-user", role: "user" }]]),
        ),
    );
    const request = new RequestRecorder({ method: "PUT", token });
    const response = new ResponseRecorder();
    const handled = await handler(
        request,
        response,
        new URL(
            `http://localhost/api/v1/notify/inbox/${encodeURIComponent(notification.id)}/read`,
        ),
    );
    assert.equal(handled, true);
    assert.equal(response.statusCode, 200);
    assert.equal((await store.list("route-user"))[0].read, true);
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

test("InternalNotificationStore: deleteAll removes every notification for a user", () => {
    const store = new InternalNotificationStore();
    store.add(makeEnvelope("kate", "One"));
    store.add(makeEnvelope("kate", "Two"));
    store.add(makeEnvelope("kate", "Three"));
    store.add(makeEnvelope("leo", "Mine"));
    const removed = store.deleteAll("kate");
    assert.equal(removed, 3);
    assert.equal(store.list("kate").length, 0);
    assert.equal(store.list("leo").length, 1);
});

test("InternalNotificationStore: deleteAll returns 0 when user has no notifications", () => {
    const store = new InternalNotificationStore();
    const removed = store.deleteAll("nobody");
    assert.equal(removed, 0);
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

test("createInternalNotificationSenderForTesting: send adds to injected store", async () => {
    const store = new AsyncInternalNotificationStore();
    const sender = createInternalNotificationSenderForTesting(store);
    await sender.send(makeEnvelope("testuser", "Live test", "Live body"));
    const list = await store.list("testuser");
    assert.equal(list.length, 1);
    assert.equal(list[0].subject, "Live test");
    assert.equal(list[0].body, "Live body");
    assert.equal(list[0].read, false);
});

test("createNotificationSender: uses module activeStore when called with process.env", async () => {
    // Regression guard: the notify gateway's discoverSenders() always calls
    // factories as factory(process.env). The factory must not interpret arg-1
    // as a store override, or dispatch silently drops every notification.
    const sender = createNotificationSender(
        process.env as Record<string, string | undefined>,
    );
    await sender.send(makeEnvelope("env-arg-user", "Subject A", "Body A"));
    const stored = await getActiveStoreForTesting().list("env-arg-user");
    assert.equal(stored.length, 1);
    assert.equal(stored[0].subject, "Subject A");
});

test("call notifications render persistent answer and decline actions", async () => {
    const { readFile } = await import("node:fs/promises");
    const source = await readFile(
        new URL("../ui/navbar-plugin.js", import.meta.url),
        "utf8",
    );
    assert.match(source, /notif\.category === "calls"/);
    assert.match(source, /arrival-toast-answer btn-confirm/);
    assert.match(source, /arrival-toast-decline btn-cancel/);
    assert.match(source, /adapter\.notify\.internal\.answer_call/);
    assert.match(source, /adapter\.notify\.internal\.decline_call/);
    assert.match(source, /notification\.category !== "calls"/);
    assert.match(source, /cognis:room-call-state/);
});

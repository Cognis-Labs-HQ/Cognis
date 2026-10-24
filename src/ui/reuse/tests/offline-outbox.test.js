import test from "node:test";
import assert from "node:assert/strict";
import { createOfflineOutbox } from "../offline-outbox.js";

function fixture() {
    const values = new Map();
    let actor = { account: "learner", session: "test-token" };
    let disconnected = true;
    let allowed = true;
    let clock = 1_000_000;
    let lock = Promise.resolve();
    const settings = {
        identity: () => actor,
        enabled: () => true,
        offline: () => disconnected,
        allowed: () => allowed,
        storage: () => ({
            getItem: (key) => values.get(key) ?? null,
            setItem: (key, value) => values.set(key, value),
        }),
        withLock: (operation) => {
            const next = lock.then(operation);
            lock = next.catch(() => {});
            return next;
        },
        now: () => clock,
        log: () => {},
    };
    return {
        create: () => createOfflineOutbox(settings),
        values,
        reconnect: () => {
            disconnected = false;
        },
        disconnect: () => {
            disconnected = true;
        },
        changeAccount: (account) => {
            actor = { account, session: "new-token" };
        },
        deny: () => {
            allowed = false;
        },
        expire: () => {
            clock += 8 * 24 * 60 * 60 * 1000;
        },
    };
}
function register(outbox, send, owner = "practice") {
    const controller = new AbortController();
    outbox.register(owner, send, controller.signal);
    return controller;
}

test("durable activity survives a reload, preserves original values and never stores a token", async () => {
    const state = fixture();
    const first = state.create();
    register(first, () => assert.fail("offline transport"));
    const payload = {
        attempt: { id: "attempt", occurredAt: "2026-10-24T00:00:00Z" },
        grade: "good",
    };
    await first.submit("practice", "study.drawing:attempt", payload);
    assert.ok(![...state.values.values()].join("").includes("test-token"));
    const next = state.create();
    const delivered = [];
    register(next, async (value, id) => delivered.push({ value, id }));
    state.reconnect();
    assert.deepEqual(await next.flush(), { sent: 1, rejected: 0 });
    assert.deepEqual(delivered, [
        { value: payload, id: "study.drawing:attempt" },
    ]);
    assert.deepEqual(await next.pending("practice"), []);
});

test("receipt failures, account changes and provider disposal prevent unauthorized replay", async () => {
    const state = fixture();
    const outbox = state.create();
    let deliveries = 0;
    const controller = register(outbox, async () => {
        deliveries++;
    });
    await outbox.submit("practice", "first", {});
    state.reconnect();
    state.changeAccount("other");
    assert.equal((await outbox.flush()).sent, 0);
    state.changeAccount("learner");
    controller.abort();
    assert.equal((await outbox.flush()).sent, 0);
    register(outbox, async () => {
        deliveries++;
    });
    state.deny();
    await assert.rejects(
        outbox.submit("practice", "second", {}),
        /offline_delivery_unavailable/,
    );
    assert.equal((await outbox.flush()).sent, 0);
    assert.equal(deliveries, 0);
});

test("ambiguous failures retry the same operation; permanent rejections cannot block remaining activity", async () => {
    const state = fixture();
    const outbox = state.create();
    const applied = new Set();
    let fail = true;
    register(outbox, async (_payload, id) => {
        if (id === "denied")
            throw Object.assign(new Error("forbidden"), { status: 403 });
        applied.add(id);
        if (fail) {
            fail = false;
            throw new TypeError("response lost");
        }
    });
    await outbox.submit("practice", "accepted", {});
    await outbox.submit("practice", "denied", {});
    await outbox.submit("practice", "last", {});
    state.reconnect();
    assert.equal((await outbox.flush()).sent, 0);
    assert.deepEqual(await outbox.flush(), { sent: 2, rejected: 1 });
    assert.equal(applied.size, 2);
});

test("concurrent tabs serialize queue changes, coalesce duplicate activity and enforce storage bounds", async () => {
    const state = fixture();
    const first = state.create(),
        second = state.create();
    register(first, async () => {});
    register(second, async () => {});
    await Promise.all([
        first.submit("practice", "one", { grade: "good" }),
        second.submit("practice", "two", {}),
    ]);
    await first.submit("practice", "one", { grade: "good" });
    assert.equal((await first.pending("practice")).length, 2);
    await assert.rejects(
        first.submit("practice", "one", { grade: "again" }),
        /offline_delivery_conflict/,
    );
    await assert.rejects(
        first.submit("practice", "large", { text: "x".repeat(600_000) }),
        /offline_outbox_full/,
    );
    assert.equal((await second.pending("practice")).length, 2);
    state.expire();
    state.reconnect();
    assert.equal((await first.flush()).sent, 0);
});

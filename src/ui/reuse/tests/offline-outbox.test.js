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
    let deliveryLock = Promise.resolve();
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
        withDeliveryLock: (operation) => {
            const next = deliveryLock.then(operation);
            deliveryLock = next.catch(() => {});
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

test("slow delivery does not lock reads or overwrite writes from another tab", async () => {
    const state = fixture();
    const first = state.create();
    const second = state.create();
    let started;
    let release;
    const sending = new Promise((resolve) => {
        started = resolve;
    });
    const response = new Promise((resolve) => {
        release = resolve;
    });
    register(first, async () => {
        started();
        await response;
    });
    register(second, async () => {});
    await first.submit("practice", "first", {});
    state.reconnect();
    const flushing = first.flush();
    await sending;
    let readCompleted = false;
    const reading = second.pending("practice").then(() => {
        readCompleted = true;
    });
    let writeCompleted = false;
    const writing = second.submit("practice", "second", {}).then(() => {
        writeCompleted = true;
    });
    await new Promise((resolve) => setImmediate(resolve));
    try {
        assert.equal(
            readCompleted,
            true,
            "queue reads must not await network delivery",
        );
        assert.equal(
            writeCompleted,
            true,
            "another tab must be able to preserve edits",
        );
    } finally {
        release();
        await Promise.all([flushing, reading, writing]);
    }
    assert.deepEqual(
        (await first.pending("practice")).map(({ id }) => id),
        ["second"],
    );
});

test("separate delivery locks prevent two tabs from replaying the same queued action", async () => {
    const state = fixture();
    const first = state.create();
    const second = state.create();
    let sent = 0;
    register(first, async () => {
        sent++;
    });
    register(second, async () => {
        sent++;
    });
    await first.submit("practice", "one", {});
    state.reconnect();
    const results = await Promise.all([first.flush(), second.flush()]);
    assert.equal(sent, 1);
    assert.equal(
        results.reduce((sum, result) => sum + result.sent, 0),
        1,
    );
    assert.equal(first.hasBufferedChanges(), false);
});

test("background records replay without arming the close warning, including after provider disposal or reload", async () => {
    const state = fixture();
    const first = state.create();
    const controller = new AbortController();
    first.register("telemetry", async () => {}, controller.signal, {
        protectOnClose: false,
    });
    await first.submit("telemetry", "navigation", { action: "navigate" });
    assert.equal(first.hasBufferedChanges(), false);
    assert.equal((await first.pending("telemetry")).length, 1);
    controller.abort();
    assert.equal(first.hasBufferedChanges(), false);
    const next = state.create();
    let delivered = 0;
    next.register(
        "telemetry",
        async () => {
            delivered++;
        },
        new AbortController().signal,
        { protectOnClose: false },
    );
    register(next, async () => {}, "messages");
    await next.submit("messages", "message", { ciphertext: "encrypted" });
    assert.equal(next.hasBufferedChanges(), true);
    state.reconnect();
    assert.equal((await next.flush()).sent, 2);
    assert.equal(delivered, 1);
    assert.equal(next.hasBufferedChanges(), false);
});

test("registered background owners classify existing records without weakening unknown user-data owners", async () => {
    const state = fixture();
    state.values.set(
        "cognis_offline_outbox",
        JSON.stringify([
            {
                account: "learner",
                owner: "telemetry",
                id: "legacy",
                payload: {},
                createdAt: 1_000_000,
            },
        ]),
    );
    const outbox = state.create();
    assert.equal(outbox.hasBufferedChanges(), true);
    outbox.register("telemetry", async () => {}, new AbortController().signal, {
        protectOnClose: false,
    });
    assert.equal(outbox.hasBufferedChanges(), false);
});

import test from "node:test";
import assert from "node:assert/strict";
import { CallStore } from "../store.js";

const participants = [
    { accountId: "caller", handle: "caller", displayName: "Caller" },
    { accountId: "callee", handle: "callee", displayName: "Callee" },
];

test("calls ring until another room participant answers or hangs up", () => {
    const store = new CallStore();
    const call = store.create({
        roomId: "room-1",
        callerAccountId: "caller",
        participants,
    });
    assert.equal(call.status, "ringing");
    assert.equal(store.answer(call.id, "caller"), null);
    assert.equal(store.answer(call.id, "callee")?.status, "active");
    assert.equal(store.hangup(call.id, "caller")?.status, "ended");
});

test("call access is limited to snapshotted room participants", () => {
    const store = new CallStore();
    const call = store.create({
        roomId: "room-1",
        callerAccountId: "caller",
        participants,
    });
    assert.equal(store.hasParticipant(call, "callee"), true);
    assert.equal(store.hasParticipant(call, "outsider"), false);
    assert.equal(store.hangup(call.id, "outsider"), null);
});

test("unanswered calls expire after the ringing timeout", (testContext) => {
    let now = 1_000;
    testContext.mock.method(Date, "now", () => now);
    const store = new CallStore();
    const call = store.create({
        roomId: "room-1",
        callerAccountId: "caller",
        participants,
    });
    now = call.expiresAt + 1;
    assert.equal(store.get(call.id)?.status, "expired");
    assert.equal(store.answer(call.id, "callee"), null);
});

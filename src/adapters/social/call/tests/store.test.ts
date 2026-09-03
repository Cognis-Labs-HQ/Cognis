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
    const ended = store.hangup(call.id, "caller");
    assert.equal(ended?.status, "ended");
    assert.equal(ended?.endedBy, "caller");
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

test("the current room call reports ringing and active calls only", () => {
    const store = new CallStore();
    const call = store.create({
        roomId: "room-1",
        callerAccountId: "caller",
        participants,
    });
    assert.equal(store.getCurrentRoomCall("room-1")?.id, call.id);
    store.answer(call.id, "callee");
    assert.equal(store.getCurrentRoomCall("room-1")?.status, "active");
    store.hangup(call.id, "caller");
    assert.equal(store.getCurrentRoomCall("room-1"), null);
});

test("one answer starts a group call and the final departure releases it", () => {
    const store = new CallStore();
    const call = store.create({
        roomId: "room-1",
        callerAccountId: "caller",
        participants: [
            ...participants,
            { accountId: "third", handle: "third", displayName: "Third" },
        ],
    });
    assert.equal(store.answer(call.id, "callee")?.status, "active");
    assert.deepEqual(call.joinedAccountIds, ["caller", "callee"]);
    assert.equal(store.answer(call.id, "third")?.status, "active");
    assert.deepEqual(call.joinedAccountIds, ["caller", "callee", "third"]);
    assert.equal(store.leave(call.id, "callee")?.status, "active");
    assert.equal(store.leave(call.id, "third")?.status, "active");
    assert.equal(store.leave(call.id, "caller")?.status, "ended");
    assert.equal(store.getCurrentRoomCall("room-1"), null);
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

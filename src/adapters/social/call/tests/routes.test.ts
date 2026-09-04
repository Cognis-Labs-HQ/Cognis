import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { CallStore } from "../store.js";
import { createCallRoutes } from "../routes/index.js";

function request(method: string, body?: object) {
    const req = Readable.from(
        body ? [JSON.stringify(body)] : [],
    ) as Readable & {
        method: string;
    };
    req.method = method;
    return req;
}

function response() {
    let status = 0;
    let payload = "";
    return {
        res: {
            writeHead(value: number) {
                status = value;
            },
            end(value = "") {
                payload = String(value);
            },
        },
        result: () => ({
            status,
            payload: payload ? JSON.parse(payload) : null,
        }),
    };
}

const roomContext = {
    room: { id: "room-1", kind: "dm", title: "" },
    participants: [
        { accountId: "caller", handle: "caller", displayName: "Caller" },
        { accountId: "callee", handle: "callee", displayName: "Callee" },
    ],
};

test("call creation validates membership and dispatches localized actions", async () => {
    const notifications: Array<{
        actionUrl?: string;
        category: string;
        metadata?: Record<string, unknown>;
    }> = [];
    const roomEvents: Array<{
        eventType: string;
        details?: Record<string, unknown>;
    }> = [];
    const route = createCallRoutes(
        new CallStore(),
        {
            requireAuth: () => ({ sub: "caller", role: "user" }),
        } as never,
        async () => roomContext,
        async (notification) => notifications.push(notification),
        async (event) => roomEvents.push(event),
        {
            en: {
                incomingCall: "Incoming Call...",
                incomingCallFrom: "{{user}} is calling",
            },
            de: {
                incomingCall: "Eingehender Anruf…",
                incomingCallFrom: "{{user}} ruft an",
            },
        },
    );
    const recorder = response();
    assert.equal(
        await route(
            request("POST", { roomId: "room-1" }) as never,
            recorder.res as never,
            new URL("http://localhost/api/v1/social/call"),
        ),
        true,
    );
    assert.equal(recorder.result().status, 201);
    assert.equal(notifications.length, 1);
    assert.equal(notifications[0].category, "calls");
    assert.match(notifications[0].actionUrl ?? "", /answer=1/);
    assert.deepEqual(notifications[0].metadata?.localizedText, {
        en: { subject: "Incoming Call...", body: "Caller is calling" },
        de: { subject: "Eingehender Anruf…", body: "Caller ruft an" },
    });
    assert.deepEqual(
        roomEvents.map((event) => event.eventType),
        ["call_started"],
    );
    assert.equal(typeof roomEvents[0].details?.callId, "string");
    assert.equal(roomEvents[0].details?.callerAccountId, "caller");
});

test("call creation rejects rooms the Messages capability does not authorize", async () => {
    const route = createCallRoutes(
        new CallStore(),
        {
            requireAuth: () => ({ sub: "outsider", role: "user" }),
        } as never,
        async () => null,
    );
    const recorder = response();
    await route(
        request("POST", { roomId: "room-1" }) as never,
        recorder.res as never,
        new URL("http://localhost/api/v1/social/call"),
    );
    assert.equal(recorder.result().status, 403);
    assert.equal(recorder.result().payload.error.code, "call_not_allowed");
});

test("call operations revalidate current room membership", async () => {
    const store = new CallStore();
    const call = store.create({
        roomId: "room-1",
        callerAccountId: "caller",
        participants: roomContext.participants,
    });
    const route = createCallRoutes(
        store,
        {
            requireAuth: () => ({ sub: "callee", role: "user" }),
        } as never,
        async () => null,
    );
    for (const operation of ["", "/answer", "/hangup", "/leave"]) {
        const recorder = response();
        await route(
            request(operation ? "POST" : "GET") as never,
            recorder.res as never,
            new URL(
                `http://localhost/api/v1/social/call/${call.id}${operation}`,
            ),
        );
        assert.equal(recorder.result().status, 404);
    }
});

test("room lookup returns the existing call without creating crossed invitations", async () => {
    const store = new CallStore();
    const call = store.create({
        roomId: "room-1",
        callerAccountId: "caller",
        participants: roomContext.participants,
    });
    const route = createCallRoutes(
        store,
        {
            requireAuth: () => ({ sub: "callee", role: "user" }),
        } as never,
        async () => roomContext,
    );
    const lookup = response();
    await route(
        request("GET") as never,
        lookup.res as never,
        new URL("http://localhost/api/v1/social/call/room/room-1"),
    );
    assert.equal(lookup.result().status, 200);
    assert.equal(lookup.result().payload.data.id, call.id);

    const create = response();
    await route(
        request("POST", { roomId: "room-1" }) as never,
        create.res as never,
        new URL("http://localhost/api/v1/social/call"),
    );
    assert.equal(create.result().status, 200);
    assert.equal(create.result().payload.data.id, call.id);
});

test("ringing endpoint grants one authenticated per-user lease", async () => {
    const store = new CallStore();
    const call = store.create({
        roomId: "room-1",
        callerAccountId: "caller",
        participants: roomContext.participants,
    });
    const route = createCallRoutes(
        store,
        {
            requireAuth: () => ({ sub: "callee", role: "user" }),
        } as never,
        async () => roomContext,
    );
    const first = response();
    await route(
        request("POST", { ringerId: "tab-a" }) as never,
        first.res as never,
        new URL(`http://localhost/api/v1/social/call/${call.id}/ringing`),
    );
    assert.equal(first.result().payload.data.ringing, true);

    const duplicate = response();
    await route(
        request("POST", { ringerId: "tab-b" }) as never,
        duplicate.res as never,
        new URL(`http://localhost/api/v1/social/call/${call.id}/ringing`),
    );
    assert.equal(duplicate.result().payload.data.ringing, false);
});

test("ringing endpoint is idempotent after a call is no longer active", async () => {
    const store = new CallStore();
    const call = store.create({
        roomId: "room-1",
        callerAccountId: "caller",
        participants: roomContext.participants,
    });
    store.hangup(call.id, "caller");
    const route = createCallRoutes(
        store,
        {
            requireAuth: () => ({ sub: "callee", role: "user" }),
        } as never,
        async () => roomContext,
    );
    for (const body of [
        { ringerId: "tab-a" },
        { ringerId: "tab-a", active: false },
    ]) {
        const recorder = response();
        await route(
            request("POST", body) as never,
            recorder.res as never,
            new URL(`http://localhost/api/v1/social/call/${call.id}/ringing`),
        );
        assert.equal(recorder.result().status, 200);
        assert.equal(recorder.result().payload.data.ringing, false);
    }
});

test("leave endpoint is idempotent after a call is no longer active", async () => {
    const store = new CallStore();
    const call = store.create({
        roomId: "room-1",
        callerAccountId: "caller",
        participants: roomContext.participants,
    });
    store.answer(call.id, "callee");
    store.hangup(call.id, "caller");
    const route = createCallRoutes(
        store,
        {
            requireAuth: () => ({ sub: "callee", role: "user" }),
        } as never,
        async () => roomContext,
    );
    const recorder = response();
    await route(
        request("POST") as never,
        recorder.res as never,
        new URL(`http://localhost/api/v1/social/call/${call.id}/leave`),
    );
    assert.equal(recorder.result().status, 200);
    assert.equal(recorder.result().payload.data.status, "ended");
});

test("a released group call can ring every participant again", async () => {
    const store = new CallStore();
    const groupRoom = {
        ...roomContext,
        room: { ...roomContext.room, kind: "group" },
        participants: [
            ...roomContext.participants,
            { accountId: "third", handle: "third", displayName: "Third" },
        ],
    };
    const notifications: string[] = [];
    const route = createCallRoutes(
        store,
        {
            requireAuth: () => ({ sub: "caller", role: "user" }),
        } as never,
        async () => groupRoom,
        async (notification) => {
            notifications.push(notification.recipientUsername);
        },
    );
    const previous = store.create({
        roomId: "room-1",
        callerAccountId: "caller",
        participants: groupRoom.participants,
    });
    store.answer(previous.id, "callee");
    store.leave(previous.id, "callee");
    store.leave(previous.id, "caller");
    const recorder = response();
    await route(
        request("POST", { roomId: "room-1" }) as never,
        recorder.res as never,
        new URL("http://localhost/api/v1/social/call"),
    );
    assert.equal(recorder.result().status, 201);
    assert.notEqual(recorder.result().payload.data.id, previous.id);
    assert.deepEqual(notifications.sort(), ["callee", "third"]);
});

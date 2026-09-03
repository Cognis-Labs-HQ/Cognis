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

test("call creation validates room membership and dispatches an answer action", async () => {
    const notifications: Array<{ actionUrl?: string; category: string }> = [];
    const route = createCallRoutes(
        new CallStore(),
        {
            requireAuth: () => ({ sub: "caller", role: "user" }),
        } as never,
        async () => roomContext,
        async (notification) => notifications.push(notification),
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

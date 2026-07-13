import test from "node:test";
import assert from "node:assert/strict";
import { createMessagesRoutes } from "../routes/index.js";
import { issueAccessToken } from "../../../../gateways/auth/access-tokens.js";
import { createDefaultRouteContext } from "../../../../api/reuse/route-context.js";

function makeReq(method: string, token: string, body?: string) {
    return {
        method,
        headers: { authorization: "Bearer " + token },
        [Symbol.asyncIterator]: async function* () {
            if (body) yield Buffer.from(body);
        },
    } as any;
}

function makeRes() {
    const res: any = {
        statusCode: 0,
        body: "",
        writeHead(code: number) {
            this.statusCode = code;
        },
        end(body?: string) {
            this.body = body ?? "";
        },
    };
    return res;
}

function makeRoutes({
    shareToken,
    meeting,
    room,
}: {
    shareToken: {
        resourceType: string;
        resourceId: string;
        grantedCapabilities?: string[];
    } | null;
    meeting: { chatRoomId?: string | null } | null;
    room: { id: string; kind: string } | null;
}) {
    const messagesStore = {
        async getRoom(id: string) {
            return room && room.id === id ? room : null;
        },
        async getMember() {
            return null;
        },
        async getUnwrappedRoomKey(roomId: string) {
            return room && room.id === roomId ? "deadbeefcafe" : null;
        },
        async getPendingIncomingRoomMessageRequest() {
            return null;
        },
        async getPendingRoomMessageRequest() {
            return null;
        },
        async listMembers() {
            return [];
        },
    };
    const capabilities: Record<string, (...args: any[]) => any> = {
        "share:getTokenById": async () => shareToken,
        "jitsi-meet:getMeetingById": async () => meeting,
        "share:getGuestProfile": async () => null,
    };
    const routeContext = createDefaultRouteContext({
        getCapability: (id: string) => capabilities[id] as any,
    });

    return createMessagesRoutes({
        messagesStore: messagesStore as any,
        profileStore: {} as any,
        dispatch: null,
        isAdapterEnabled: () => true,
        routeContext,
    });
}

function issueGuestToken() {
    return issueAccessToken("share:share-1:guest-1", "user", 60, {
        providerId: "share",
        purpose: "share",
    });
}

test("share guest with chat:read capability can read the room key", async () => {
    const routes = makeRoutes({
        shareToken: {
            resourceType: "meeting",
            resourceId: "meeting-1",
            grantedCapabilities: [
                "meeting:join",
                "participants:read",
                "chat:read",
            ],
        },
        meeting: { chatRoomId: "room-1" },
        room: { id: "room-1", kind: "group" },
    });

    const req = makeReq("GET", issueGuestToken());
    const res = makeRes();
    const url = new URL(
        "http://localhost/api/v1/social/messages/rooms/room-1/key",
    );

    const handled = await routes(req, res, url);

    assert.equal(handled, true);
    assert.equal(res.statusCode, 200);
    const payload = JSON.parse(res.body);
    assert.equal(payload.data.key, "deadbeefcafe");
});

test("share guest with chat:read capability can read a classroom room key", async () => {
    const routes = makeRoutes({
        shareToken: {
            resourceType: "meeting",
            resourceId: "meeting-1",
            grantedCapabilities: [
                "meeting:join",
                "participants:read",
                "chat:read",
            ],
        },
        meeting: { chatRoomId: "room-1" },
        room: { id: "room-1", kind: "classroom" },
    });

    const req = makeReq("GET", issueGuestToken());
    const res = makeRes();
    const url = new URL(
        "http://localhost/api/v1/social/messages/rooms/room-1/key",
    );

    const handled = await routes(req, res, url);

    assert.equal(handled, true);
    assert.equal(res.statusCode, 200);
    const payload = JSON.parse(res.body);
    assert.equal(payload.data.key, "deadbeefcafe");
});

test("share guest with meeting:join capability can read the meeting room key", async () => {
    const routes = makeRoutes({
        shareToken: {
            resourceType: "meeting",
            resourceId: "meeting-1",
            grantedCapabilities: ["meeting:join"],
        },
        meeting: { chatRoomId: "room-1" },
        room: { id: "room-1", kind: "group" },
    });

    const req = makeReq("GET", issueGuestToken());
    const res = makeRes();
    const url = new URL(
        "http://localhost/api/v1/social/messages/rooms/room-1/key",
    );

    const handled = await routes(req, res, url);

    assert.equal(handled, true);
    assert.equal(res.statusCode, 200);
    const payload = JSON.parse(res.body);
    assert.equal(payload.data.key, "deadbeefcafe");
});

test("share guest without meeting chat access is forbidden from the room key", async () => {
    const routes = makeRoutes({
        shareToken: {
            resourceType: "meeting",
            resourceId: "meeting-1",
            grantedCapabilities: ["participants:read"],
        },
        meeting: { chatRoomId: "room-1" },
        room: { id: "room-1", kind: "group" },
    });

    const req = makeReq("GET", issueGuestToken());
    const res = makeRes();
    const url = new URL(
        "http://localhost/api/v1/social/messages/rooms/room-1/key",
    );

    const handled = await routes(req, res, url);

    assert.equal(handled, true);
    assert.equal(res.statusCode, 403);
});

test("share guest for an unrelated room is rejected as not a member", async () => {
    const routes = makeRoutes({
        shareToken: {
            resourceType: "meeting",
            resourceId: "meeting-1",
            grantedCapabilities: ["meeting:join", "chat:read"],
        },
        meeting: { chatRoomId: "room-1" },
        room: { id: "room-2", kind: "group" },
    });

    const req = makeReq("GET", issueGuestToken());
    const res = makeRes();
    const url = new URL(
        "http://localhost/api/v1/social/messages/rooms/room-2/key",
    );

    const handled = await routes(req, res, url);

    assert.equal(handled, true);
    assert.equal(res.statusCode, 403);
});

test("share guest with chat:write capability can post room messages", async () => {
    const routes = makeRoutes({
        shareToken: {
            resourceType: "meeting",
            resourceId: "meeting-1",
            grantedCapabilities: ["meeting:join", "chat:read", "chat:write"],
        },
        meeting: { chatRoomId: "room-1" },
        room: { id: "room-1", kind: "group" },
    });

    const req = makeReq(
        "POST",
        issueGuestToken(),
        JSON.stringify({ ciphertext: "cafe", iv: "beef" }),
    );
    const res = makeRes();
    const url = new URL(
        "http://localhost/api/v1/social/messages/rooms/room-1/messages",
    );

    const handled = await routes(req, res, url);

    assert.equal(handled, true);
    // No send-message flow is wired in this test harness, so a guest who is
    // actually allowed to post reaches the "flow unavailable" branch (503)
    // rather than being rejected outright with 403.
    assert.equal(res.statusCode, 503);
});

test("share guest with meeting:join capability can post room messages", async () => {
    const routes = makeRoutes({
        shareToken: {
            resourceType: "meeting",
            resourceId: "meeting-1",
            grantedCapabilities: ["meeting:join", "chat:read"],
        },
        meeting: { chatRoomId: "room-1" },
        room: { id: "room-1", kind: "group" },
    });

    const req = makeReq(
        "POST",
        issueGuestToken(),
        JSON.stringify({ ciphertext: "cafe", iv: "beef" }),
    );
    const res = makeRes();
    const url = new URL(
        "http://localhost/api/v1/social/messages/rooms/room-1/messages",
    );

    const handled = await routes(req, res, url);

    assert.equal(handled, true);
    // No send-message flow is wired in this test harness, so a guest who is
    // actually allowed to post reaches the "flow unavailable" branch (503)
    // rather than being rejected outright with 403.
    assert.equal(res.statusCode, 503);
});

import test from "node:test";
import assert from "node:assert/strict";
import { createMessagesRoutes } from "../routes/index.js";
import { issueAccessToken } from "../../../../gateways/auth/access-tokens.js";

function makeReq(method: string, token: string | null) {
    const headers = token ? { authorization: "Bearer " + token } : {};
    return {
        method,
        headers,
        [Symbol.asyncIterator]: async function* () {},
    } as any;
}

test("POST /messages/requests/:id/approve reactivates archived DM members", async () => {
    const token = issueAccessToken("bob", "user", 60);
    const unarchived: Array<{
        roomId: string;
        accountId: string;
        archived: boolean;
    }> = [];
    const messagesStore = {
        async getMessageRequest(requestId: string) {
            if (requestId !== "req-1") return null;
            return {
                id: "req-1",
                fromAccountId: "alice",
                toAccountId: "bob",
                status: "pending",
                roomId: "room-1",
            };
        },
        async getRoom(roomId: string) {
            if (roomId !== "room-1") return null;
            return { id: "room-1", kind: "dm", title: null, avatarKey: null };
        },
        async findDmBetween() {
            return null;
        },
        async createRoom() {
            return { id: "unexpected-room", kind: "dm" };
        },
        async addMemberWithEvent() {},
        async generateAndStoreRoomKey() {},
        async setArchived(
            roomId: string,
            accountId: string,
            archived: boolean,
        ) {
            unarchived.push({ roomId, accountId, archived });
        },
        async updateMessageRequestStatus() {},
        async approvePendingRequestsBetween() {},
        async appendRoomEvent() {},
    };
    const profileStore = {
        async getProfile(accountId: string) {
            return {
                accountId,
                handle: accountId,
                displayName: accountId,
                visibility: "community",
            };
        },
        async isBlocked() {
            return false;
        },
    };
    const route = createMessagesRoutes({
        messagesStore: messagesStore as any,
        profileStore: profileStore as any,
        dispatch: null,
        isAdapterEnabled: () => true,
    });
    let statusCode = 0;
    let responseBody = "";

    const handled = await route(
        makeReq("POST", token),
        {
            writeHead(status: number) {
                statusCode = status;
            },
            end(payload: string) {
                responseBody = payload;
            },
        } as any,
        new URL(
            "http://localhost/api/v1/social/messages/requests/req-1/approve",
        ),
    );

    assert.equal(handled, true);
    assert.equal(statusCode, 200);
    assert.match(responseBody, /"room-1"/);
    assert.deepEqual(unarchived, [
        { roomId: "room-1", accountId: "alice", archived: false },
        { roomId: "room-1", accountId: "bob", archived: false },
    ]);
});

test("POST /messages/rooms reactivates archived members for existing DMs", async () => {
    const token = issueAccessToken("alice", "user", 60);
    const unarchived: Array<{
        roomId: string;
        accountId: string;
        archived: boolean;
    }> = [];
    const messagesStore = {
        async findDmBetween() {
            return { id: "room-existing", kind: "dm", createdBy: "alice" };
        },
        async setArchived(
            roomId: string,
            accountId: string,
            archived: boolean,
        ) {
            unarchived.push({ roomId, accountId, archived });
        },
        async hasApprovedMessageRequestBetween() {
            return false;
        },
    };
    const profileStore = {
        async getProfile(accountId: string) {
            return {
                accountId,
                handle: accountId,
                displayName: accountId,
                visibility: "community",
            };
        },
        async getProfileByHandle(handle: string) {
            if (handle !== "bob") return null;
            return {
                accountId: "bob",
                handle: "bob",
                displayName: "Bob",
                visibility: "community",
            };
        },
        async isBlocked() {
            return false;
        },
        async isFollowing() {
            return true;
        },
    };
    const route = createMessagesRoutes({
        messagesStore: messagesStore as any,
        profileStore: profileStore as any,
        dispatch: null,
        isAdapterEnabled: () => true,
    });
    let statusCode = 0;
    let responseBody = "";
    const req = makeReq("POST", token);
    req[Symbol.asyncIterator] = async function* () {
        yield Buffer.from(JSON.stringify({ handles: ["bob"] }));
    };

    const handled = await route(
        req,
        {
            writeHead(status: number) {
                statusCode = status;
            },
            end(payload: string) {
                responseBody = payload;
            },
        } as any,
        new URL("http://localhost/api/v1/social/messages/rooms"),
    );

    assert.equal(handled, true);
    assert.equal(statusCode, 200);
    assert.match(responseBody, /room-existing/);
    assert.deepEqual(unarchived, [
        { roomId: "room-existing", accountId: "alice", archived: false },
        { roomId: "room-existing", accountId: "bob", archived: false },
    ]);
});

test("concurrent direct-room requests create only one room", async () => {
    const token = issueAccessToken("alice", "user", 60);
    let createdRoom: { id: string; kind: string } | null = null;
    let createCount = 0;
    const messagesStore = {
        async findDmBetween() {
            return createdRoom;
        },
        async createDm() {
            createCount += 1;
            await new Promise((resolve) => setTimeout(resolve, 10));
            createdRoom = { id: "room-only", kind: "dm" };
            return createdRoom;
        },
        async addMemberWithEvent() {},
        async generateAndStoreRoomKey() {},
        async approvePendingRequestsBetween() {},
        async hasApprovedMessageRequestBetween() {
            return false;
        },
    };
    const profileStore = {
        async getProfile(accountId: string) {
            return {
                accountId,
                handle: accountId,
                displayName: accountId,
                visibility: "community",
            };
        },
        async getProfileByHandle(handle: string) {
            return handle === "bob"
                ? {
                      accountId: "bob",
                      handle: "bob",
                      displayName: "Bob",
                      visibility: "community",
                  }
                : null;
        },
        async isBlocked() {
            return false;
        },
        async isFollowing() {
            return true;
        },
    };
    const route = createMessagesRoutes({
        messagesStore: messagesStore as any,
        profileStore: profileStore as any,
        dispatch: null,
        isAdapterEnabled: () => true,
    });
    const invoke = async () => {
        const request = makeReq("POST", token);
        request[Symbol.asyncIterator] = async function* () {
            yield Buffer.from(JSON.stringify({ handles: ["bob"] }));
        };
        let responseBody = "";
        await route(
            request,
            {
                writeHead() {},
                end(payload: string) {
                    responseBody = payload;
                },
            } as any,
            new URL("http://localhost/api/v1/social/messages/rooms"),
        );
        return responseBody;
    };

    const responses = await Promise.all([invoke(), invoke(), invoke()]);

    assert.equal(createCount, 1);
    assert.ok(responses.every((body) => body.includes("room-only")));
});

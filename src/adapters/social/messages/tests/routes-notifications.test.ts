import test from "node:test";
import assert from "node:assert/strict";
import { createMessagesRoutes } from "../routes.js";
import { issueAccessToken } from "../../../../gateways/auth/access-tokens.js";

function makeReq(method: string, token: string | null) {
    return {
        method,
        headers: token ? { authorization: "Bearer " + token } : {},
        [Symbol.asyncIterator]: async function* () {},
    } as any;
}

test("POST /messages/rooms sends a message-request notification for pending DMs", async () => {
    const token = issueAccessToken("alice", "user", 60);
    const dispatched: Array<Record<string, unknown>> = [];
    const messagesStore = {
        async hasApprovedMessageRequestBetween() {
            return false;
        },
        async findDmBetween() {
            return null;
        },
        async createRoom() {
            return {
                id: "room-req-1",
                kind: "dm",
                title: null,
                avatarKey: null,
            };
        },
        async addMember() {},
        async generateAndStoreRoomKey() {},
        async appendRoomEvent() {},
        async findPendingMessageRequest() {
            return null;
        },
        async createMessageRequest() {
            return {
                id: "req-1",
                status: "pending",
            };
        },
    };
    const profileStore = {
        async isBlocked() {
            return false;
        },
        async getProfileByHandle(handle: string) {
            if (handle === "bob") {
                return {
                    accountId: "bob",
                    handle: "bob",
                    displayName: "Bob",
                    visibility: "community",
                };
            }
            return null;
        },
        async getProfile(accountId: string) {
            if (accountId === "alice") {
                return {
                    accountId: "alice",
                    handle: "alice",
                    displayName: "Alice",
                    visibility: "community",
                };
            }
            if (accountId === "bob") {
                return {
                    accountId: "bob",
                    handle: "bob",
                    displayName: "Bob",
                    visibility: "community",
                };
            }
            return null;
        },
        async isFollowing() {
            return false;
        },
    };
    const route = createMessagesRoutes({
        messagesStore: messagesStore as any,
        profileStore: profileStore as any,
        dispatch: async (envelope: Record<string, unknown>) => {
            dispatched.push(envelope);
            return { dispatched: ["bob"] };
        },
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
        new URL("http://localhost/api/v1/messages/rooms"),
    );

    assert.equal(handled, true);
    assert.equal(statusCode, 202);
    assert.equal(JSON.parse(responseBody).data.requestId, "req-1");
    assert.equal(dispatched.length, 1);
    assert.equal(dispatched[0].subject, "New message request");
    assert.equal(dispatched[0].recipientUsername, "bob");
    assert.deepEqual(dispatched[0].metadata, {
        roomId: "room-req-1",
        requestId: "req-1",
    });
});

test("POST /messages/rooms/:id/messages skips notifications when recipient has pending incoming request", async () => {
    const token = issueAccessToken("alice", "user", 60);
    const dispatched: Array<Record<string, unknown>> = [];
    const messagesStore = {
        async getRoom(roomId: string) {
            assert.equal(roomId, "room-1");
            return { id: roomId, kind: "dm", title: null, avatarKey: null };
        },
        async getMember(roomId: string, accountId: string) {
            if (roomId !== "room-1") return null;
            if (accountId === "alice") {
                return {
                    roomId,
                    accountId,
                    role: "owner",
                    muted: false,
                    archived: false,
                };
            }
            if (accountId === "bob") {
                return {
                    roomId,
                    accountId,
                    role: "member",
                    muted: false,
                    archived: false,
                };
            }
            return null;
        },
        async getPendingIncomingRoomMessageRequest(
            roomId: string,
            toAccountId: string,
        ) {
            if (roomId !== "room-1") return null;
            if (toAccountId === "bob") {
                return {
                    id: "req-1",
                    roomId: "room-1",
                    fromAccountId: "alice",
                    toAccountId: "bob",
                    status: "pending",
                    note: null,
                    createdAt: new Date().toISOString(),
                    respondedAt: null,
                };
            }
            return null;
        },
        async getPendingRoomMessageRequest() {
            return null;
        },
        async appendMessage() {
            return {
                id: "msg-1",
                chatroomId: "room-1",
                senderId: "alice",
                ciphertext: "cipher",
                iv: "iv",
                authTag: "",
                contentType: "text/plain",
                createdAt: new Date().toISOString(),
            };
        },
        async setTyping() {},
        async listMembers() {
            return [
                {
                    roomId: "room-1",
                    accountId: "alice",
                    role: "owner",
                    muted: false,
                    archived: false,
                },
                {
                    roomId: "room-1",
                    accountId: "bob",
                    role: "member",
                    muted: false,
                    archived: false,
                },
            ];
        },
    };
    const profileStore = {
        async getProfile(accountId: string) {
            if (accountId === "alice") {
                return {
                    accountId: "alice",
                    handle: "alice",
                    displayName: "Alice",
                    visibility: "community",
                };
            }
            if (accountId === "bob") {
                return {
                    accountId: "bob",
                    handle: "bob",
                    displayName: "Bob",
                    visibility: "community",
                };
            }
            return null;
        },
    };
    const route = createMessagesRoutes({
        messagesStore: messagesStore as any,
        profileStore: profileStore as any,
        dispatch: async (envelope: Record<string, unknown>) => {
            dispatched.push(envelope);
            return { dispatched: ["bob"] };
        },
        isAdapterEnabled: () => true,
    });
    let statusCode = 0;
    let responseBody = "";
    const req = makeReq("POST", token);
    req[Symbol.asyncIterator] = async function* () {
        yield Buffer.from(
            JSON.stringify({
                ciphertext: "aa",
                iv: "bb",
                authTag: "",
                contentType: "text/plain",
            }),
        );
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
        new URL("http://localhost/api/v1/messages/rooms/room-1/messages"),
    );

    assert.equal(handled, true);
    assert.equal(statusCode, 201);
    assert.equal(JSON.parse(responseBody).data.id, "msg-1");
    assert.equal(dispatched.length, 0);
});

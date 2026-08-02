import test from "node:test";
import assert from "node:assert/strict";
import { VolatileProfileStore } from "../../profile/store-contract.js";
import {
    canMessage,
    canSendMessageRequest,
    canDirectMessageNowOrByApprovedRequest,
    createMessagesRoutes,
} from "../routes/index.js";
import { issueAccessToken } from "../../../../gateways/auth/access-tokens.js";

function makeReq(method: string, token: string | null) {
    return {
        method,
        headers: token ? { authorization: `Bearer ${token}` } : {},
        [Symbol.asyncIterator]: async function* () {},
    } as any;
}

test("canMessage allows mutual followers", async () => {
    const profileStore = new VolatileProfileStore();
    await profileStore.createProfile("alice", "alice", "user");
    await profileStore.createProfile("bob", "bob", "user");
    await profileStore.updateProfile("alice", { visibility: "community" });
    await profileStore.updateProfile("bob", { visibility: "community" });
    await profileStore.follow("alice", "bob");
    await profileStore.follow("bob", "alice");

    const allowed = await canMessage(profileStore as any, "alice", "bob");
    assert.equal(allowed, true);
});

test("canMessage blocks one-way follow", async () => {
    const profileStore = new VolatileProfileStore();
    await profileStore.createProfile("alice", "alice", "user");
    await profileStore.createProfile("bob", "bob", "user");
    await profileStore.updateProfile("alice", { visibility: "community" });
    await profileStore.updateProfile("bob", { visibility: "community" });
    await profileStore.follow("alice", "bob");

    const allowed = await canMessage(profileStore as any, "alice", "bob");
    assert.equal(allowed, false);
});

test("canSendMessageRequest allows visible non-blocked users", async () => {
    const profileStore = new VolatileProfileStore();
    await profileStore.createProfile("alice", "alice", "user");
    await profileStore.createProfile("bob", "bob", "user");
    await profileStore.updateProfile("alice", { visibility: "community" });
    await profileStore.updateProfile("bob", { visibility: "community" });

    const allowed = await canSendMessageRequest(
        profileStore as any,
        "alice",
        "bob",
    );
    assert.equal(allowed, true);
});

test("canDirectMessageNowOrByApprovedRequest allows once-approved pairs", async () => {
    const profileStore = new VolatileProfileStore();
    await profileStore.createProfile("alice", "alice", "user");
    await profileStore.createProfile("bob", "bob", "user");
    await profileStore.updateProfile("alice", { visibility: "community" });
    await profileStore.updateProfile("bob", { visibility: "community" });
    const messagesStore = {
        async hasApprovedMessageRequestBetween() {
            return true;
        },
    };

    const allowed = await canDirectMessageNowOrByApprovedRequest(
        profileStore as any,
        messagesStore as any,
        "alice",
        "bob",
    );
    assert.equal(allowed, true);
});

test("canDirectMessageNowOrByApprovedRequest blocks unapproved non-mutual pairs", async () => {
    const profileStore = new VolatileProfileStore();
    await profileStore.createProfile("alice", "alice", "user");
    await profileStore.createProfile("bob", "bob", "user");
    await profileStore.updateProfile("alice", { visibility: "community" });
    await profileStore.updateProfile("bob", { visibility: "community" });
    await profileStore.follow("alice", "bob");
    const messagesStore = {
        async hasApprovedMessageRequestBetween() {
            return false;
        },
    };

    const allowed = await canDirectMessageNowOrByApprovedRequest(
        profileStore as any,
        messagesStore as any,
        "alice",
        "bob",
    );
    assert.equal(allowed, false);
});

test("canDirectMessageNowOrByApprovedRequest blocks approved history when requester cannot send requests", async () => {
    const profileStore = new VolatileProfileStore();
    await profileStore.createProfile("alice", "alice", "user");
    await profileStore.createProfile("bob", "bob", "user");
    await profileStore.updateProfile("alice", { visibility: "community" });
    await profileStore.updateProfile("bob", { visibility: "hidden" });
    const messagesStore = {
        async hasApprovedMessageRequestBetween() {
            return true;
        },
    };

    const allowed = await canDirectMessageNowOrByApprovedRequest(
        profileStore as any,
        messagesStore as any,
        "alice",
        "bob",
    );
    assert.equal(allowed, false);
});

test("POST /messages/requests/:id/reject cleans up a legacy pending room", async () => {
    const token = issueAccessToken("bob", "user", 60);
    const updated: Array<{ requestId: string; status: string }> = [];
    const removedAccountIds: string[] = [];
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
        async updateMessageRequestStatus(requestId: string, status: string) {
            updated.push({ requestId, status });
        },
        async removeMemberWithEvent(input: { accountId: string }) {
            removedAccountIds.push(input.accountId);
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
            "http://localhost/api/v1/social/messages/requests/req-1/reject",
        ),
    );

    assert.equal(handled, true);
    assert.equal(statusCode, 200);
    assert.deepEqual(updated, [{ requestId: "req-1", status: "rejected" }]);
    assert.deepEqual(removedAccountIds, ["bob", "alice"]);
    assert.match(responseBody, /"rejected"/);
});

test("admin can create DM with hidden recipient without a message request", async () => {
    const token = issueAccessToken("admin", "admin", 60);
    const createdRequests: unknown[] = [];
    const addedMembers: Array<Record<string, unknown>> = [];
    const messagesStore = {
        async findDmBetween() {
            return null;
        },
        async hasApprovedMessageRequestBetween() {
            return false;
        },
        async createDm() {
            return { id: "room-admin-hidden", kind: "dm" };
        },
        async addMemberWithEvent(input: Record<string, unknown>) {
            addedMembers.push(input);
        },
        async generateAndStoreRoomKey() {},
        async approvePendingRequestsBetween() {},
        async findPendingMessageRequest() {
            return null;
        },
        async createMessageRequest(input: unknown) {
            createdRequests.push(input);
            return { id: "unexpected", status: "pending" };
        },
    };
    const profileStore = {
        async getProfile(accountId: string) {
            if (accountId === "admin") {
                return {
                    accountId,
                    handle: "admin",
                    displayName: "Admin",
                    visibility: "hidden",
                };
            }
            return {
                accountId,
                handle: "hidden-user",
                displayName: "Hidden User",
                visibility: "hidden",
            };
        },
        async getProfileByHandle(handle: string) {
            if (handle !== "hidden-user") return null;
            return {
                accountId: "hidden-user-id",
                handle: "hidden-user",
                displayName: "Hidden User",
                visibility: "hidden",
            };
        },
        async isBlocked() {
            return false;
        },
        async isFollowing() {
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
    const req = {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        [Symbol.asyncIterator]: async function* () {
            yield Buffer.from(JSON.stringify({ handles: ["hidden-user"] }));
        },
    } as any;

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
    assert.equal(statusCode, 201);
    assert.deepEqual(createdRequests, []);
    assert.deepEqual(addedMembers, [
        {
            roomId: "room-admin-hidden",
            actorId: "admin",
            accountId: "admin",
            role: "owner",
            handle: "admin",
            displayName: "Admin",
        },
        {
            roomId: "room-admin-hidden",
            actorId: "admin",
            accountId: "hidden-user-id",
            role: "member",
            handle: "hidden-user",
            displayName: "Hidden User",
        },
    ]);
    assert.match(responseBody, /room-admin-hidden/);
});

test("GET /messages/rooms includes member avatar keys from profiles", async () => {
    const token = issueAccessToken("alice", "user", 60);
    const messagesStore = {
        async listRoomsForAccount(accountId: string) {
            assert.equal(accountId, "alice");
            return [{ id: "room-1", kind: "dm", title: null, avatarKey: null }];
        },
        async listMembers(roomId: string) {
            assert.equal(roomId, "room-1");
            return [
                {
                    roomId,
                    accountId: "alice",
                    role: "member",
                    muted: false,
                    archived: false,
                },
                {
                    roomId,
                    accountId: "bob",
                    role: "member",
                    muted: false,
                    archived: false,
                },
            ];
        },
        async listMessages() {
            return [];
        },
        async unreadCount() {
            return 0;
        },
        async getPendingIncomingRoomMessageRequest() {
            return null;
        },
    };
    const profileStore = {
        async getProfile(accountId: string) {
            if (accountId === "bob") {
                return {
                    accountId,
                    handle: "bob",
                    displayName: "Bob",
                    avatarKey: "avatars/bob.png",
                    visibility: "community",
                };
            }
            return {
                accountId,
                handle: "alice",
                displayName: "Alice",
                avatarKey: "avatars/alice.png",
                visibility: "community",
            };
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
        makeReq("GET", token),
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
    const payload = JSON.parse(responseBody);
    assert.equal(payload.data[0].members[0].avatarKey, "avatars/alice.png");
    assert.equal(payload.data[0].members[1].avatarKey, "avatars/bob.png");
});

test("GET /messages/rooms tolerates pending-request lookup failures", async () => {
    const token = issueAccessToken("alice", "user", 60);
    const messagesStore = {
        async listRoomsForAccount() {
            return [{ id: "room-1", kind: "dm", title: null, avatarKey: null }];
        },
        async listMembers(roomId: string) {
            return [
                {
                    roomId,
                    accountId: "alice",
                    role: "member",
                    muted: false,
                    archived: false,
                },
            ];
        },
        async listMessages() {
            return [];
        },
        async unreadCount() {
            return 0;
        },
        async getPendingIncomingRoomMessageRequest() {
            throw Object.assign(
                new Error("no such table: chat_message_requests"),
                { code: "SQLITE_ERROR" },
            );
        },
    };
    const profileStore = {
        async getProfile() {
            return {
                accountId: "alice",
                handle: "alice",
                displayName: "Alice",
                avatarKey: "avatars/alice.png",
                visibility: "community",
            };
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
        makeReq("GET", token),
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
    const payload = JSON.parse(responseBody);
    assert.equal(payload.data.length, 1);
    assert.equal(payload.data[0].pendingRequest, null);
});

test("GET /messages/rooms tolerates pending-request missing status column failures", async () => {
    const token = issueAccessToken("alice", "user", 60);
    const messagesStore = {
        async listRoomsForAccount() {
            return [{ id: "room-1", kind: "dm", title: null, avatarKey: null }];
        },
        async listMembers(roomId: string) {
            return [
                {
                    roomId,
                    accountId: "alice",
                    role: "member",
                    muted: false,
                    archived: false,
                },
            ];
        },
        async listMessages() {
            return [];
        },
        async unreadCount() {
            return 0;
        },
        async getPendingIncomingRoomMessageRequest() {
            throw new Error("no such column: chat_message_requests.status");
        },
    };
    const profileStore = {
        async getProfile() {
            return {
                accountId: "alice",
                handle: "alice",
                displayName: "Alice",
                avatarKey: "avatars/alice.png",
                visibility: "community",
            };
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
        makeReq("GET", token),
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
    const payload = JSON.parse(responseBody);
    assert.equal(payload.data.length, 1);
    assert.equal(payload.data[0].pendingRequest, null);
});

test("GET /messages/rooms/:id/messages hides messages when room fallback detects incoming pending request", async () => {
    const token = issueAccessToken("alice", "user", 60);
    let listMessagesCalled = false;
    const messagesStore = {
        async getRoom(roomId: string) {
            assert.equal(roomId, "room-1");
            return { id: roomId, kind: "dm", title: null, avatarKey: null };
        },
        async getMember(roomId: string, accountId: string) {
            assert.equal(roomId, "room-1");
            assert.equal(accountId, "alice");
            return {
                roomId,
                accountId,
                role: "member",
                muted: false,
                archived: false,
            };
        },
        async getPendingIncomingRoomMessageRequest() {
            return null;
        },
        async getPendingRoomMessageRequest() {
            return {
                id: "req-1",
                roomId: "room-1",
                fromAccountId: "bob",
                toAccountId: "alice",
                status: "pending",
                note: null,
                createdAt: new Date().toISOString(),
                respondedAt: null,
            };
        },
        async listMessages() {
            listMessagesCalled = true;
            return [
                {
                    id: "msg-1",
                    chatroomId: "room-1",
                    senderId: "bob",
                    ciphertext: "should-not-be-visible",
                    iv: "000000000000000000000000",
                    authTag: "",
                    contentType: "text/plain",
                    createdAt: new Date().toISOString(),
                },
            ];
        },
    };
    const profileStore = {
        async getProfile(accountId: string) {
            if (accountId === "alice") {
                return {
                    accountId,
                    handle: "alice",
                    displayName: "Alice",
                    visibility: "community",
                    avatarKey: null,
                };
            }
            if (accountId === "bob") {
                return {
                    accountId,
                    handle: "bob",
                    displayName: "Bob",
                    visibility: "community",
                    avatarKey: null,
                };
            }
            return null;
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
        makeReq("GET", token),
        {
            writeHead(status: number) {
                statusCode = status;
            },
            end(payload: string) {
                responseBody = payload;
            },
        } as any,
        new URL(
            "http://localhost/api/v1/social/messages/rooms/room-1/messages",
        ),
    );

    assert.equal(handled, true);
    assert.equal(statusCode, 200);
    assert.equal(listMessagesCalled, false);
    const payload = JSON.parse(responseBody);
    assert.deepEqual(payload.data, []);
    assert.equal(payload.pendingRequest?.id, "req-1");
    assert.equal(payload.pendingRequest?.direction, "incoming");
    assert.equal(payload.pendingRequest?.canRespond, true);
});

test("GET /messages/rooms/:id/messages hides messages when incoming pending lookup succeeds", async () => {
    const token = issueAccessToken("alice", "user", 60);
    let listMessagesCalled = false;
    const messagesStore = {
        async getRoom() {
            return { id: "room-1", kind: "dm", title: null, avatarKey: null };
        },
        async getMember() {
            return {
                roomId: "room-1",
                accountId: "alice",
                role: "member",
                muted: false,
                archived: false,
            };
        },
        async getPendingIncomingRoomMessageRequest() {
            return {
                id: "req-1",
                roomId: "room-1",
                fromAccountId: "bob",
                toAccountId: "alice",
                status: "pending",
                note: null,
                createdAt: new Date().toISOString(),
                respondedAt: null,
            };
        },
        async listMessages() {
            listMessagesCalled = true;
            return [];
        },
    };
    const profileStore = {
        async getProfile(accountId: string) {
            return {
                accountId,
                handle: accountId,
                displayName: accountId,
                visibility: "community",
                avatarKey: null,
            };
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
        makeReq("GET", token),
        {
            writeHead(status: number) {
                statusCode = status;
            },
            end(payload: string) {
                responseBody = payload;
            },
        } as any,
        new URL(
            "http://localhost/api/v1/social/messages/rooms/room-1/messages",
        ),
    );

    assert.equal(handled, true);
    assert.equal(statusCode, 200);
    assert.equal(listMessagesCalled, false);
    const payload = JSON.parse(responseBody);
    assert.deepEqual(payload.data, []);
});

test("GET /messages/rooms/:id/messages returns messages when no pending request exists", async () => {
    const token = issueAccessToken("alice", "user", 60);
    let listMessagesCalled = false;
    const createdAt = new Date().toISOString();
    const messagesStore = {
        async getRoom() {
            return { id: "room-1", kind: "dm", title: null, avatarKey: null };
        },
        async getMember() {
            return {
                roomId: "room-1",
                accountId: "alice",
                role: "member",
                muted: false,
                archived: false,
            };
        },
        async getPendingIncomingRoomMessageRequest() {
            return null;
        },
        async getPendingRoomMessageRequest() {
            return null;
        },
        async listMessages() {
            listMessagesCalled = true;
            return [
                {
                    id: "msg-1",
                    chatroomId: "room-1",
                    senderId: "bob",
                    ciphertext: "hello",
                    iv: "abcd",
                    authTag: "",
                    contentType: "text/plain",
                    createdAt,
                },
            ];
        },
        async listMembers() {
            return [
                {
                    roomId: "room-1",
                    accountId: "alice",
                    role: "member",
                    muted: false,
                    archived: false,
                    lastReadAt: null,
                },
                {
                    roomId: "room-1",
                    accountId: "bob",
                    role: "member",
                    muted: false,
                    archived: false,
                    lastReadAt: null,
                },
            ];
        },
        async listMessageReactions() {
            return [];
        },
    };
    const profileStore = {
        async getProfile(accountId: string) {
            return {
                accountId,
                handle: accountId,
                displayName: accountId,
                visibility: "community",
                avatarKey: null,
            };
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
        makeReq("GET", token),
        {
            writeHead(status: number) {
                statusCode = status;
            },
            end(payload: string) {
                responseBody = payload;
            },
        } as any,
        new URL(
            "http://localhost/api/v1/social/messages/rooms/room-1/messages",
        ),
    );

    assert.equal(handled, true);
    assert.equal(statusCode, 200);
    assert.equal(listMessagesCalled, true);
    const payload = JSON.parse(responseBody);
    assert.equal(payload.data.length, 1);
    assert.equal(payload.data[0].id, "msg-1");
});

test("POST /messages/rooms/:id/key-contribution explicitly contributes a room key to members", async () => {
    const token = issueAccessToken("alice", "user", 60);
    let generated = false;
    const messagesStore = {
        async getRoom() {
            return { id: "room-1", kind: "dm", title: null, avatarKey: null };
        },
        async getMember() {
            return {
                roomId: "room-1",
                accountId: "alice",
                role: "member",
                muted: false,
                archived: false,
            };
        },
        async getPendingIncomingRoomMessageRequest() {
            return null;
        },
        async getPendingRoomMessageRequest() {
            return null;
        },
        async listMembers() {
            return [
                {
                    roomId: "room-1",
                    accountId: "alice",
                    role: "member",
                    muted: false,
                    archived: false,
                    lastReadAt: null,
                },
            ];
        },
        async getUnwrappedRoomKey() {
            return null;
        },
        async generateAndStoreRoomKey() {
            generated = true;
            return "generated-room-key";
        },
    };
    const profileStore = {
        async getProfile(accountId: string) {
            return {
                accountId,
                handle: accountId,
                displayName: accountId,
                visibility: "community",
                avatarKey: null,
            };
        },
    };
    const route = createMessagesRoutes({
        messagesStore: messagesStore as any,
        profileStore: profileStore as any,
        dispatch: null,
        isAdapterEnabled: () => true,
    });
    let responseBody = "";

    await route(
        makeReq("POST", token),
        {
            writeHead() {},
            end(payload: string) {
                responseBody = payload;
            },
        } as any,
        new URL(
            "http://localhost/api/v1/social/messages/rooms/room-1/key-contribution",
        ),
    );

    assert.equal(generated, true);
    assert.deepEqual(JSON.parse(responseBody).data.keyContribution, {
        id: "chatroom:room-1:key",
        value: "generated-room-key",
        metadata: { label: "Chat room-1" },
    });
});

test("POST /messages/rooms/:id/messages/:messageId/reactions dispatches reaction notification with emoji", async () => {
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
                    role: "member",
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
        async getPendingIncomingRoomMessageRequest() {
            return null;
        },
        async getPendingRoomMessageRequest() {
            return null;
        },
        async getMessage(messageId: string) {
            assert.equal(messageId, "msg-1");
            return {
                id: "msg-1",
                chatroomId: "room-1",
                senderId: "bob",
            };
        },
        async hasMessageReaction() {
            return false;
        },
        async setMessageReaction() {},
    };
    const profileStore = {
        async getProfile(accountId: string) {
            if (accountId === "alice") {
                return {
                    accountId,
                    handle: "alice",
                    displayName: "Alice",
                    visibility: "community",
                };
            }
            if (accountId === "bob") {
                return {
                    accountId,
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
        yield Buffer.from(JSON.stringify({ emoji: "🔥" }));
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
        new URL(
            "http://localhost/api/v1/social/messages/rooms/room-1/messages/msg-1/reactions",
        ),
    );

    assert.equal(handled, true);
    assert.equal(statusCode, 200);
    assert.equal(JSON.parse(responseBody).data.active, true);
    assert.equal(dispatched.length, 1);
    assert.equal(dispatched[0].subject, "New reaction");
    assert.match(String(dispatched[0].body), /🔥/);
    assert.deepEqual(dispatched[0].metadata, {
        roomId: "room-1",
        messageId: "msg-1",
        reaction: "🔥",
    });
});

import test from "node:test";
import assert from "node:assert/strict";
import { createMessagesRoutes } from "../routes/index.js";
import { issueAccessToken } from "../../../../gateways/auth/access-tokens.js";
import {
    createCtx,
    registerCanonicalFlow,
    MESSAGING_FLOW_CATALOG,
} from "@cognis/core";
import type { FlowApi } from "@cognis/core";

type MinimalMessagesStore = {
    appendMessage(args: {
        roomId: string;
        senderId: string;
        ciphertext: string;
        iv: string;
        authTag: string;
        contentType: string;
    }): Promise<Record<string, unknown>>;
    setTyping(
        roomId: string,
        accountId: string,
        typing: boolean,
    ): Promise<void>;
    listMembers(
        roomId: string,
    ): Promise<Array<{ accountId: string; muted: boolean }>>;
    getPendingIncomingRoomMessageRequest(
        roomId: string,
        toAccountId: string,
    ): Promise<unknown>;
};

type MinimalProfileStore = {
    getProfile(accountId: string): Promise<Record<string, unknown> | null>;
};

type DispatchFn = (
    envelope: Record<string, unknown>,
) => Promise<{ dispatched: string[] }>;

function makeFlow(
    messagesStore: MinimalMessagesStore,
    profileStore: MinimalProfileStore,
    dispatch: DispatchFn,
): FlowApi {
    const ctx = createCtx();
    const sendMessageFlow = MESSAGING_FLOW_CATALOG.find(
        (f) => f.id === "send-message",
    );
    if (sendMessageFlow) {
        registerCanonicalFlow(ctx, sendMessageFlow);
    }
    ctx.flow.extend(
        "send-message",
        "validate-message",
        { id: "test:validate-message" },
        (stageCtx) => {
            const input = (stageCtx.input ?? {}) as {
                ciphertext?: unknown;
                iv?: unknown;
            };
            if (
                typeof input.ciphertext !== "string" ||
                typeof input.iv !== "string"
            ) {
                return { valid: false, reason: "missing_ciphertext_or_iv" };
            }
            return { valid: true };
        },
    );
    ctx.flow.extend(
        "send-message",
        "persist-message",
        { id: "test:persist-message" },
        async (stageCtx) => {
            const input = (stageCtx.input ?? {}) as {
                roomId?: string;
                senderId?: string;
                ciphertext?: string;
                iv?: string;
                authTag?: string;
                contentType?: string;
            };
            const msg = await messagesStore.appendMessage({
                roomId: input.roomId ?? "",
                senderId: input.senderId ?? "",
                ciphertext: input.ciphertext ?? "",
                iv: input.iv ?? "",
                authTag: input.authTag ?? "",
                contentType: input.contentType ?? "text/plain",
            });
            await messagesStore.setTyping(
                input.roomId ?? "",
                input.senderId ?? "",
                false,
            );
            return { persisted: true, message: msg, messageId: msg["id"] };
        },
    );
    ctx.flow.extend(
        "send-message",
        "fan-out",
        { id: "test:fan-out" },
        async (stageCtx) => {
            const input = (stageCtx.input ?? {}) as {
                roomId?: string;
                senderId?: string;
            };
            const persistResult = (
                (stageCtx.stageResults["persist-message"] ?? []) as Array<{
                    persisted: boolean;
                    messageId?: unknown;
                }>
            )[0];
            if (!persistResult?.persisted) return { fanOut: false };
            const members = await messagesStore.listMembers(input.roomId ?? "");
            for (const member of members) {
                if (member.accountId === input.senderId || member.muted) {
                    continue;
                }
                const pending =
                    await messagesStore.getPendingIncomingRoomMessageRequest(
                        input.roomId ?? "",
                        member.accountId,
                    );
                if (pending) continue;
                const recipient = await profileStore.getProfile(
                    member.accountId,
                );
                if (!recipient) continue;
                await dispatch({
                    category: "messages",
                    recipientUsername: recipient["handle"],
                    subject: "New message",
                    body: "New message",
                    actionUrl: `/messages/${input.roomId}`,
                    metadata: {
                        roomId: input.roomId,
                        messageId: persistResult.messageId,
                    },
                }).catch(() => undefined);
            }
            return { fanOut: true };
        },
    );
    return ctx.flow;
}

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
        new URL("http://localhost/api/v1/social/messages/rooms"),
    );

    assert.equal(handled, true);
    assert.equal(statusCode, 202);
    const responseData = JSON.parse(responseBody).data;
    assert.equal(responseData.requestId, "req-1");
    assert.equal(responseData.id, undefined);
    assert.equal(dispatched.length, 1);
    assert.equal(dispatched[0].category, "message-requests");
    assert.equal(dispatched[0].subject, "New message request");
    assert.equal(dispatched[0].recipientUsername, "bob");
    assert.equal(dispatched[0].actionUrl, "/messages");
    assert.deepEqual(dispatched[0].metadata, {
        requestId: "req-1",
    });
});

test("POST /messages/rooms does not resend an existing message-request notification", async () => {
    const token = issueAccessToken("alice", "user", 60);
    const dispatched: Array<Record<string, unknown>> = [];
    const existingRequest = {
        id: "req-existing",
        status: "pending",
        roomId: "room-existing",
    };
    const messagesStore = {
        async hasApprovedMessageRequestBetween() {
            return false;
        },
        async findDmBetween() {
            return { id: "room-existing", kind: "dm" };
        },
        async setArchived() {},
        async findPendingMessageRequest() {
            return existingRequest;
        },
    };
    const profileStore = {
        async isBlocked() {
            return false;
        },
        async getProfileByHandle(handle: string) {
            return handle === "bob"
                ? {
                      accountId: "bob",
                      handle: "bob",
                      visibility: "community",
                  }
                : null;
        },
        async getProfile(accountId: string) {
            return {
                accountId,
                handle: accountId,
                visibility: "community",
            };
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
    const req = makeReq("POST", token);
    req[Symbol.asyncIterator] = async function* () {
        yield Buffer.from(JSON.stringify({ handles: ["bob"] }));
    };
    let responseBody = "";

    await route(
        req,
        {
            writeHead() {},
            end(payload: string) {
                responseBody = payload;
            },
        } as any,
        new URL("http://localhost/api/v1/social/messages/rooms"),
    );

    assert.equal(JSON.parse(responseBody).data.id, "room-existing");
    assert.deepEqual(dispatched, []);
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
        flow: makeFlow(
            messagesStore as any,
            profileStore as any,
            async (envelope: Record<string, unknown>) => {
                dispatched.push(envelope);
                return { dispatched: ["bob"] };
            },
        ),
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
        new URL(
            "http://localhost/api/v1/social/messages/rooms/room-1/messages",
        ),
    );

    assert.equal(handled, true);
    assert.equal(statusCode, 201);
    assert.equal(JSON.parse(responseBody).data.id, "msg-1");
    assert.equal(dispatched.length, 0);
});

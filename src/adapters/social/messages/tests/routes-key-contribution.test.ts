import test from "node:test";
import assert from "node:assert/strict";
import { createMessagesRoutes } from "../routes/index.js";
import { issueAccessToken } from "../../../../gateways/auth/access-tokens.js";
import { createDefaultRouteContext } from "../../../../api/reuse/route-context.js";

function makeReq(method: string, token: string) {
    return {
        method,
        headers: { authorization: `Bearer ${token}` },
        [Symbol.asyncIterator]: async function* () {},
    } as any;
}

test("POST /messages/rooms/:id/key-contribution explicitly contributes a room key to members", async () => {
    const token = issueAccessToken("alice", "user", 60);
    let contributionAcknowledged = false;
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
        async claimRoomKeyContribution() {
            if (contributionAcknowledged) return null;
            return "generated-room-key";
        },
        async acknowledgeRoomKeyContribution() {
            contributionAcknowledged = true;
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

    assert.deepEqual(JSON.parse(responseBody).data.keyContribution, {
        id: "chatroom:room-1:key",
        value: "generated-room-key",
        metadata: { label: "Chat room-1" },
    });

    await route(
        makeReq("POST", token),
        {
            writeHead(statusCode: number) {
                assert.equal(statusCode, 204);
            },
            end() {},
        } as any,
        new URL(
            "http://localhost/api/v1/social/messages/rooms/room-1/key-contribution/acknowledge",
        ),
    );

    responseBody = "";
    await route(
        makeReq("POST", token),
        {
            writeHead(statusCode: number) {
                assert.equal(statusCode, 409);
            },
            end(payload: string) {
                responseBody = payload;
            },
        } as any,
        new URL(
            "http://localhost/api/v1/social/messages/rooms/room-1/key-contribution",
        ),
    );
    assert.equal(
        JSON.parse(responseBody).error.code,
        "room_key_already_delivered",
    );
});

test("meeting share guests receive a room key without consuming member delivery state", async () => {
    const token = issueAccessToken("share:share-1:guest-1", "user", 60);
    let memberClaimed = false;
    let memberAcknowledged = false;
    const messagesStore = {
        async getRoom() {
            return {
                id: "room-1",
                kind: "group",
                title: null,
                avatarKey: null,
            };
        },
        async getMember() {
            return null;
        },
        async getUnwrappedRoomKey() {
            return "shared-room-key";
        },
        async generateAndStoreRoomKey() {
            throw new Error("existing meeting room key should be reused");
        },
        async claimRoomKeyContribution() {
            memberClaimed = true;
            return null;
        },
        async acknowledgeRoomKeyContribution() {
            memberAcknowledged = true;
        },
    };
    const capabilities = new Map([
        ["share:resolveGuestId", () => "share-1"],
        [
            "social:messages:authorizeExternalRoomAccess",
            async ({ roomId }) => ({
                external: true,
                authorized: roomId === "room-1",
            }),
        ],
    ]);
    const route = createMessagesRoutes({
        messagesStore: messagesStore as any,
        profileStore: {} as any,
        dispatch: null,
        isAdapterEnabled: () => true,
        routeContext: createDefaultRouteContext({
            getCapability: (id) => capabilities.get(id) as any,
        }),
    });
    let responseBody = "";
    await route(
        makeReq("POST", token),
        {
            writeHead(statusCode: number) {
                assert.equal(statusCode, 200);
            },
            end(payload: string) {
                responseBody = payload;
            },
        } as any,
        new URL(
            "http://localhost/api/v1/social/messages/rooms/room-1/key-contribution",
        ),
    );
    assert.deepEqual(JSON.parse(responseBody).data.keyContribution, {
        id: "chatroom:room-1:key",
        value: "shared-room-key",
        metadata: { label: "Chat room-1" },
    });
    await route(
        makeReq("POST", token),
        {
            writeHead(statusCode: number) {
                assert.equal(statusCode, 204);
            },
            end() {},
        } as any,
        new URL(
            "http://localhost/api/v1/social/messages/rooms/room-1/key-contribution/acknowledge",
        ),
    );
    assert.equal(memberClaimed, false);
    assert.equal(memberAcknowledged, false);
});

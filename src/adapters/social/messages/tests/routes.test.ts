import test from "node:test";
import assert from "node:assert/strict";
import { VolatileProfileStore } from "../../profile/profile-store.js";
import {
    canMessage,
    canSendMessageRequest,
    canDirectMessageNowOrByApprovedRequest,
    createMessagesRoutes,
} from "../routes.js";
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

test("POST /messages/requests/:id/reject removes rejected recipient from pending room", async () => {
    const token = issueAccessToken("bob", "user", 60);
    const removed: Array<{ roomId: string; accountId: string }> = [];
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
        async updateMessageRequestStatus() {},
        async removeMember(roomId: string, accountId: string) {
            removed.push({ roomId, accountId });
        },
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
        new URL("http://localhost/api/v1/messages/requests/req-1/reject"),
    );

    assert.equal(handled, true);
    assert.equal(statusCode, 200);
    assert.deepEqual(removed, [{ roomId: "room-1", accountId: "bob" }]);
    assert.match(responseBody, /"rejected"/);
});

import test from "node:test";
import assert from "node:assert/strict";
import { createMessagesRoutes } from "../routes/index.js";
import { createDefaultRouteContext } from "../../../../api/reuse/route-context.js";
import { issueAccessToken } from "../../../../gateways/auth/access-tokens.js";
import { InMemoryTestExecutor } from "../../../../gateways/db/tests/in-memory-test-executor.js";
import { ShareTokenStore } from "../../../../gateways/share/gateway/store.js";
import { GuestProfileStore } from "../../../../gateways/share/gateway/guest-profile-store.js";
import { ShareApprovalRequestStore } from "../../../../gateways/share/gateway/approval-request-store.js";
import { CoreShareGateway } from "../../../../gateways/share/gateway/index.js";

/**
 * End-to-end regression test for share-guest room-key access that exercises
 * the *real* ShareTokenStore (including its JSON serialize/parse round trip
 * through the db executor) instead of a mocked `share:getTokenById`
 * capability, so a data round-trip bug in that layer can't silently pass a
 * test that only checks the room-route logic in isolation.
 */
function makeReq(method: string, token: string) {
    return {
        method,
        headers: { authorization: "Bearer " + token },
        [Symbol.asyncIterator]: async function* () {},
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

test("share guest fetches the meeting chat room key through the real share token store", async () => {
    const executor = new InMemoryTestExecutor();
    const store = new ShareTokenStore(executor);
    const guestProfileStore = new GuestProfileStore(executor);
    const approvalStore = new ShareApprovalRequestStore(executor);
    const gateway = new CoreShareGateway(
        store,
        guestProfileStore,
        approvalStore,
        "",
        () => undefined,
    );
    await gateway.ensureSchema();

    const record = await gateway.issueToken({
        ownerAccountId: "host-1",
        resourceType: "meeting",
        resourceId: "meeting-1",
        grantedCapabilities: [
            "meeting:join",
            "participants:read",
            "chat:read",
            "chat:write",
        ],
        expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    });

    const messagesStore = {
        async getRoom(id: string) {
            return id === "room-1" ? { id: "room-1", kind: "group" } : null;
        },
        async getMember() {
            return null;
        },
        async getUnwrappedRoomKey(roomId: string) {
            return roomId === "room-1" ? "deadbeefcafe" : null;
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
        "share:getTokenById": gateway.getTokenById.bind(gateway),
        "jitsi-meet:getMeetingById": async (meetingId: string) =>
            meetingId === "meeting-1" ? { chatRoomId: "room-1" } : null,
        "share:getGuestProfile": async () => null,
    };
    const routeContext = createDefaultRouteContext({
        getCapability: (id: string) => capabilities[id] as any,
    });

    const routes = createMessagesRoutes({
        messagesStore: messagesStore as any,
        profileStore: {} as any,
        dispatch: null,
        isAdapterEnabled: () => true,
        routeContext,
    });

    const guestToken = issueAccessToken(
        `share:${record.id}:guest-1`,
        "user",
        3600,
        { providerId: "share", purpose: "share" },
    );

    const req = makeReq("GET", guestToken);
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

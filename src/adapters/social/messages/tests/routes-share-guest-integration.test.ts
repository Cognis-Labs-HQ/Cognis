import test from "node:test";
import assert from "node:assert/strict";
import { createMessagesRoutes } from "../routes/index.js";
import { createDefaultRouteContext } from "../../../../api/reuse/route-context.js";
import { issueAccessToken } from "../../../../gateways/auth/access-tokens.js";

/**
 * Route-level regression test for share-guest room-key access. External
 * components are represented only by ctx capabilities so this adapter test
 * remains valid if the Share gateway or Jitsi module internals move.
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

test("share guest fetches the meeting chat room key through ctx capabilities", async () => {
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
        "share:getTokenById": async (shareId: string) =>
            shareId === "share-1"
                ? {
                      resourceType: "meeting",
                      resourceId: "meeting-1",
                      grantedCapabilities: ["meeting:join", "chat:read"],
                  }
                : null,
        "share:resolveGuestId": (claims: { sub?: string }) =>
            String(claims?.sub ?? "").startsWith("share:")
                ? String(claims?.sub).split(":")[1] || ""
                : "",
        "share:resolveGuestSessionId": (claims: { sub?: string }) =>
            String(claims?.sub ?? "").split(":")[2] || "",
        "share:hasCapability": (
            tokenRecord: { grantedCapabilities?: string[] } | null,
            capability: string,
        ) =>
            !capability ||
            Boolean(tokenRecord?.grantedCapabilities?.includes(capability)),
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

    const req = makeReq(
        "GET",
        issueAccessToken(`share:share-1:guest-1`, "user", 3600, {
            providerId: "share",
            purpose: "share",
        }),
    );
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

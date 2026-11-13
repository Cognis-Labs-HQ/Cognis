import assert from "node:assert/strict";
import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";
import test from "node:test";
import { CapabilityStore, createCtx, hasMinRole } from "@cognis/core";
import type { DbExecutor } from "../../../../../gateways/db/reuse/db-executor.js";
import type { RouteContext } from "../../../../../api/reuse/route-context.js";
import type { SocialMessagesProfileStore } from "../../profile-store-contract.js";
import { createMessagesRoutes } from "../../routes/index.js";
import { DbMessagesStore } from "../../store.js";

function unexpectedCall(): never {
    throw new Error("Unexpected access-boundary fixture operation");
}

function fixture(guestAuthorized: boolean) {
    let messageReads = 0;
    let profileReads = 0;
    const executor: DbExecutor = {
        ensureTable: unexpectedCall,
        transaction: (callback) => callback(executor),
        async executeCommand(command) {
            assert.equal(command.option, "SELECT");
            if (command.option !== "SELECT") return unexpectedCall();
            if (command.table === "chatrooms") {
                return {
                    rows: [
                        {
                            id: "room",
                            kind: "group",
                            created_by: "owner",
                            created_at: "",
                            updated_at: "",
                        },
                    ],
                };
            }
            if (
                command.table === "chatroom_members" ||
                command.table === "chat_message_requests"
            ) {
                return { rows: [] };
            }
            if (command.table === "chat_messages") {
                messageReads++;
                return {
                    rows: [
                        {
                            id: "message",
                            chatroom_id: "room",
                            sender_id: "guest-sender",
                            ciphertext: "ciphertext",
                            iv: "iv",
                            auth_tag: "tag",
                            content_type: "text/plain",
                            created_at: "",
                        },
                    ],
                };
            }
            return unexpectedCall();
        },
    };
    const capabilities = new CapabilityStore();
    if (guestAuthorized) {
        capabilities.contribute(
            "social:messages:authorizeExternalRoomAccess",
            async () => ({ external: true, authorized: true }),
        );
    }
    capabilities.contribute("share:getGuestProfile", async () => {
        profileReads++;
        return { displayName: "Guest", avatarKey: null };
    });
    const routeContext: RouteContext = {
        requireAuth: () => ({ sub: "visitor", role: "user" }),
        getAuthClaims: unexpectedCall,
        requireRoleAccess: unexpectedCall,
        canAccessUserData: unexpectedCall,
        hasMinRole,
        getCookieSession: unexpectedCall,
        setPageSecurityHeaders: unexpectedCall,
        lookupAccessToken: unexpectedCall,
        revokeAccessTokensForSubject: unexpectedCall,
        getCapability: (id) => capabilities.get(id),
        requireCapability: (id) => {
            const value = capabilities.get(id);
            if (value === undefined)
                throw new Error(`Missing capability: ${id}`);
            return capabilities.get(id)!;
        },
        flow: createCtx().flow,
    };
    const profileStore: SocialMessagesProfileStore = {
        getProfile: unexpectedCall,
        getProfileByHandle: unexpectedCall,
        searchProfiles: unexpectedCall,
        isBlocked: unexpectedCall,
        isFollowing: unexpectedCall,
    };
    const route = createMessagesRoutes({
        messagesStore: new DbMessagesStore(executor),
        profileStore,
        dispatch: null,
        isAdapterEnabled: () => true,
        routeContext,
    });
    async function invoke(method: string, suffix: string) {
        const request = new IncomingMessage(new Socket());
        request.method = method;
        request.push(null);
        const response = new ServerResponse(request);
        await route(
            request,
            response,
            new URL(
                `http://localhost/api/v1/social/messages/rooms/room/${suffix}`,
            ),
        );
        return response;
    }
    return {
        invoke,
        messageReads: () => messageReads,
        profileReads: () => profileReads,
    };
}

for (const guestAuthorized of [false, true]) {
    for (const [method, suffix] of [
        ["POST", "members"],
        ["DELETE", "members/owner"],
    ]) {
        test(`${guestAuthorized ? "authorized guest" : "nonmember"} cannot mutate room membership through ${method}`, async () => {
            const harness = fixture(guestAuthorized);
            const response = await harness.invoke(method, suffix);
            assert.equal(response.statusCode, 403);
            assert.equal(harness.messageReads(), 0);
            assert.equal(harness.profileReads(), 0);
        });
    }
}

test("missing guest-session resolver rejects enrichment without granting nonmember access", async () => {
    const outsider = fixture(false);
    assert.equal((await outsider.invoke("GET", "messages")).statusCode, 403);
    assert.equal(outsider.messageReads(), 0);
    const guest = fixture(true);
    await assert.rejects(
        guest.invoke("GET", "messages"),
        /Share guest session resolver is unavailable/,
    );
    assert.equal(guest.messageReads(), 1);
    assert.equal(guest.profileReads(), 0);
});

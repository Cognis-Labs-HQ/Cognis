import test from "node:test";
import assert from "node:assert/strict";
import { registerMeetingParticipantRoutes } from "../participant-routes.js";

test("meeting participant search returns community profiles without a follow relationship", async () => {
    const routes = [];
    const searchCalls = [];
    const router = {
        get(path, handler) {
            routes.push({ path, handler });
        },
    };
    registerMeetingParticipantRoutes({
        router,
        requireAuth: () => ({ sub: "bob-account", role: "user" }),
        profileStore: {
            async searchProfiles(query, limit, options) {
                searchCalls.push({ query, limit, options });
                return [
                    {
                        accountId: "alice-account",
                        handle: "alice",
                        displayName: "Alice Admin",
                        avatarKey: "alice.png",
                        visibility: "community",
                    },
                ];
            },
        },
        sendJson: (_res, status, payload) => {
            assert.equal(status, 200);
            assert.deepEqual(payload.data, [
                {
                    handle: "alice",
                    displayName: "Alice Admin",
                    avatarKey: "alice.png",
                },
            ]);
        },
        sendError: () => assert.fail("participant search should not fail"),
        hasMinRole: () => false,
        resolveShareGuestMeetingAccess: async () => ({ isGuest: false }),
    });

    await routes[0].handler(
        { url: "/api/v1/modules/jitsi-meet/participants?q=ali" },
        {},
    );

    assert.deepEqual(searchCalls, [
        {
            query: "ali",
            limit: 50,
            options: {
                includeHidden: false,
                requesterAccountId: "bob-account",
            },
        },
    ]);
});

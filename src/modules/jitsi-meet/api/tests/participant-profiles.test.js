import test from "node:test";
import assert from "node:assert/strict";
import {
    listEligibleMeetingParticipantProfiles,
    listEligibleMeetingParticipantSummaries,
} from "../reuse/participant-profiles.js";

function profile(
    accountId,
    handle,
    displayName = null,
    visibility = "community",
) {
    return {
        accountId,
        handle,
        displayName,
        visibility,
        avatarKey: null,
    };
}

test("meeting participant profile lookup only returns followed profiles", async () => {
    const followed = [
        profile("bob-id", "bob", "Bob Teacher"),
        profile("hidden-id", "hidden", "Hidden User", "hidden"),
        profile("blocked-id", "blocked", "Blocked User"),
    ];
    const store = {
        getFollowing: async (accountId) => {
            assert.equal(accountId, "alice-id");
            return followed;
        },
        isBlocked: async (blockerId, requesterId) => {
            assert.equal(requesterId, "alice-id");
            return blockerId === "blocked-id";
        },
    };

    const results = await listEligibleMeetingParticipantProfiles(
        store,
        "alice-id",
        "b",
    );

    assert.deepEqual(
        results.map((item) => item.handle),
        ["bob"],
    );
});

test("meeting participant summaries only include followed active usernames", async () => {
    const store = {
        getFollowing: async () => [
            profile("bob-id", "bob", "Bob Teacher"),
            profile("carol-id", "carol", "Carol Teacher"),
        ],
        isBlocked: async () => false,
    };

    const results = await listEligibleMeetingParticipantSummaries(
        store,
        "alice-id",
        ["bob", "mallory"],
    );

    assert.deepEqual(results, [
        {
            username: "bob",
            handle: "bob",
            displayName: "Bob Teacher",
            avatarKey: null,
        },
    ]);
});

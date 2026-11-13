import test from "node:test";
import assert from "node:assert/strict";
import { createFollowersCapability } from "../follow-membership.js";

test("followers capability exposes matching add/remove operations", async () => {
    const calls: string[] = [];
    const followers = createFollowersCapability({
        follow: async (follower: string, followed: string) => {
            calls.push(`add:${follower}:${followed}`);
        },
        unfollow: async (follower: string, followed: string) => {
            calls.push(`remove:${follower}:${followed}`);
        },
    } as never);
    const input = {
        followerAccountId: "alice",
        followedAccountId: "bob",
    };

    await followers.add(input);
    await followers.remove(input);

    assert.deepEqual(calls, ["add:alice:bob", "remove:alice:bob"]);
});

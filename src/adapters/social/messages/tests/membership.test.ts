import test from "node:test";
import assert from "node:assert/strict";
import { createChatroomMembershipCapability } from "../membership.js";

test("chatroom membership add reactivates a returning meeting participant", async () => {
    const calls: Array<Record<string, unknown>> = [];
    const messagesStore = {
        addMemberWithEvent: async (input: Record<string, unknown>) => {
            calls.push({ operation: "add", ...input });
        },
        removeMemberWithEvent: async (input: Record<string, unknown>) => {
            calls.push({ operation: "remove", ...input });
        },
        setArchived: async (
            roomId: string,
            accountId: string,
            archived: boolean,
        ) => {
            calls.push({ operation: "archive", roomId, accountId, archived });
        },
    };
    const profileStore = {
        getProfile: async () => ({
            accountId: "bob",
            handle: "bob",
            displayName: "Bob",
        }),
    };
    const membership = createChatroomMembershipCapability(
        messagesStore as never,
        profileStore as never,
    );
    const input = {
        roomId: "room-1",
        actorAccountId: "alice",
        userAccountId: "bob",
    };

    await membership.add(input);
    await membership.remove(input);

    assert.deepEqual(calls, [
        {
            operation: "add",
            roomId: "room-1",
            actorId: "alice",
            accountId: "bob",
            role: "member",
            handle: "bob",
            displayName: "Bob",
        },
        {
            operation: "archive",
            roomId: "room-1",
            accountId: "bob",
            archived: false,
        },
        {
            operation: "remove",
            roomId: "room-1",
            actorId: "alice",
            accountId: "bob",
            handle: "bob",
            displayName: "Bob",
        },
    ]);
});

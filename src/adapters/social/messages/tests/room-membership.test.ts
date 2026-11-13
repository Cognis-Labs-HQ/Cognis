import test from "node:test";
import assert from "node:assert/strict";
import { createRoomMembershipResolver } from "../room-membership.js";
import type { MemberRow } from "../store/types.js";

function member(accountId: string, archived = false): MemberRow {
    return {
        chatroomId: "room-1",
        accountId,
        role: "member",
        joinedAt: "2026-09-04T00:00:00.000Z",
        lastReadAt: null,
        keyDeliveredAt: null,
        muted: false,
        archived,
    };
}

test("room membership resolver authorizes active members", async () => {
    const members = [member("account-1"), member("account-2")];
    const resolveRoomMembership = createRoomMembershipResolver({
        async getMember(_roomId, accountId) {
            return (
                members.find((entry) => entry.accountId === accountId) ?? null
            );
        },
        async listMembers() {
            return members;
        },
    });

    assert.deepEqual(
        await resolveRoomMembership({
            roomId: "room-1",
            requesterAccountId: "account-1",
        }),
        {
            authorized: true,
            memberAccountIds: ["account-1", "account-2"],
        },
    );
});

test("room membership resolver rejects archived and unrelated accounts", async () => {
    const members = [member("account-1"), member("account-2", true)];
    const resolveRoomMembership = createRoomMembershipResolver({
        async getMember(_roomId, accountId) {
            return (
                members.find((entry) => entry.accountId === accountId) ?? null
            );
        },
        async listMembers() {
            return members;
        },
    });

    for (const requesterAccountId of ["account-2", "account-3"]) {
        assert.deepEqual(
            await resolveRoomMembership({
                roomId: "room-1",
                requesterAccountId,
            }),
            { authorized: false, memberAccountIds: [] },
        );
    }
});

import { randomUUID } from "node:crypto";
import type { DbExecutor } from "../../../../gateways/db/reuse/db-executor.js";
import { rowToMember, rowToRoom } from "./row-mappers.js";
import type { ChatroomKind, MemberRole, MemberRow, RoomRow } from "./types.js";

export async function createRoom(
    database: DbExecutor,
    kind: ChatroomKind,
    title: string | null,
    createdBy: string,
): Promise<RoomRow> {
    const id = randomUUID();
    const nowIso = new Date().toISOString();
    await database.executeCommand({
        option: "INSERT",
        table: "chatrooms",
        values: {
            id,
            kind,
            title,
            created_by: createdBy,
            created_at: nowIso,
            updated_at: nowIso,
        },
    });
    const result = await database.executeCommand({
        option: "SELECT",
        table: "chatrooms",
        where: [{ column: "id", value: id }],
    });
    return rowToRoom(result.rows![0]);
}

async function createDirectMessage(
    database: DbExecutor,
    accountA: string,
    accountB: string,
): Promise<RoomRow> {
    if (accountA === accountB) throw new Error("dm_participants_must_differ");
    return createRoom(database, "dm", null, accountA);
}
export { createDirectMessage as createDm };

export async function getRoom(
    database: DbExecutor,
    id: string,
): Promise<RoomRow | null> {
    const result = await database.executeCommand({
        option: "SELECT",
        table: "chatrooms",
        where: [{ column: "id", value: id }],
    });
    return result.rows?.[0] ? rowToRoom(result.rows[0]) : null;
}

export async function updateRoomAvatar(
    database: DbExecutor,
    roomId: string,
    avatarKey: string | null,
): Promise<RoomRow | null> {
    await database.executeCommand({
        option: "UPDATE",
        table: "chatrooms",
        set: {
            avatar_key: avatarKey,
            updated_at: new Date().toISOString(),
        },
        where: [{ column: "id", value: roomId }],
    });
    return getRoom(database, roomId);
}

export async function addMember(
    database: DbExecutor,
    roomId: string,
    accountId: string,
    role: MemberRole,
): Promise<boolean> {
    const existingMember = await getMember(database, roomId, accountId);
    if (existingMember) return false;
    await database.executeCommand({
        option: "INSERT",
        table: "chatroom_members",
        values: { chatroom_id: roomId, account_id: accountId, role },
        conflict: { action: "ignore" },
    });
    return true;
}

export async function removeMember(
    database: DbExecutor,
    roomId: string,
    accountId: string,
): Promise<void> {
    await database.executeCommand({
        option: "DELETE",
        table: "chatroom_members",
        where: [
            { column: "chatroom_id", value: roomId },
            { column: "account_id", value: accountId },
        ],
    });
}

export async function removeMemberAndApplyLifecycle(
    database: DbExecutor,
    roomId: string,
    accountId: string,
): Promise<"active" | "archived" | "deleted"> {
    await removeMember(database, roomId, accountId);
    const remainingMembers = await listMembers(database, roomId);
    if (remainingMembers.length === 1) {
        await database.executeCommand({
            option: "UPDATE",
            table: "chatroom_members",
            set: { archived: 1 },
            where: [
                { column: "chatroom_id", value: roomId },
                {
                    column: "account_id",
                    value: remainingMembers[0].accountId,
                },
            ],
        });
        return "archived";
    }
    if (remainingMembers.length > 1) return "active";

    await deleteRoom(database, roomId);
    return "deleted";
}

export async function deleteRoom(
    database: DbExecutor,
    roomId: string,
): Promise<void> {
    await database.transaction(async (transactionDatabase) => {
        await deleteRoomRecords(transactionDatabase, roomId);
    });
}

async function deleteRoomRecords(database: DbExecutor, roomId: string) {
    for (const table of [
        "chatroom_typing",
        "chat_message_reactions",
        "chat_messages",
        "chatroom_keys",
        "chatroom_members",
    ]) {
        await database.executeCommand({
            option: "DELETE",
            table,
            where: [{ column: "chatroom_id", value: roomId }],
        });
    }
    await database.executeCommand({
        option: "DELETE",
        table: "chat_message_requests",
        where: [{ column: "room_id", value: roomId }],
    });
    await database.executeCommand({
        option: "DELETE",
        table: "chatrooms",
        where: [{ column: "id", value: roomId }],
    });
}

export async function deleteRoomForActor(
    database: DbExecutor,
    roomId: string,
    actorAccountId: string,
): Promise<"deleted" | "forbidden" | "not_found"> {
    return database.transaction(async (transactionDatabase) => {
        const room = await getRoom(transactionDatabase, roomId);
        if (!room) return "not_found";
        const members = await listMembers(transactionDatabase, roomId);
        const isOwner = room.createdBy === actorAccountId;
        const isSoleParticipant =
            members.length === 1 && members[0]?.accountId === actorAccountId;
        if (!isOwner && !isSoleParticipant) return "forbidden";
        await deleteRoomRecords(transactionDatabase, roomId);
        return "deleted";
    });
}

export async function getMember(
    database: DbExecutor,
    roomId: string,
    accountId: string,
): Promise<MemberRow | null> {
    const result = await database.executeCommand({
        option: "SELECT",
        table: "chatroom_members",
        where: [
            { column: "chatroom_id", value: roomId },
            { column: "account_id", value: accountId },
        ],
    });
    return result.rows?.[0] ? rowToMember(result.rows[0]) : null;
}

export async function listMembers(
    database: DbExecutor,
    roomId: string,
): Promise<MemberRow[]> {
    const result = await database.executeCommand({
        option: "SELECT",
        table: "chatroom_members",
        where: [{ column: "chatroom_id", value: roomId }],
        orderBy: [{ column: "joined_at", direction: "ASC" }],
    });
    return (result.rows ?? []).map((row) => rowToMember(row));
}

export async function listRoomsForAccount(
    database: DbExecutor,
    accountId: string,
): Promise<RoomRow[]> {
    const result = await database.executeCommand({
        option: "SELECT",
        table: "chatrooms",
        alias: "chatrooms",
        joins: [
            {
                type: "INNER",
                table: "chatroom_members",
                alias: "chatroom_members",
                on: {
                    leftColumn: "chatroom_members.chatroom_id",
                    rightColumn: "chatrooms.id",
                },
            },
        ],
        where: [{ column: "chatroom_members.account_id", value: accountId }],
        orderBy: [{ column: "chatrooms.updated_at", direction: "DESC" }],
    });
    return (result.rows ?? []).map((row) => rowToRoom(row));
}

async function findDirectMessageBetween(
    database: DbExecutor,
    accountA: string,
    accountB: string,
): Promise<RoomRow | null> {
    const result = await database.executeCommand({
        option: "SELECT",
        table: "chatrooms",
        alias: "chatrooms",
        columns: [
            { col: "chatrooms.id", as: "id" },
            { col: "chatrooms.kind", as: "kind" },
            { col: "chatrooms.title", as: "title" },
            { col: "chatrooms.avatar_key", as: "avatar_key" },
            { col: "chatrooms.created_by", as: "created_by" },
            { col: "chatrooms.created_at", as: "created_at" },
            { col: "chatrooms.updated_at", as: "updated_at" },
        ],
        joins: [
            {
                type: "INNER",
                table: "chatroom_members",
                alias: "member_a",
                on: {
                    leftColumn: "member_a.chatroom_id",
                    rightColumn: "chatrooms.id",
                },
            },
            {
                type: "INNER",
                table: "chatroom_members",
                alias: "member_b",
                on: {
                    leftColumn: "member_b.chatroom_id",
                    rightColumn: "chatrooms.id",
                },
            },
        ],
        where: [
            { column: "chatrooms.kind", value: "dm" },
            { column: "member_a.account_id", value: accountA },
            { column: "member_b.account_id", value: accountB },
        ],
        orderBy: [{ column: "chatrooms.updated_at", direction: "DESC" }],
    });
    for (const row of result.rows ?? []) {
        const room = rowToRoom(row);
        const memberIds = (await listMembers(database, room.id)).map(
            (member) => member.accountId,
        );
        const hasExactParticipants =
            memberIds.length === 2 &&
            memberIds.includes(accountA) &&
            memberIds.includes(accountB);
        if (hasExactParticipants) return room;
    }
    return null;
}
export { findDirectMessageBetween as findDmBetween };

export async function updateRoomTitle(
    database: DbExecutor,
    roomId: string,
    title: string | null,
): Promise<RoomRow | null> {
    await database.executeCommand({
        option: "UPDATE",
        table: "chatrooms",
        set: {
            title,
            updated_at: new Date().toISOString(),
        },
        where: [{ column: "id", value: roomId }],
    });
    return getRoom(database, roomId);
}

export async function findGroupByExactMembers(
    database: DbExecutor,
    memberAccountIds: string[],
): Promise<RoomRow | null> {
    const normalizedMembers = Array.from(
        new Set(
            memberAccountIds
                .map((accountId) => String(accountId ?? "").trim())
                .filter(Boolean),
        ),
    ).sort();
    if (normalizedMembers.length < 2) {
        return null;
    }

    const candidateRoomsResult = await database.executeCommand({
        option: "SELECT",
        table: "chatrooms",
        where: [{ column: "kind", value: "group" }],
        orderBy: [{ column: "updated_at", direction: "DESC" }],
        limit: 250,
    });
    const candidates = (candidateRoomsResult.rows ?? []).map((row) =>
        rowToRoom(row),
    );
    if (candidates.length === 0) {
        return null;
    }

    const candidateRoomIds = candidates.map((candidate) => candidate.id);
    const candidateMembersResult = await database.executeCommand({
        option: "SELECT",
        table: "chatroom_members",
        where: [
            {
                column: "chatroom_id",
                operator: "IN",
                value: candidateRoomIds,
            },
        ],
    });
    const membersByRoomId = new Map<string, string[]>();
    for (const row of candidateMembersResult.rows ?? []) {
        const roomId = String(row.chatroom_id ?? "").trim();
        const accountId = String(row.account_id ?? "").trim();
        if (!roomId || !accountId) {
            continue;
        }
        if (!membersByRoomId.has(roomId)) {
            membersByRoomId.set(roomId, []);
        }
        membersByRoomId.get(roomId)?.push(accountId);
    }

    for (const candidate of candidates) {
        const normalizedCandidateMembers = Array.from(
            new Set(membersByRoomId.get(candidate.id) ?? []),
        ).sort();
        if (
            normalizedCandidateMembers.length === normalizedMembers.length &&
            normalizedCandidateMembers.every(
                (accountId, index) => accountId === normalizedMembers[index],
            )
        ) {
            return candidate;
        }
    }

    return null;
}

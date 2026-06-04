import { randomUUID } from "node:crypto";
import type { DbExecutor } from "../../../../gateways/db/reuse/db-executor.js";
import { rowToMember, rowToRoom } from "./row-mappers.js";
import type { ChatroomKind, MemberRole, MemberRow, RoomRow } from "./types.js";

export async function createRoom(
    db: DbExecutor,
    kind: ChatroomKind,
    title: string | null,
    createdBy: string,
): Promise<RoomRow> {
    const id = randomUUID();
    const nowIso = new Date().toISOString();
    await db.executeCommand({
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
    const result = await db.executeCommand({
        option: "SELECT",
        table: "chatrooms",
        where: [{ column: "id", value: id }],
    });
    return rowToRoom(result.rows![0]);
}

export async function getRoom(
    db: DbExecutor,
    id: string,
): Promise<RoomRow | null> {
    const result = await db.executeCommand({
        option: "SELECT",
        table: "chatrooms",
        where: [{ column: "id", value: id }],
    });
    return result.rows?.[0] ? rowToRoom(result.rows[0]) : null;
}

export async function updateRoomAvatar(
    db: DbExecutor,
    roomId: string,
    avatarKey: string | null,
): Promise<RoomRow | null> {
    await db.executeCommand({
        option: "UPDATE",
        table: "chatrooms",
        set: {
            avatar_key: avatarKey,
            updated_at: new Date().toISOString(),
        },
        where: [{ column: "id", value: roomId }],
    });
    return getRoom(db, roomId);
}

export async function addMember(
    db: DbExecutor,
    roomId: string,
    accountId: string,
    role: MemberRole,
): Promise<void> {
    await db.executeCommand({
        option: "INSERT",
        table: "chatroom_members",
        values: { chatroom_id: roomId, account_id: accountId, role },
        conflict: { action: "ignore" },
    });
}

export async function removeMember(
    db: DbExecutor,
    roomId: string,
    accountId: string,
): Promise<void> {
    await db.executeCommand({
        option: "DELETE",
        table: "chatroom_members",
        where: [
            { column: "chatroom_id", value: roomId },
            { column: "account_id", value: accountId },
        ],
    });
}

export async function getMember(
    db: DbExecutor,
    roomId: string,
    accountId: string,
): Promise<MemberRow | null> {
    const result = await db.executeCommand({
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
    db: DbExecutor,
    roomId: string,
): Promise<MemberRow[]> {
    const result = await db.executeCommand({
        option: "SELECT",
        table: "chatroom_members",
        where: [{ column: "chatroom_id", value: roomId }],
        orderBy: [{ column: "joined_at", direction: "ASC" }],
    });
    return (result.rows ?? []).map((row) => rowToMember(row));
}

export async function listRoomsForAccount(
    db: DbExecutor,
    accountId: string,
): Promise<RoomRow[]> {
    const result = await db.executeCommand({
        option: "SELECT",
        table: "chatrooms",
        alias: "c",
        joins: [
            {
                type: "INNER",
                table: "chatroom_members",
                alias: "m",
                on: { leftColumn: "m.chatroom_id", rightColumn: "c.id" },
            },
        ],
        where: [{ column: "m.account_id", value: accountId }],
        orderBy: [{ column: "c.updated_at", direction: "DESC" }],
    });
    return (result.rows ?? []).map((row) => rowToRoom(row));
}

export async function findDmBetween(
    db: DbExecutor,
    accountA: string,
    accountB: string,
): Promise<RoomRow | null> {
    const result = await db.executeCommand({
        option: "SELECT",
        table: "chatrooms",
        alias: "c",
        joins: [
            {
                type: "INNER",
                table: "chatroom_members",
                alias: "m1",
                on: { leftColumn: "m1.chatroom_id", rightColumn: "c.id" },
            },
            {
                type: "INNER",
                table: "chatroom_members",
                alias: "m2",
                on: { leftColumn: "m2.chatroom_id", rightColumn: "c.id" },
            },
        ],
        where: [
            { column: "m1.account_id", value: accountA },
            { column: "m2.account_id", value: accountB },
            { column: "c.kind", value: "dm" },
        ],
        limit: 1,
    });
    return result.rows?.[0] ? rowToRoom(result.rows[0]) : null;
}

export async function updateRoomTitle(
    db: DbExecutor,
    roomId: string,
    title: string | null,
): Promise<RoomRow | null> {
    await db.executeCommand({
        option: "UPDATE",
        table: "chatrooms",
        set: {
            title,
            updated_at: new Date().toISOString(),
        },
        where: [{ column: "id", value: roomId }],
    });
    return getRoom(db, roomId);
}

export async function findGroupByExactMembers(
    db: DbExecutor,
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

    const candidateRoomsResult = await db.executeCommand({
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
    const candidateMembersResult = await db.executeCommand({
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

/**
 * DbMessagesStore — persistence layer for the messages adapter.
 *
 * Responsibilities:
 *   - Schema migration for the four tables: chatrooms, chatroom_members,
 *     chat_messages, chatroom_keys.
 *   - All CRUD operations on those tables.
 *   - At-rest re-wrapping of message bodies using DATA_ENCRYPTION_KEY,
 *     mirroring the pattern used by the internal notification adapter. The
 *     message bodies are already encrypted by the client using a per-room
 *     symmetric key; this adapter re-wraps the resulting ciphertext blob with
 *     a process-secret-derived AES-GCM key so a DB-only compromise still
 *     yields nothing readable.
 *
 * Public exports:
 *   DbMessagesStore — the store class.
 *   ChatroomKind, MemberRole, MessageRow, RoomRow, MemberRow — types.
 *
 * Threat model: see docs/standard.en.md in this adapter.
 */

import { randomUUID, randomBytes } from "node:crypto";
import type { DbExecutor } from "../../../gateways/db/reuse/db-executor.js";
import {
    deriveScopedKey,
    encryptPayload,
    decryptPayload,
    getDataEncryptionKey,
} from "../../../api/reuse/crypto.js";

export type ChatroomKind = "dm" | "group" | "classroom";
export type MemberRole = "owner" | "admin" | "member";

export interface RoomRow {
    id: string;
    kind: ChatroomKind;
    title: string | null;
    avatarKey: string | null;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}

export interface MemberRow {
    chatroomId: string;
    accountId: string;
    role: MemberRole;
    joinedAt: string;
    lastReadAt: string | null;
    muted: boolean;
}

export interface MessageRow {
    id: string;
    chatroomId: string;
    senderId: string;
    /** Client-encrypted payload (hex). */
    ciphertext: string;
    /** Client IV (hex). */
    iv: string;
    /** Client GCM auth tag (hex). May be empty when included in ciphertext. */
    authTag: string;
    contentType: string;
    createdAt: string;
}

export class DbMessagesStore {
    constructor(private readonly db: DbExecutor) {}

    async ensureSchema(): Promise<void> {
        await this.db.ensureTable({
            name: "chatrooms",
            columns: [
                { name: "id", type: "text", primaryKey: true },
                { name: "kind", type: "text", notNull: true },
                { name: "title", type: "text" },
                { name: "avatar_key", type: "text" },
                { name: "created_by", type: "text", notNull: true },
                {
                    name: "created_at",
                    type: "timestamp",
                    notNull: true,
                    default: "now",
                },
                {
                    name: "updated_at",
                    type: "timestamp",
                    notNull: true,
                    default: "now",
                },
            ],
        });

        await this.db.ensureTable({
            name: "chatroom_members",
            columns: [
                { name: "chatroom_id", type: "text", notNull: true },
                { name: "account_id", type: "text", notNull: true },
                { name: "role", type: "text", notNull: true },
                {
                    name: "joined_at",
                    type: "timestamp",
                    notNull: true,
                    default: "now",
                },
                { name: "last_read_at", type: "timestamp" },
                { name: "muted", type: "integer", notNull: true, default: 0 },
            ],
            primaryKey: ["chatroom_id", "account_id"],
            indexes: [
                {
                    columns: ["account_id"],
                    name: "idx_chatroom_members_account",
                },
            ],
        });

        await this.db.ensureTable({
            name: "chat_messages",
            columns: [
                { name: "id", type: "text", primaryKey: true },
                { name: "chatroom_id", type: "text", notNull: true },
                { name: "sender_id", type: "text", notNull: true },
                { name: "ciphertext", type: "text", notNull: true },
                { name: "iv", type: "text", notNull: true },
                { name: "auth_tag", type: "text", notNull: true, default: "" },
                {
                    name: "content_type",
                    type: "text",
                    notNull: true,
                    default: "text/plain",
                },
                {
                    name: "created_at",
                    type: "timestamp",
                    notNull: true,
                    default: "now",
                },
            ],
            indexes: [
                {
                    columns: ["chatroom_id", "created_at"],
                    name: "idx_chat_messages_room_time",
                },
            ],
        });

        await this.db.ensureTable({
            name: "chatroom_keys",
            columns: [
                { name: "chatroom_id", type: "text", primaryKey: true },
                { name: "wrapped_key", type: "text", notNull: true },
                { name: "key_iv", type: "text", notNull: true },
                {
                    name: "created_at",
                    type: "timestamp",
                    notNull: true,
                    default: "now",
                },
            ],
        });
    }

    private rowToRoom(row: Record<string, unknown>): RoomRow {
        return {
            id: String(row.id),
            kind: row.kind as ChatroomKind,
            title: (row.title as string | null) ?? null,
            avatarKey: (row.avatar_key as string | null) ?? null,
            createdBy: String(row.created_by),
            createdAt: String(row.created_at),
            updatedAt: String(row.updated_at),
        };
    }

    private rowToMember(row: Record<string, unknown>): MemberRow {
        return {
            chatroomId: String(row.chatroom_id),
            accountId: String(row.account_id),
            role: row.role as MemberRole,
            joinedAt: String(row.joined_at),
            lastReadAt: (row.last_read_at as string | null) ?? null,
            muted: Boolean(row.muted),
        };
    }

    private rowToMessage(row: Record<string, unknown>): MessageRow {
        return {
            id: String(row.id),
            chatroomId: String(row.chatroom_id),
            senderId: String(row.sender_id),
            ciphertext: String(row.ciphertext),
            iv: String(row.iv),
            authTag: String(row.auth_tag ?? ""),
            contentType: String(row.content_type ?? "text/plain"),
            createdAt: String(row.created_at),
        };
    }

    async createRoom(
        kind: ChatroomKind,
        title: string | null,
        createdBy: string,
    ): Promise<RoomRow> {
        const id = randomUUID();
        const nowIso = new Date().toISOString();
        await this.db.executeCommand({
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
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "chatrooms",
            where: [{ column: "id", value: id }],
        });
        return this.rowToRoom(result.rows![0]);
    }

    async getRoom(id: string): Promise<RoomRow | null> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "chatrooms",
            where: [{ column: "id", value: id }],
        });
        return result.rows?.[0] ? this.rowToRoom(result.rows[0]) : null;
    }

    async updateRoomAvatar(
        roomId: string,
        avatarKey: string | null,
    ): Promise<RoomRow | null> {
        await this.db.executeCommand({
            option: "UPDATE",
            table: "chatrooms",
            set: {
                avatar_key: avatarKey,
                updated_at: new Date().toISOString(),
            },
            where: [{ column: "id", value: roomId }],
        });
        return this.getRoom(roomId);
    }

    async addMember(
        roomId: string,
        accountId: string,
        role: MemberRole,
    ): Promise<void> {
        await this.db.executeCommand({
            option: "INSERT",
            table: "chatroom_members",
            values: { chatroom_id: roomId, account_id: accountId, role },
            conflict: { action: "ignore" },
        });
    }

    async removeMember(roomId: string, accountId: string): Promise<void> {
        await this.db.executeCommand({
            option: "DELETE",
            table: "chatroom_members",
            where: [
                { column: "chatroom_id", value: roomId },
                { column: "account_id", value: accountId },
            ],
        });
    }

    async getMember(
        roomId: string,
        accountId: string,
    ): Promise<MemberRow | null> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "chatroom_members",
            where: [
                { column: "chatroom_id", value: roomId },
                { column: "account_id", value: accountId },
            ],
        });
        return result.rows?.[0] ? this.rowToMember(result.rows[0]) : null;
    }

    async listMembers(roomId: string): Promise<MemberRow[]> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "chatroom_members",
            where: [{ column: "chatroom_id", value: roomId }],
            orderBy: [{ column: "joined_at", direction: "ASC" }],
        });
        return (result.rows ?? []).map((row) => this.rowToMember(row));
    }

    async listRoomsForAccount(accountId: string): Promise<RoomRow[]> {
        const result = await this.db.executeCommand({
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
        return (result.rows ?? []).map((row) => this.rowToRoom(row));
    }

    /** Returns a DM room shared by both accounts, or null. */
    async findDmBetween(a: string, b: string): Promise<RoomRow | null> {
        const result = await this.db.executeCommand({
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
                { column: "m1.account_id", value: a },
                { column: "m2.account_id", value: b },
                { column: "c.kind", value: "dm" },
            ],
            limit: 1,
        });
        return result.rows?.[0] ? this.rowToRoom(result.rows[0]) : null;
    }

    async appendMessage(input: {
        roomId: string;
        senderId: string;
        ciphertext: string;
        iv: string;
        authTag?: string;
        contentType?: string;
    }): Promise<MessageRow> {
        const id = randomUUID();
        const nowIso = new Date().toISOString();
        return this.db.transaction(async (executor) => {
            await executor.executeCommand({
                option: "INSERT",
                table: "chat_messages",
                values: {
                    id,
                    chatroom_id: input.roomId,
                    sender_id: input.senderId,
                    ciphertext: input.ciphertext,
                    iv: input.iv,
                    auth_tag: input.authTag ?? "",
                    content_type: input.contentType ?? "text/plain",
                    created_at: nowIso,
                },
            });
            await executor.executeCommand({
                option: "UPDATE",
                table: "chatrooms",
                set: { updated_at: nowIso },
                where: [{ column: "id", value: input.roomId }],
            });
            const result = await executor.executeCommand({
                option: "SELECT",
                table: "chat_messages",
                where: [{ column: "id", value: id }],
            });
            return this.rowToMessage(result.rows![0]);
        });
    }

    async listMessages(
        roomId: string,
        limit: number,
        before?: string,
    ): Promise<MessageRow[]> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "chat_messages",
            where: [
                { column: "chatroom_id", value: roomId },
                ...(before
                    ? [
                          {
                              column: "created_at",
                              operator: "<" as const,
                              value: before,
                          },
                      ]
                    : []),
            ],
            orderBy: [{ column: "created_at", direction: "DESC" }],
            limit,
        });
        return (result.rows ?? []).map((row) => this.rowToMessage(row));
    }

    async markRead(roomId: string, accountId: string): Promise<void> {
        await this.db.executeCommand({
            option: "UPDATE",
            table: "chatroom_members",
            set: { last_read_at: new Date().toISOString() },
            where: [
                { column: "chatroom_id", value: roomId },
                { column: "account_id", value: accountId },
            ],
        });
    }

    async unreadCount(roomId: string, accountId: string): Promise<number> {
        const member = await this.getMember(roomId, accountId);
        if (!member) return 0;
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "chat_messages",
            count: true,
            where: [
                { column: "chatroom_id", value: roomId },
                {
                    column: "sender_id",
                    operator: "!=",
                    value: accountId,
                },
                ...(member.lastReadAt
                    ? [
                          {
                              column: "created_at",
                              operator: ">",
                              value: member.lastReadAt,
                          },
                      ]
                    : []),
            ],
        });
        return Number(result.rows?.[0]?.cnt ?? 0);
    }

    async setMuted(
        roomId: string,
        accountId: string,
        muted: boolean,
    ): Promise<void> {
        await this.db.executeCommand({
            option: "UPDATE",
            table: "chatroom_members",
            set: { muted: muted ? 1 : 0 },
            where: [
                { column: "chatroom_id", value: roomId },
                { column: "account_id", value: accountId },
            ],
        });
    }

    async storeWrappedRoomKey(
        roomId: string,
        plaintextKeyHex: string,
    ): Promise<void> {
        const secret = getDataEncryptionKey();
        const wrapper = await deriveScopedKey(
            `social:messages:room:${roomId}`,
            secret,
        );
        const { iv, ciphertext } = await encryptPayload(
            wrapper,
            plaintextKeyHex,
        );
        await this.db.executeCommand({
            option: "INSERT",
            table: "chatroom_keys",
            values: {
                chatroom_id: roomId,
                wrapped_key: ciphertext,
                key_iv: iv,
            },
            conflict: { action: "update", target: ["chatroom_id"] },
        });
    }

    async getUnwrappedRoomKey(roomId: string): Promise<string | null> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "chatroom_keys",
            columns: ["wrapped_key", "key_iv"],
            where: [{ column: "chatroom_id", value: roomId }],
        });
        const row = result.rows?.[0];
        if (!row) return null;
        const secret = getDataEncryptionKey();
        const wrapper = await deriveScopedKey(
            `social:messages:room:${roomId}`,
            secret,
        );
        return decryptPayload(
            wrapper,
            String(row.key_iv),
            String(row.wrapped_key),
        );
    }

    /**
     * Generates a fresh random 32-byte AES-256 room key (hex-encoded) and
     * persists the wrapped form. Returns the plaintext hex that should be
     * cached in memory by the creator and re-fetched (over TLS) by other
     * authorized members on demand.
     */
    async generateAndStoreRoomKey(roomId: string): Promise<string> {
        const plaintextHex = randomBytes(32).toString("hex");
        await this.storeWrappedRoomKey(roomId, plaintextHex);
        return plaintextHex;
    }
}

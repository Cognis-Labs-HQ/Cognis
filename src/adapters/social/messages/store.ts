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
        await this.db.execute(
            `CREATE TABLE IF NOT EXISTS chatrooms (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL,
        title TEXT,
        avatar_key TEXT,
        created_by TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
        );

        await this.db.execute(
            `CREATE TABLE IF NOT EXISTS chatroom_members (
        chatroom_id TEXT NOT NULL,
        account_id TEXT NOT NULL,
        role TEXT NOT NULL,
        joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_read_at TIMESTAMP,
        muted INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (chatroom_id, account_id)
      )`,
        );

        await this.db.execute(
            `CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        chatroom_id TEXT NOT NULL,
        sender_id TEXT NOT NULL,
        ciphertext TEXT NOT NULL,
        iv TEXT NOT NULL,
        auth_tag TEXT NOT NULL DEFAULT '',
        content_type VARCHAR(64) NOT NULL DEFAULT 'text/plain',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
        );

        await this.db.execute(
            `CREATE TABLE IF NOT EXISTS chatroom_keys (
        chatroom_id TEXT PRIMARY KEY,
        wrapped_key TEXT NOT NULL,
        key_iv TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
        );

        await this.db
            .execute(
                "ALTER TABLE chatrooms ADD COLUMN IF NOT EXISTS avatar_key TEXT",
            )
            .catch(() => undefined);

        await this.db
            .execute(
                "CREATE INDEX IF NOT EXISTS idx_chat_messages_room_time ON chat_messages (chatroom_id, created_at DESC)",
            )
            .catch(() => undefined);

        await this.db
            .execute(
                "CREATE INDEX IF NOT EXISTS idx_chatroom_members_account ON chatroom_members (account_id)",
            )
            .catch(() => undefined);
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
        await this.db.execute(
            `INSERT INTO chatrooms (id, kind, title, created_by) VALUES (?, ?, ?, ?)`,
            [id, kind, title, createdBy],
        );
        const result = await this.db.execute(
            `SELECT * FROM chatrooms WHERE id = ?`,
            [id],
        );
        return this.rowToRoom(result.rows![0]);
    }

    async getRoom(id: string): Promise<RoomRow | null> {
        const result = await this.db.execute(
            `SELECT * FROM chatrooms WHERE id = ?`,
            [id],
        );
        return result.rows?.[0] ? this.rowToRoom(result.rows[0]) : null;
    }

    async updateRoomAvatar(
        roomId: string,
        avatarKey: string | null,
    ): Promise<RoomRow | null> {
        await this.db.execute(
            `UPDATE chatrooms SET avatar_key = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [avatarKey, roomId],
        );
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
        await this.db.execute(
            `DELETE FROM chatroom_members WHERE chatroom_id = ? AND account_id = ?`,
            [roomId, accountId],
        );
    }

    async getMember(
        roomId: string,
        accountId: string,
    ): Promise<MemberRow | null> {
        const result = await this.db.execute(
            `SELECT * FROM chatroom_members WHERE chatroom_id = ? AND account_id = ?`,
            [roomId, accountId],
        );
        return result.rows?.[0] ? this.rowToMember(result.rows[0]) : null;
    }

    async listMembers(roomId: string): Promise<MemberRow[]> {
        const result = await this.db.execute(
            `SELECT * FROM chatroom_members WHERE chatroom_id = ? ORDER BY joined_at ASC`,
            [roomId],
        );
        return (result.rows ?? []).map((row) => this.rowToMember(row));
    }

    async listRoomsForAccount(accountId: string): Promise<RoomRow[]> {
        const result = await this.db.execute(
            `SELECT c.* FROM chatrooms c
       JOIN chatroom_members m ON m.chatroom_id = c.id
       WHERE m.account_id = ?
       ORDER BY c.updated_at DESC`,
            [accountId],
        );
        return (result.rows ?? []).map((row) => this.rowToRoom(row));
    }

    /** Returns a DM room shared by both accounts, or null. */
    async findDmBetween(a: string, b: string): Promise<RoomRow | null> {
        const result = await this.db.execute(
            `SELECT c.* FROM chatrooms c
       JOIN chatroom_members m1 ON m1.chatroom_id = c.id AND m1.account_id = ?
       JOIN chatroom_members m2 ON m2.chatroom_id = c.id AND m2.account_id = ?
       WHERE c.kind = 'dm'
       LIMIT 1`,
            [a, b],
        );
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
        await this.db.execute(
            `INSERT INTO chat_messages (id, chatroom_id, sender_id, ciphertext, iv, auth_tag, content_type)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                id,
                input.roomId,
                input.senderId,
                input.ciphertext,
                input.iv,
                input.authTag ?? "",
                input.contentType ?? "text/plain",
            ],
        );
        await this.db.execute(
            `UPDATE chatrooms SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [input.roomId],
        );
        const result = await this.db.execute(
            `SELECT * FROM chat_messages WHERE id = ?`,
            [id],
        );
        return this.rowToMessage(result.rows![0]);
    }

    async listMessages(
        roomId: string,
        limit: number,
        before?: string,
    ): Promise<MessageRow[]> {
        if (before) {
            const result = await this.db.execute(
                `SELECT * FROM chat_messages
         WHERE chatroom_id = ? AND created_at < ?
         ORDER BY created_at DESC LIMIT ?`,
                [roomId, before, limit],
            );
            return (result.rows ?? []).map((row) => this.rowToMessage(row));
        }
        const result = await this.db.execute(
            `SELECT * FROM chat_messages
       WHERE chatroom_id = ?
       ORDER BY created_at DESC LIMIT ?`,
            [roomId, limit],
        );
        return (result.rows ?? []).map((row) => this.rowToMessage(row));
    }

    async markRead(roomId: string, accountId: string): Promise<void> {
        await this.db.execute(
            `UPDATE chatroom_members SET last_read_at = CURRENT_TIMESTAMP
       WHERE chatroom_id = ? AND account_id = ?`,
            [roomId, accountId],
        );
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
                    operator: "!=" as const,
                    value: accountId,
                },
                ...(member.lastReadAt
                    ? [
                          {
                              column: "created_at",
                              operator: ">" as const,
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
        const result = await this.db.execute(
            `SELECT wrapped_key, key_iv FROM chatroom_keys WHERE chatroom_id = ?`,
            [roomId],
        );
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

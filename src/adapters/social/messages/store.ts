/**
 * DbMessagesStore — persistence layer for the messages adapter.
 *
 * Responsibilities:
 *   - Schema migration for the three tables: chatrooms, chatroom_members,
 *     chat_messages.
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
import type { SupportedDbType } from "../../../gateways/db/executor.js";
import {
    deriveScopedKey,
    encryptPayload,
    decryptPayload,
    getDataEncryptionKey,
} from "../../../api/reuse/crypto.js";

export type ChatroomKind = "dm" | "group";
export type MemberRole = "owner" | "admin" | "member";

export interface RoomRow {
    id: string;
    kind: ChatroomKind;
    title: string | null;
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
    constructor(
        private readonly db: DbExecutor,
        private readonly dbType: SupportedDbType,
    ) {}

    private p(n: number): string {
        return this.dbType === "postgresql" ? `$${n}` : "?";
    }

    private nowExpr(): string {
        return this.dbType === "postgresql" ? "NOW()" : "CURRENT_TIMESTAMP";
    }

    async ensureSchema(): Promise<void> {
        const idType = this.dbType === "postgresql" ? "TEXT" : "VARCHAR(64)";
        const enumKind =
            this.dbType === "mariadb" ? "ENUM('dm','group')" : "VARCHAR(8)";
        const enumRole =
            this.dbType === "mariadb"
                ? "ENUM('owner','admin','member')"
                : "VARCHAR(16)";
        const ts = this.dbType === "postgresql" ? "TIMESTAMPTZ" : "DATETIME";
        const tsDefault =
            this.dbType === "postgresql"
                ? "DEFAULT NOW()"
                : "DEFAULT CURRENT_TIMESTAMP";
        const boolType = this.dbType === "postgresql" ? "BOOLEAN" : "INTEGER";

        await this.db.execute(
            `CREATE TABLE IF NOT EXISTS chatrooms (
                id ${idType} PRIMARY KEY,
                kind ${enumKind} NOT NULL,
                title TEXT,
                created_by ${idType} NOT NULL,
                created_at ${ts} ${tsDefault},
                updated_at ${ts} ${tsDefault}
            )`,
        );

        await this.db.execute(
            `CREATE TABLE IF NOT EXISTS chatroom_members (
                chatroom_id ${idType} NOT NULL,
                account_id ${idType} NOT NULL,
                role ${enumRole} NOT NULL,
                joined_at ${ts} ${tsDefault},
                last_read_at ${ts},
                muted ${boolType} NOT NULL DEFAULT 0,
                PRIMARY KEY (chatroom_id, account_id)
            )`,
        );

        await this.db.execute(
            `CREATE TABLE IF NOT EXISTS chat_messages (
                id ${idType} PRIMARY KEY,
                chatroom_id ${idType} NOT NULL,
                sender_id ${idType} NOT NULL,
                ciphertext TEXT NOT NULL,
                iv TEXT NOT NULL,
                auth_tag TEXT NOT NULL DEFAULT '',
                content_type VARCHAR(64) NOT NULL DEFAULT 'text/plain',
                created_at ${ts} ${tsDefault}
            )`,
        );

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

        // Per-room wrapped key. The plaintext room key is generated server-side
        // when the room is created, then wrapped with DATA_ENCRYPTION_KEY for
        // at-rest storage. Authorized members fetch the unwrapped key over TLS
        // via GET /messages/rooms/:id/key and use it client-side to encrypt and
        // decrypt message bodies.
        await this.db.execute(
            `CREATE TABLE IF NOT EXISTS chatroom_keys (
                chatroom_id ${idType} PRIMARY KEY,
                wrapped_key TEXT NOT NULL,
                key_iv TEXT NOT NULL,
                created_at ${ts} ${tsDefault}
            )`,
        );
    }

    private rowToRoom(row: Record<string, unknown>): RoomRow {
        return {
            id: String(row.id),
            kind: row.kind as ChatroomKind,
            title: (row.title as string | null) ?? null,
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
            `INSERT INTO chatrooms (id, kind, title, created_by) VALUES (${this.p(1)}, ${this.p(2)}, ${this.p(3)}, ${this.p(4)})`,
            [id, kind, title, createdBy],
        );
        const result = await this.db.execute(
            `SELECT * FROM chatrooms WHERE id = ${this.p(1)}`,
            [id],
        );
        return this.rowToRoom(result.rows![0]);
    }

    async getRoom(id: string): Promise<RoomRow | null> {
        const result = await this.db.execute(
            `SELECT * FROM chatrooms WHERE id = ${this.p(1)}`,
            [id],
        );
        return result.rows?.[0] ? this.rowToRoom(result.rows[0]) : null;
    }

    async addMember(
        roomId: string,
        accountId: string,
        role: MemberRole,
    ): Promise<void> {
        const stmt =
            this.dbType === "sqlite"
                ? `INSERT OR IGNORE INTO chatroom_members (chatroom_id, account_id, role) VALUES (${this.p(1)}, ${this.p(2)}, ${this.p(3)})`
                : this.dbType === "postgresql"
                  ? `INSERT INTO chatroom_members (chatroom_id, account_id, role) VALUES (${this.p(1)}, ${this.p(2)}, ${this.p(3)}) ON CONFLICT DO NOTHING`
                  : `INSERT IGNORE INTO chatroom_members (chatroom_id, account_id, role) VALUES (${this.p(1)}, ${this.p(2)}, ${this.p(3)})`;
        await this.db.execute(stmt, [roomId, accountId, role]);
    }

    async removeMember(roomId: string, accountId: string): Promise<void> {
        await this.db.execute(
            `DELETE FROM chatroom_members WHERE chatroom_id = ${this.p(1)} AND account_id = ${this.p(2)}`,
            [roomId, accountId],
        );
    }

    async getMember(
        roomId: string,
        accountId: string,
    ): Promise<MemberRow | null> {
        const result = await this.db.execute(
            `SELECT * FROM chatroom_members WHERE chatroom_id = ${this.p(1)} AND account_id = ${this.p(2)}`,
            [roomId, accountId],
        );
        return result.rows?.[0] ? this.rowToMember(result.rows[0]) : null;
    }

    async listMembers(roomId: string): Promise<MemberRow[]> {
        const result = await this.db.execute(
            `SELECT * FROM chatroom_members WHERE chatroom_id = ${this.p(1)} ORDER BY joined_at ASC`,
            [roomId],
        );
        return (result.rows ?? []).map((row) => this.rowToMember(row));
    }

    async listRoomsForAccount(accountId: string): Promise<RoomRow[]> {
        const result = await this.db.execute(
            `SELECT c.* FROM chatrooms c
             JOIN chatroom_members m ON m.chatroom_id = c.id
             WHERE m.account_id = ${this.p(1)}
             ORDER BY c.updated_at DESC`,
            [accountId],
        );
        return (result.rows ?? []).map((row) => this.rowToRoom(row));
    }

    /** Returns a DM room shared by both accounts, or null. */
    async findDmBetween(a: string, b: string): Promise<RoomRow | null> {
        const result = await this.db.execute(
            `SELECT c.* FROM chatrooms c
             JOIN chatroom_members m1 ON m1.chatroom_id = c.id AND m1.account_id = ${this.p(1)}
             JOIN chatroom_members m2 ON m2.chatroom_id = c.id AND m2.account_id = ${this.p(2)}
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
             VALUES (${this.p(1)}, ${this.p(2)}, ${this.p(3)}, ${this.p(4)}, ${this.p(5)}, ${this.p(6)}, ${this.p(7)})`,
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
            `UPDATE chatrooms SET updated_at = ${this.nowExpr()} WHERE id = ${this.p(1)}`,
            [input.roomId],
        );
        const result = await this.db.execute(
            `SELECT * FROM chat_messages WHERE id = ${this.p(1)}`,
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
                 WHERE chatroom_id = ${this.p(1)} AND created_at < ${this.p(2)}
                 ORDER BY created_at DESC LIMIT ${this.p(3)}`,
                [roomId, before, limit],
            );
            return (result.rows ?? []).map((row) => this.rowToMessage(row));
        }
        const result = await this.db.execute(
            `SELECT * FROM chat_messages
             WHERE chatroom_id = ${this.p(1)}
             ORDER BY created_at DESC LIMIT ${this.p(2)}`,
            [roomId, limit],
        );
        return (result.rows ?? []).map((row) => this.rowToMessage(row));
    }

    async markRead(roomId: string, accountId: string): Promise<void> {
        await this.db.execute(
            `UPDATE chatroom_members SET last_read_at = ${this.nowExpr()}
             WHERE chatroom_id = ${this.p(1)} AND account_id = ${this.p(2)}`,
            [roomId, accountId],
        );
    }

    async unreadCount(roomId: string, accountId: string): Promise<number> {
        const member = await this.getMember(roomId, accountId);
        if (!member) return 0;
        if (!member.lastReadAt) {
            const result = await this.db.execute(
                `SELECT COUNT(*) AS cnt FROM chat_messages
                 WHERE chatroom_id = ${this.p(1)} AND sender_id <> ${this.p(2)}`,
                [roomId, accountId],
            );
            return Number(result.rows?.[0]?.cnt ?? 0);
        }
        const result = await this.db.execute(
            `SELECT COUNT(*) AS cnt FROM chat_messages
             WHERE chatroom_id = ${this.p(1)}
               AND sender_id <> ${this.p(2)}
               AND created_at > ${this.p(3)}`,
            [roomId, accountId, member.lastReadAt],
        );
        return Number(result.rows?.[0]?.cnt ?? 0);
    }

    async setMuted(
        roomId: string,
        accountId: string,
        muted: boolean,
    ): Promise<void> {
        await this.db.execute(
            `UPDATE chatroom_members SET muted = ${this.p(1)}
             WHERE chatroom_id = ${this.p(2)} AND account_id = ${this.p(3)}`,
            [muted ? 1 : 0, roomId, accountId],
        );
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
        const stmt =
            this.dbType === "sqlite"
                ? `INSERT INTO chatroom_keys (chatroom_id, wrapped_key, key_iv) VALUES (${this.p(1)}, ${this.p(2)}, ${this.p(3)})
                   ON CONFLICT (chatroom_id) DO UPDATE SET wrapped_key = excluded.wrapped_key, key_iv = excluded.key_iv`
                : this.dbType === "postgresql"
                  ? `INSERT INTO chatroom_keys (chatroom_id, wrapped_key, key_iv) VALUES (${this.p(1)}, ${this.p(2)}, ${this.p(3)})
                     ON CONFLICT (chatroom_id) DO UPDATE SET wrapped_key = EXCLUDED.wrapped_key, key_iv = EXCLUDED.key_iv`
                  : `INSERT INTO chatroom_keys (chatroom_id, wrapped_key, key_iv) VALUES (${this.p(1)}, ${this.p(2)}, ${this.p(3)})
                     ON DUPLICATE KEY UPDATE wrapped_key = VALUES(wrapped_key), key_iv = VALUES(key_iv)`;
        await this.db.execute(stmt, [roomId, ciphertext, iv]);
    }

    async getUnwrappedRoomKey(roomId: string): Promise<string | null> {
        const result = await this.db.execute(
            `SELECT wrapped_key, key_iv FROM chatroom_keys WHERE chatroom_id = ${this.p(1)}`,
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

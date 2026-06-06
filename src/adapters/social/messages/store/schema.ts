import type { DbExecutor } from "../../../../gateways/db/reuse/db-executor.js";

export async function ensureSchema(db: DbExecutor): Promise<void> {
    await db.ensureTable({
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

    await db.ensureTable({
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
            {
                name: "archived",
                type: "integer",
                notNull: true,
                default: 0,
            },
        ],
        primaryKey: ["chatroom_id", "account_id"],
        indexes: [
            {
                columns: ["account_id"],
                name: "idx_chatroom_members_account",
            },
        ],
    });

    await db.ensureTable({
        name: "chatroom_classrooms",
        columns: [
            { name: "class_id", type: "text", primaryKey: true },
            { name: "room_id", type: "text", notNull: true },
        ],
        indexes: [
            {
                columns: ["room_id"],
                name: "idx_chatroom_classrooms_room",
            },
        ],
    });

    await db.ensureTable({
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

    await db.ensureTable({
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

    await db.ensureTable({
        name: "chat_message_requests",
        columns: [
            { name: "id", type: "text", primaryKey: true },
            { name: "from_account_id", type: "text", notNull: true },
            { name: "to_account_id", type: "text", notNull: true },
            { name: "note", type: "text" },
            {
                name: "status",
                type: "text",
                notNull: true,
                default: "pending",
            },
            { name: "room_id", type: "text" },
            {
                name: "created_at",
                type: "timestamp",
                notNull: true,
                default: "now",
            },
            { name: "responded_at", type: "timestamp" },
        ],
        indexes: [
            {
                columns: ["from_account_id", "to_account_id", "status"],
                name: "idx_msg_requests_pair_status",
            },
            {
                columns: ["to_account_id", "status", "created_at"],
                name: "idx_msg_requests_incoming",
            },
        ],
    });

    await db.ensureTable({
        name: "chatroom_typing",
        columns: [
            { name: "chatroom_id", type: "text", notNull: true },
            { name: "account_id", type: "text", notNull: true },
            { name: "typing_until", type: "timestamp", notNull: true },
        ],
        primaryKey: ["chatroom_id", "account_id"],
        indexes: [
            {
                columns: ["chatroom_id", "typing_until"],
                name: "idx_chatroom_typing_room_until",
            },
        ],
    });

    await db.ensureTable({
        name: "chat_message_reactions",
        columns: [
            { name: "chatroom_id", type: "text", notNull: true },
            { name: "message_id", type: "text", notNull: true },
            { name: "account_id", type: "text", notNull: true },
            { name: "emoji", type: "text", notNull: true },
            {
                name: "created_at",
                type: "timestamp",
                notNull: true,
                default: "now",
            },
        ],
        primaryKey: ["message_id", "account_id", "emoji"],
        indexes: [
            {
                columns: ["chatroom_id", "message_id"],
                name: "idx_message_reactions_room_message",
            },
        ],
    });

    await db.ensureTable({
        name: "chat_emoji_usage",
        columns: [
            { name: "account_id", type: "text", notNull: true },
            { name: "emoji", type: "text", notNull: true },
            {
                name: "usage_count",
                type: "integer",
                notNull: true,
                default: 0,
            },
        ],
        primaryKey: ["account_id", "emoji"],
        indexes: [
            {
                columns: ["account_id", "usage_count"],
                name: "idx_emoji_usage_account_count",
            },
        ],
    });
}

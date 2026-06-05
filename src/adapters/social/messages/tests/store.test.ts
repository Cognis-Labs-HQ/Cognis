import test from "node:test";
import assert from "node:assert/strict";
import { DbMessagesStore } from "../store.js";
import type { DbExecutor } from "../../../../gateways/db/reuse/db-executor.js";
import type { StructuredDbCommand } from "../../../../gateways/db/reuse/db-command.js";
import type { StructuredDbSelectCommand } from "../../../../gateways/db/reuse/db-command.js";
import type { StructuredDbUpdateCommand } from "../../../../gateways/db/reuse/db-command.js";
import type { StructuredDbTableDef } from "../../../../gateways/db/reuse/db-table.js";

function createRecordingExecutor() {
    const tableDefs: Array<StructuredDbTableDef> = [];
    const commandCalls: Array<StructuredDbCommand> = [];
    const db: DbExecutor = {
        async ensureTable(def: StructuredDbTableDef) {
            tableDefs.push(def);
        },
        async executeCommand(command: StructuredDbCommand) {
            commandCalls.push(command);
            return { rows: [] };
        },
        async transaction<T>(callback: (executor: DbExecutor) => Promise<T>) {
            return callback(db);
        },
    };
    return { db, tableDefs, commandCalls };
}

test("messages schema uses portable integer default for muted flag", async () => {
    const { db, tableDefs } = createRecordingExecutor();
    const store = new DbMessagesStore(db);

    await store.ensureSchema();

    const membersTableDef = tableDefs.find(
        (def) => def.name === "chatroom_members",
    );
    assert.ok(membersTableDef, "chatroom_members table should be ensured");

    const mutedCol = membersTableDef.columns.find(
        (col) => col.name === "muted",
    );
    assert.ok(mutedCol, "muted column should exist");
    assert.equal(
        mutedCol.type,
        "integer",
        "muted column should use integer type",
    );
    assert.equal(mutedCol.default, 0, "muted column should default to 0");
    assert.equal(mutedCol.notNull, true, "muted column should be NOT NULL");
    assert.notEqual(
        mutedCol.type,
        "boolean",
        "muted column must not use boolean type",
    );
});

test("messages schema includes portable integer archived member flag", async () => {
    const { db, tableDefs } = createRecordingExecutor();
    const store = new DbMessagesStore(db);

    await store.ensureSchema();

    const membersTableDef = tableDefs.find(
        (def) => def.name === "chatroom_members",
    );
    assert.ok(membersTableDef, "chatroom_members table should be ensured");

    const archivedCol = membersTableDef.columns.find(
        (col) => col.name === "archived",
    );
    assert.ok(archivedCol, "archived column should exist");
    assert.equal(archivedCol.type, "integer");
    assert.equal(archivedCol.default, 0);
    assert.equal(archivedCol.notNull, true);
});

test("messages schema includes request typing and reaction tables", async () => {
    const { db, tableDefs } = createRecordingExecutor();
    const store = new DbMessagesStore(db);

    await store.ensureSchema();

    assert.ok(tableDefs.find((def) => def.name === "chat_message_requests"));
    assert.ok(tableDefs.find((def) => def.name === "chatroom_typing"));
    assert.ok(tableDefs.find((def) => def.name === "chat_message_reactions"));
    assert.ok(tableDefs.find((def) => def.name === "chat_emoji_usage"));
});

test("messages setMuted uses executeCommand with integer muted value", async () => {
    const { db, commandCalls } = createRecordingExecutor();
    const store = new DbMessagesStore(db);

    await store.setMuted("room-1", "account-1", true);

    const updateCmd = commandCalls.find(
        (cmd): cmd is StructuredDbUpdateCommand =>
            cmd.option === "UPDATE" && cmd.table === "chatroom_members",
    );
    assert.ok(updateCmd);
    assert.equal(updateCmd.set.muted, 1);
});

test("messages setArchived uses executeCommand with integer archived value", async () => {
    const { db, commandCalls } = createRecordingExecutor();
    const store = new DbMessagesStore(db);

    await store.setArchived("room-1", "account-1", true);

    const updateCmd = commandCalls.find(
        (cmd): cmd is StructuredDbUpdateCommand =>
            cmd.option === "UPDATE" && cmd.table === "chatroom_members",
    );
    assert.ok(updateCmd);
    assert.equal(updateCmd.set.archived, 1);
});

test("createMessageRequest persists room id when provided", async () => {
    const { db, commandCalls } = createRecordingExecutor();
    const store = new DbMessagesStore(db);

    await assert.rejects(async () => {
        await store.createMessageRequest({
            fromAccountId: "account-a",
            toAccountId: "account-b",
            roomId: "room-123",
        });
    });

    const insertCmd = commandCalls.find(
        (cmd) =>
            cmd.option === "INSERT" && cmd.table === "chat_message_requests",
    );
    assert.ok(insertCmd);
    assert.equal(insertCmd.values.room_id, "room-123");
});

test("hasApprovedMessageRequestBetween checks both request directions", async () => {
    const commandCalls: Array<StructuredDbCommand> = [];
    let selectCount = 0;
    const db: DbExecutor = {
        async ensureTable() {},
        async executeCommand(command: StructuredDbCommand) {
            commandCalls.push(command);
            if (command.option === "SELECT") {
                selectCount += 1;
                if (selectCount === 1) return { rows: [] };
                return { rows: [{ id: "approved-request" }] };
            }
            return { rows: [] };
        },
        async transaction<T>(callback: (executor: DbExecutor) => Promise<T>) {
            return callback(db);
        },
    };
    const store = new DbMessagesStore(db);

    const approved = await store.hasApprovedMessageRequestBetween(
        "account-a",
        "account-b",
    );

    assert.equal(approved, true);
    const selectCalls = commandCalls.filter((cmd) => cmd.option === "SELECT");
    assert.equal(selectCalls.length, 2);
});

test("incrementEmojiUsage inserts a new row when none exists", async () => {
    const { db, commandCalls } = createRecordingExecutor();
    const store = new DbMessagesStore(db);

    await store.incrementEmojiUsage("account-1", "👍");

    const insertCmd = commandCalls.find(
        (cmd) => cmd.option === "INSERT" && cmd.table === "chat_emoji_usage",
    );
    assert.ok(insertCmd);
    assert.equal(insertCmd.values.account_id, "account-1");
    assert.equal(insertCmd.values.emoji, "👍");
    assert.equal(insertCmd.values.usage_count, 1);
});

test("incrementEmojiUsage updates the count for an existing row", async () => {
    const commandCalls: Array<StructuredDbCommand> = [];
    const db: DbExecutor = {
        async ensureTable() {},
        async executeCommand(command: StructuredDbCommand) {
            commandCalls.push(command);
            if (
                command.option === "SELECT" &&
                command.table === "chat_emoji_usage"
            ) {
                return {
                    rows: [
                        {
                            account_id: "account-1",
                            emoji: "👍",
                            usage_count: 3,
                        },
                    ],
                };
            }
            return { rows: [] };
        },
        async transaction<T>(callback: (executor: DbExecutor) => Promise<T>) {
            return callback(db);
        },
    };
    const store = new DbMessagesStore(db);

    await store.incrementEmojiUsage("account-1", "👍");

    const updateCmd = commandCalls.find(
        (cmd): cmd is StructuredDbUpdateCommand =>
            cmd.option === "UPDATE" && cmd.table === "chat_emoji_usage",
    );
    assert.ok(updateCmd);
    assert.equal(updateCmd.set.usage_count, 4);
});

test("getTopEmojiUsage queries chat_emoji_usage by account", async () => {
    const { db, commandCalls } = createRecordingExecutor();
    const store = new DbMessagesStore(db);

    await store.getTopEmojiUsage("account-1", 5);

    const selectCmd = commandCalls.find(
        (cmd) => cmd.option === "SELECT" && cmd.table === "chat_emoji_usage",
    );
    assert.ok(selectCmd);
    assert.ok(
        selectCmd.where?.some(
            (clause) =>
                clause.column === "account_id" && clause.value === "account-1",
        ),
    );
    assert.equal(selectCmd.limit, 5);
});

test("unreadCount normalizes Date last_read_at to ISO before filtering", async () => {
    const commandCalls: Array<StructuredDbCommand> = [];
    const db: DbExecutor = {
        async ensureTable() {},
        async executeCommand(command: StructuredDbCommand) {
            commandCalls.push(command);
            if (
                command.option === "SELECT" &&
                command.table === "chatroom_members"
            ) {
                return {
                    rows: [
                        {
                            chatroom_id: "room-1",
                            account_id: "account-1",
                            role: "member",
                            joined_at: new Date("2026-06-05T11:00:00.000Z"),
                            last_read_at: new Date("2026-06-05T11:32:07.000Z"),
                            muted: 0,
                            archived: 0,
                        },
                    ],
                };
            }
            if (command.option === "SELECT" && command.table === "chat_messages") {
                return { rows: [{ cnt: 3 }] };
            }
            return { rows: [] };
        },
        async transaction<T>(callback: (executor: DbExecutor) => Promise<T>) {
            return callback(db);
        },
    };
    const store = new DbMessagesStore(db);

    const unread = await store.unreadCount("room-1", "account-1");

    assert.equal(unread, 3);
    const unreadSelect = commandCalls.find(
        (cmd): cmd is StructuredDbSelectCommand =>
            cmd.option === "SELECT" && cmd.table === "chat_messages",
    );
    assert.ok(unreadSelect);
    const createdAfterClause = unreadSelect.where?.find(
        (clause) => clause.column === "created_at" && clause.operator === ">",
    );
    assert.ok(createdAfterClause);
    assert.equal(createdAfterClause.value, "2026-06-05T11:32:07.000Z");
});

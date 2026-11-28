import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseMessagesStore } from "../store.js";
import type { DatabaseExecutor } from "../../../../gateways/db/reuse/db-executor.js";
import type { StructuredDatabaseCommand } from "../../../../gateways/db/reuse/db-command.js";
import type { StructuredDatabaseSelectCommand } from "../../../../gateways/db/reuse/db-command.js";
import type { StructuredDatabaseUpdateCommand } from "../../../../gateways/db/reuse/db-command.js";
import type { StructuredDatabaseTableDefinition } from "../../../../gateways/db/reuse/db-table.js";

function createRecordingExecutor() {
    const tableDefinitions: Array<StructuredDatabaseTableDefinition> = [];
    const commandCalls: Array<StructuredDatabaseCommand> = [];
    const db: DatabaseExecutor = {
        async ensureTable(definition: StructuredDatabaseTableDefinition) {
            tableDefinitions.push(definition);
        },
        async executeCommand(command: StructuredDatabaseCommand) {
            commandCalls.push(command);
            return { rows: [] };
        },
        async transaction<T>(
            callback: (executor: DatabaseExecutor) => Promise<T>,
        ) {
            return callback(db);
        },
    };
    return { db: db, tableDefs: tableDefinitions, commandCalls };
}

test("messages schema uses portable integer default for muted flag", async () => {
    const { db: db, tableDefs: tableDefinitions } = createRecordingExecutor();
    const store = new DatabaseMessagesStore(db);

    await store.ensureSchema();

    const membersTableDefinition = tableDefinitions.find(
        (definition) => definition.name === "chatroom_members",
    );
    assert.ok(
        membersTableDefinition,
        "chatroom_members table should be ensured",
    );

    const mutedColumn = membersTableDefinition.columns.find(
        (column) => column.name === "muted",
    );
    assert.ok(mutedColumn, "muted column should exist");
    assert.equal(
        mutedColumn.type,
        "integer",
        "muted column should use integer type",
    );
    assert.equal(mutedColumn.default, 0, "muted column should default to 0");
    assert.equal(mutedColumn.notNull, true, "muted column should be NOT NULL");
    assert.notEqual(
        mutedColumn.type,
        "boolean",
        "muted column must not use boolean type",
    );
});

test("messages schema includes portable integer archived member flag", async () => {
    const { db: db, tableDefs: tableDefinitions } = createRecordingExecutor();
    const store = new DatabaseMessagesStore(db);

    await store.ensureSchema();

    const membersTableDefinition = tableDefinitions.find(
        (definition) => definition.name === "chatroom_members",
    );
    assert.ok(
        membersTableDefinition,
        "chatroom_members table should be ensured",
    );

    const archivedColumn = membersTableDefinition.columns.find(
        (column) => column.name === "archived",
    );
    assert.ok(archivedColumn, "archived column should exist");
    assert.equal(archivedColumn.type, "integer");
    assert.equal(archivedColumn.default, 0);
    assert.equal(archivedColumn.notNull, true);
});

test("messages schema records one-time room-key delivery per member", async () => {
    const { db: db, tableDefs: tableDefinitions } = createRecordingExecutor();
    const store = new DatabaseMessagesStore(db);

    await store.ensureSchema();

    const membersTableDefinition = tableDefinitions.find(
        (definition) => definition.name === "chatroom_members",
    );
    assert.ok(membersTableDefinition);
    const deliveryColumn = membersTableDefinition.columns.find(
        (column) => column.name === "key_delivered_at",
    );
    assert.deepEqual(deliveryColumn, {
        name: "key_delivered_at",
        type: "timestamp",
    });
});

test("messages schema includes request typing and reaction tables", async () => {
    const { db: db, tableDefs: tableDefinitions } = createRecordingExecutor();
    const store = new DatabaseMessagesStore(db);

    await store.ensureSchema();

    assert.ok(
        tableDefinitions.find(
            (definition) => definition.name === "chat_message_requests",
        ),
    );
    assert.ok(
        tableDefinitions.find(
            (definition) => definition.name === "chatroom_typing",
        ),
    );
    assert.ok(
        tableDefinitions.find(
            (definition) => definition.name === "chat_message_reactions",
        ),
    );
    assert.ok(
        tableDefinitions.find(
            (definition) => definition.name === "chat_emoji_usage",
        ),
    );
});

test("messages setMuted uses executeCommand with integer muted value", async () => {
    const { db: db, commandCalls } = createRecordingExecutor();
    const store = new DatabaseMessagesStore(db);

    await store.setMuted("room-1", "account-1", true);

    const updateCommand = commandCalls.find(
        (command): command is StructuredDatabaseUpdateCommand =>
            command.option === "UPDATE" && command.table === "chatroom_members",
    );
    assert.ok(updateCommand);
    assert.equal(updateCommand.set.muted, 1);
});

test("messages setArchived uses executeCommand with integer archived value", async () => {
    const { db: db, commandCalls } = createRecordingExecutor();
    const store = new DatabaseMessagesStore(db);

    await store.setArchived("room-1", "account-1", true);

    const updateCommand = commandCalls.find(
        (command): command is StructuredDatabaseUpdateCommand =>
            command.option === "UPDATE" && command.table === "chatroom_members",
    );
    assert.ok(updateCommand);
    assert.equal(updateCommand.set.archived, 1);
});

test("removing a member archives a chat for its sole remaining member", async () => {
    const commandCalls: Array<StructuredDatabaseCommand> = [];
    const db: DatabaseExecutor = {
        async ensureTable() {},
        async executeCommand(command) {
            commandCalls.push(command);
            if (
                command.option === "SELECT" &&
                command.table === "chatroom_members"
            ) {
                return {
                    rows: [
                        {
                            chatroom_id: "room-1",
                            account_id: "bob",
                            role: "member",
                            joined_at: new Date().toISOString(),
                            muted: 0,
                            archived: 0,
                        },
                    ],
                };
            }
            return { rows: [] };
        },
        async transaction<T>(
            callback: (executor: DatabaseExecutor) => Promise<T>,
        ) {
            return callback(db);
        },
    };
    const store = new DatabaseMessagesStore(db);

    const lifecycle = await store.removeMemberAndApplyLifecycle(
        "room-1",
        "alice",
    );

    assert.equal(lifecycle, "archived");
    const archive = commandCalls.find(
        (command) =>
            command.option === "UPDATE" && command.table === "chatroom_members",
    );
    assert.ok(archive && archive.set.archived === 1);
});

test("removing the last member permanently deletes the chat", async () => {
    const { db: db, commandCalls } = createRecordingExecutor();
    const store = new DatabaseMessagesStore(db);

    const lifecycle = await store.removeMemberAndApplyLifecycle(
        "room-empty",
        "alice",
    );

    assert.equal(lifecycle, "deleted");
    assert.ok(
        commandCalls.some(
            (command) =>
                command.option === "DELETE" && command.table === "chatrooms",
        ),
    );
});

test("DM lookup does not expose an orphaned chat to a recreated account", async () => {
    const selectCommands: StructuredDatabaseSelectCommand[] = [];
    const db: DatabaseExecutor = {
        async ensureTable() {},
        async executeCommand(command) {
            if (command.option !== "SELECT") return { rows: [] };
            selectCommands.push(command);
            if (command.table === "chatrooms") {
                return {
                    rows: [
                        {
                            id: "existing-dm",
                            kind: "dm",
                            title: null,
                            avatar_key: null,
                            created_by: "alice",
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                        },
                    ],
                };
            }
            return {
                rows: [
                    {
                        chatroom_id: "existing-dm",
                        account_id: "bob",
                        role: "member",
                        joined_at: new Date().toISOString(),
                        muted: 0,
                        archived: 1,
                    },
                ],
            };
        },
        async transaction<T>(
            callback: (executor: DatabaseExecutor) => Promise<T>,
        ) {
            return callback(db);
        },
    };
    const store = new DatabaseMessagesStore(db);

    const room = await store.findDirectMessageBetween("alice", "bob");

    assert.equal(room, null);
    assert.equal(selectCommands[0].limit, undefined);
    assert.deepEqual(
        selectCommands[0].where?.slice(1).map((clause) => clause.value),
        ["alice", "bob"],
    );
});

test("new DMs use distinct room ids across account incarnations", async () => {
    const insertedIds: string[] = [];
    const db: DatabaseExecutor = {
        async ensureTable() {},
        async executeCommand(command) {
            if (command.option === "INSERT") {
                insertedIds.push(String(command.values.id));
                return { rows: [] };
            }
            return {
                rows: [
                    {
                        id: insertedIds.at(-1),
                        kind: "dm",
                        title: null,
                        created_by: "alice",
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    },
                ],
            };
        },
        async transaction<T>(
            callback: (executor: DatabaseExecutor) => Promise<T>,
        ) {
            return callback(db);
        },
    };
    const store = new DatabaseMessagesStore(db);

    await store.createDirectMessage("alice", "bob");
    await store.createDirectMessage("bob", "alice");

    assert.notEqual(insertedIds[0], insertedIds[1]);
});

test("membership changes persist their room event in the same transaction", async () => {
    const commandCalls: Array<StructuredDatabaseCommand> = [];
    let transactionCount = 0;
    const db: DatabaseExecutor = {
        async ensureTable() {},
        async executeCommand(command) {
            commandCalls.push(command);
            if (command.option === "INSERT") {
                return { rows: [], rowCount: 1 };
            }
            if (
                command.option === "SELECT" &&
                command.table === "chat_messages"
            ) {
                const insert = commandCalls.find(
                    (operation) =>
                        operation.option === "INSERT" &&
                        operation.table === "chat_messages",
                );
                return {
                    rows: [
                        insert && insert.option === "INSERT"
                            ? insert.values
                            : {},
                    ],
                };
            }
            return { rows: [] };
        },
        async transaction<T>(
            callback: (executor: DatabaseExecutor) => Promise<T>,
        ) {
            transactionCount += 1;
            return callback(db);
        },
    };
    const store = new DatabaseMessagesStore(db);

    const added = await store.addMemberWithEvent({
        roomId: "room-1",
        actorId: "alice",
        accountId: "bob",
        role: "member",
        handle: "bob",
        displayName: "Bob",
    });

    assert.equal(added, true);
    assert.equal(transactionCount, 1);
    const memberInsert = commandCalls.find(
        (command) =>
            command.option === "INSERT" && command.table === "chatroom_members",
    );
    const eventInsert = commandCalls.find(
        (command) =>
            command.option === "INSERT" && command.table === "chat_messages",
    );
    assert.ok(memberInsert);
    assert.ok(eventInsert);
    assert.equal(
        eventInsert.values.content_type,
        "application/vnd.cognis.room-event+json",
    );
    assert.equal(eventInsert.values.chatroom_id, "room-1");
});

test("createMessageRequest persists room id when provided", async () => {
    const { db: db, commandCalls } = createRecordingExecutor();
    const store = new DatabaseMessagesStore(db);

    await assert.rejects(async () => {
        await store.createMessageRequest({
            fromAccountId: "account-a",
            toAccountId: "account-b",
            roomId: "room-123",
        });
    });

    const insertCommand = commandCalls.find(
        (command) =>
            command.option === "INSERT" &&
            command.table === "chat_message_requests",
    );
    assert.ok(insertCommand);
    assert.equal(insertCommand.values.room_id, "room-123");
});

test("hasApprovedMessageRequestBetween checks both request directions", async () => {
    const commandCalls: Array<StructuredDatabaseCommand> = [];
    let selectCount = 0;
    const db: DatabaseExecutor = {
        async ensureTable() {},
        async executeCommand(command: StructuredDatabaseCommand) {
            commandCalls.push(command);
            if (command.option === "SELECT") {
                selectCount += 1;
                if (selectCount === 1) return { rows: [] };
                return { rows: [{ id: "approved-request" }] };
            }
            return { rows: [] };
        },
        async transaction<T>(
            callback: (executor: DatabaseExecutor) => Promise<T>,
        ) {
            return callback(db);
        },
    };
    const store = new DatabaseMessagesStore(db);

    const approved = await store.hasApprovedMessageRequestBetween(
        "account-a",
        "account-b",
    );

    assert.equal(approved, true);
    const selectCalls = commandCalls.filter(
        (command) => command.option === "SELECT",
    );
    assert.equal(selectCalls.length, 2);
});

test("incrementEmojiUsage inserts a new row when none exists", async () => {
    const { db: db, commandCalls } = createRecordingExecutor();
    const store = new DatabaseMessagesStore(db);

    await store.incrementEmojiUsage("account-1", "👍");

    const insertCommand = commandCalls.find(
        (command) =>
            command.option === "INSERT" && command.table === "chat_emoji_usage",
    );
    assert.ok(insertCommand);
    assert.equal(insertCommand.values.account_id, "account-1");
    assert.equal(insertCommand.values.emoji, "👍");
    assert.equal(insertCommand.values.usage_count, 1);
});

test("incrementEmojiUsage updates the count for an existing row", async () => {
    const commandCalls: Array<StructuredDatabaseCommand> = [];
    const db: DatabaseExecutor = {
        async ensureTable() {},
        async executeCommand(command: StructuredDatabaseCommand) {
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
        async transaction<T>(
            callback: (executor: DatabaseExecutor) => Promise<T>,
        ) {
            return callback(db);
        },
    };
    const store = new DatabaseMessagesStore(db);

    await store.incrementEmojiUsage("account-1", "👍");

    const updateCommand = commandCalls.find(
        (command): command is StructuredDatabaseUpdateCommand =>
            command.option === "UPDATE" && command.table === "chat_emoji_usage",
    );
    assert.ok(updateCommand);
    assert.equal(updateCommand.set.usage_count, 4);
});

test("getTopEmojiUsage queries chat_emoji_usage by account", async () => {
    const { db: db, commandCalls } = createRecordingExecutor();
    const store = new DatabaseMessagesStore(db);

    await store.getTopEmojiUsage("account-1", 5);

    const selectCommand = commandCalls.find(
        (command) =>
            command.option === "SELECT" && command.table === "chat_emoji_usage",
    );
    assert.ok(selectCommand);
    assert.ok(
        selectCommand.where?.some(
            (clause) =>
                clause.column === "account_id" && clause.value === "account-1",
        ),
    );
    assert.equal(selectCommand.limit, 5);
});

test("unreadCount normalizes Date last_read_at to ISO before filtering", async () => {
    const commandCalls: Array<StructuredDatabaseCommand> = [];
    const db: DatabaseExecutor = {
        async ensureTable() {},
        async executeCommand(command: StructuredDatabaseCommand) {
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
            if (
                command.option === "SELECT" &&
                command.table === "chat_messages"
            ) {
                return { rows: [{ cnt: 3 }] };
            }
            return { rows: [] };
        },
        async transaction<T>(
            callback: (executor: DatabaseExecutor) => Promise<T>,
        ) {
            return callback(db);
        },
    };
    const store = new DatabaseMessagesStore(db);

    const unread = await store.unreadCount("room-1", "account-1");

    assert.equal(unread, 3);
    const unreadSelect = commandCalls.find(
        (command): command is StructuredDatabaseSelectCommand =>
            command.option === "SELECT" && command.table === "chat_messages",
    );
    assert.ok(unreadSelect);
    const createdAfterClause = unreadSelect.where?.find(
        (clause) => clause.column === "created_at" && clause.operator === ">",
    );
    assert.ok(createdAfterClause);
    assert.equal(createdAfterClause.value, "2026-06-05T11:32:07.000Z");
});

test("delayed read receipts preserve their original time and never regress newer receipts", async () => {
    const { InMemoryTestExecutor } =
        await import("../../../../gateways/db/tests/in-memory-test-executor.js");
    const store = new DatabaseMessagesStore(new InMemoryTestExecutor());
    await store.ensureSchema();
    const room = await store.createRoom("group", "Test", "reader");
    await store.addMember(room.id, "reader", "owner");
    await store.markRead(room.id, "reader", "2026-10-20T00:00:00.000Z");
    assert.equal(
        (await store.getMember(room.id, "reader"))?.lastReadAt,
        "2026-10-20T00:00:00.000Z",
    );
    await store.markRead(room.id, "reader", "2026-10-21T00:00:00.000Z");
    await store.markRead(room.id, "reader", "2026-10-20T00:00:00.000Z");
    assert.equal(
        (await store.getMember(room.id, "reader"))?.lastReadAt,
        "2026-10-21T00:00:00.000Z",
    );
});

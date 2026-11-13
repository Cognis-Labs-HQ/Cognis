import type { DbExecutor } from "../../../../gateways/db/reuse/db-executor.js";
import type { StructuredDbCommand } from "../../../../gateways/db/reuse/db-command.js";
import assert from "node:assert/strict";
import test from "node:test";
import {
    createChatroomDeletionCapability,
    type ChatroomDeletionStore,
} from "../chatroom-deletion.js";
import { DbMessagesStore } from "../store.js";

function createHarness() {
    const calls: unknown[] = [];
    const store: ChatroomDeletionStore = {
        getRoom: async () =>
            assert.fail("Only administrators read the room directly"),
        deleteRoom: async () =>
            assert.fail("Use the actor-authorized deletion path"),
        async ensureSchema() {
            calls.push("ensureSchema");
        },
        async deleteRoomForActor(id: string, actorAccountId: string) {
            calls.push(["deleteRoomForActor", id, actorAccountId]);
            return actorAccountId === "owner" ? "deleted" : "forbidden";
        },
    };
    const logs: Array<{
        level: string;
        metadata?: Record<string, unknown>;
    }> = [];
    const deleteChatroom = createChatroomDeletionCapability(
        store,
        (level, _message, metadata) => logs.push({ level, metadata }),
    );
    return { calls, deleteChatroom, logs, store };
}

test("chatroom deletion allows the owner", async () => {
    const harness = createHarness();
    await harness.deleteChatroom({
        roomId: "room-1",
        actorAccountId: "owner",
    });
    assert.deepEqual(harness.calls.at(-1), [
        "deleteRoomForActor",
        "room-1",
        "owner",
    ]);
    assert.equal(harness.logs[0]?.metadata?.operation, "delete_chatroom");
});

test("chatroom deletion allows the sole participant", async () => {
    const harness = createHarness();
    harness.store.deleteRoomForActor = async (
        id: string,
        actorAccountId: string,
    ) => {
        harness.calls.push(["deleteRoomForActor", id, actorAccountId]);
        return "deleted";
    };
    await harness.deleteChatroom({
        roomId: "room-1",
        actorAccountId: "participant",
    });
    assert.deepEqual(harness.calls.at(-1), [
        "deleteRoomForActor",
        "room-1",
        "participant",
    ]);
});

test("chatroom deletion rejects another participant", async () => {
    const harness = createHarness();
    await assert.rejects(
        harness.deleteChatroom({
            roomId: "room-1",
            actorAccountId: "participant",
        }),
        /Only the chatroom owner or sole participant/,
    );
    assert.equal(
        harness.calls.some(
            (call) => Array.isArray(call) && call[0] === "deleteRoomForActor",
        ),
        true,
    );
});

test("chatroom deletion removes dependent records transactionally", async () => {
    const commands: StructuredDbCommand[] = [];
    const executor: DbExecutor = {
        async ensureTable() {
            throw new Error(
                "Schema setup is not used in deletion transaction tests",
            );
        },
        async executeCommand(command: StructuredDbCommand) {
            commands.push(command);
            return { rows: [] };
        },
        async transaction<T>(callback: (db: DbExecutor) => Promise<T>) {
            return callback(executor);
        },
    };
    const store = new DbMessagesStore(executor);

    await store.deleteRoom("room-1");

    assert.deepEqual(
        commands.map((command) => command.table),
        [
            "chatroom_typing",
            "chat_message_reactions",
            "chat_messages",
            "chatroom_keys",
            "chatroom_members",
            "chat_message_requests",
            "chatrooms",
        ],
    );
    assert.ok(
        commands.every(
            (command) =>
                ("where" in command ? command.where?.[0]?.value : undefined) ===
                "room-1",
        ),
    );
});

test("chatroom deletion authorizes and deletes in the same transaction", async () => {
    const commands: StructuredDbCommand[] = [];
    let transactionActive = false;
    const executor: DbExecutor = {
        async ensureTable() {
            throw new Error(
                "Schema setup is not used in deletion transaction tests",
            );
        },
        async executeCommand(command: StructuredDbCommand) {
            assert.equal(transactionActive, true);
            commands.push(command);
            if (command.table === "chatrooms" && command.option === "SELECT") {
                return {
                    rows: [
                        {
                            id: "room-1",
                            kind: "group",
                            title: null,
                            created_by: "owner",
                            created_at: "2026-01-01T00:00:00.000Z",
                            updated_at: "2026-01-01T00:00:00.000Z",
                        },
                    ],
                };
            }
            if (
                command.table === "chatroom_members" &&
                command.option === "SELECT"
            ) {
                return {
                    rows: [
                        {
                            chatroom_id: "room-1",
                            account_id: "participant",
                            role: "member",
                            joined_at: "2026-01-01T00:00:00.000Z",
                        },
                    ],
                };
            }
            return { rows: [] };
        },
        async transaction<T>(callback: (db: DbExecutor) => Promise<T>) {
            transactionActive = true;
            const result = await callback(executor);
            transactionActive = false;
            return result;
        },
    };
    const store = new DbMessagesStore(executor);

    const result = await store.deleteRoomForActor("room-1", "participant");

    assert.equal(result, "deleted");
    assert.equal(commands.at(-1)?.table, "chatrooms");
    assert.equal(commands.at(-1)?.option, "DELETE");
});

test("authoritative administrators can delete another account's room", async () => {
    let deleted = "";
    const remove = createChatroomDeletionCapability(
        {
            ensureSchema: async () => {},
            getRoom: async () => ({ id: "room" }),
            deleteRoom: async (id: string) => {
                deleted = id;
            },
            deleteRoomForActor: async () =>
                assert.fail("Use the authorized administrator path"),
        },
        undefined,
        async (accountId) => {
            assert.equal(accountId, "admin-account");
            return "admin";
        },
    );
    await remove({ roomId: "room", actorAccountId: "admin-account" });
    assert.equal(deleted, "room");
});

test("a caller-supplied role cannot grant administrative deletion", async () => {
    const remove = createChatroomDeletionCapability(
        {
            ensureSchema: async () => {},
            getRoom: async () =>
                assert.fail("Only administrators read the room directly"),
            deleteRoomForActor: async () => "forbidden",
            deleteRoom: async () =>
                assert.fail("Never trust the requested role"),
        },
        undefined,
        async () => "user",
    );
    await assert.rejects(
        remove(
            Object.assign(
                { roomId: "room", actorAccountId: "user" },
                { role: "admin" },
            ),
        ),
        /owner/,
    );
});

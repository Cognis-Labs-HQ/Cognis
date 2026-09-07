import assert from "node:assert/strict";
import test from "node:test";
import { createChatroomDeletionCapability } from "../chatroom-deletion.js";
import { DbMessagesStore } from "../store.js";

function createHarness() {
    const calls: unknown[] = [];
    const store = {
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
        store as never,
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
    const commands: Array<Record<string, unknown>> = [];
    const executor = {
        async executeCommand(command: Record<string, unknown>) {
            commands.push(command);
            return { rows: [] };
        },
        async transaction(callback: (db: typeof executor) => Promise<void>) {
            await callback(executor);
        },
    };
    const store = new DbMessagesStore(executor as never);

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
                (command.where as Array<{ value: string }>)[0]?.value ===
                "room-1",
        ),
    );
});

test("chatroom deletion authorizes and deletes in the same transaction", async () => {
    const commands: Array<Record<string, unknown>> = [];
    let transactionActive = false;
    const executor = {
        async executeCommand(command: Record<string, unknown>) {
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
        async transaction<T>(callback: (db: typeof executor) => Promise<T>) {
            transactionActive = true;
            const result = await callback(executor);
            transactionActive = false;
            return result;
        },
    };
    const store = new DbMessagesStore(executor as never);

    const result = await store.deleteRoomForActor("room-1", "participant");

    assert.equal(result, "deleted");
    assert.equal(commands.at(-1)?.table, "chatrooms");
    assert.equal(commands.at(-1)?.option, "DELETE");
});

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
        async getRoom(id: string) {
            calls.push(["getRoom", id]);
            return { id, createdBy: "owner" };
        },
        async listMembers(id: string) {
            calls.push(["listMembers", id]);
            return [{ accountId: "owner" }, { accountId: "participant" }];
        },
        async deleteRoom(id: string) {
            calls.push(["deleteRoom", id]);
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
    assert.deepEqual(harness.calls.at(-1), ["deleteRoom", "room-1"]);
    assert.equal(harness.logs[0]?.metadata?.operation, "delete_chatroom");
});

test("chatroom deletion allows the sole participant", async () => {
    const harness = createHarness();
    harness.store.listMembers = async (id: string) => {
        harness.calls.push(["listMembers", id]);
        return [{ accountId: "participant" }];
    };
    await harness.deleteChatroom({
        roomId: "room-1",
        actorAccountId: "participant",
    });
    assert.deepEqual(harness.calls.at(-1), ["deleteRoom", "room-1"]);
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
            (call) => Array.isArray(call) && call[0] === "deleteRoom",
        ),
        false,
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

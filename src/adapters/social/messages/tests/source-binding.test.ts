import type { StructuredDbCommand } from "../../../../gateways/db/reuse/db-command.js";
import assert from "node:assert/strict";
import test from "node:test";
import { changeChatroomSource } from "../store/source-binding.js";
import type { DbExecutor } from "../../../../gateways/db/reuse/db-executor.js";

function fixture() {
    const room: Record<string, unknown> = {
        created_by: "owner",
        source_type: null,
        source_id: null,
    };
    const executor = {
        async executeCommand(command: StructuredDbCommand) {
            if (command.option === "SELECT")
                return {
                    rows: command.table === "chatrooms" ? [{ ...room }] : [],
                };
            if (
                command.where.every(
                    (clause: any) =>
                        clause.column === "id" ||
                        (clause.operator === "IS NULL"
                            ? room[clause.column] == null
                            : room[clause.column] === clause.value),
                )
            )
                Object.assign(room, command.set);
            return { rowCount: 1 };
        },
    } as DbExecutor;
    return { executor, room };
}
const input = {
    roomId: "room",
    actorAccountId: "owner",
    sourceType: "meeting",
    sourceId: "first",
};

test("chatroom binding is idempotent and rejects another source without overwriting", async () => {
    const { executor, room } = fixture();
    await changeChatroomSource(executor, input);
    await changeChatroomSource(executor, input);
    await assert.rejects(
        changeChatroomSource(executor, { ...input, sourceId: "second" }),
        { code: "source_conflict" },
    );
    assert.equal(room.source_id, "first");
});

test("concurrent claims have one winner and source-specific release preserves other bindings", async () => {
    const { executor, room } = fixture();
    const results = await Promise.allSettled([
        changeChatroomSource(executor, input),
        changeChatroomSource(executor, { ...input, sourceId: "second" }),
    ]);
    assert.equal(
        results.filter((entry) => entry.status === "fulfilled").length,
        1,
    );
    await changeChatroomSource(
        executor,
        { ...input, sourceId: "second" },
        true,
    );
    assert.equal(room.source_id, "first");
    await changeChatroomSource(executor, input, true);
    assert.equal(room.source_id, null);
    await changeChatroomSource(executor, { ...input, sourceId: "second" });
    assert.equal(room.source_id, "second");
});

test("unauthorized callers and malformed identities cannot bind a chatroom", async () => {
    const { executor, room } = fixture();
    await assert.rejects(
        changeChatroomSource(executor, {
            ...input,
            actorAccountId: "outsider",
        }),
        /denied/,
    );
    await assert.rejects(
        changeChatroomSource(executor, { ...input, sourceId: "" }),
        /Invalid/,
    );
    assert.equal(room.source_id, null);
});

test("verified administrators release only matching sources without room membership", async () => {
    const { executor, room } = fixture();
    await changeChatroomSource(executor, input);
    const outsider = { ...input, actorAccountId: "administrator" };
    await assert.rejects(
        changeChatroomSource(executor, outsider, true),
        /denied/,
    );
    await assert.rejects(
        changeChatroomSource(executor, outsider, false, true),
        /denied/,
    );
    await changeChatroomSource(
        executor,
        { ...outsider, sourceId: "other" },
        true,
        true,
    );
    assert.equal(room.source_id, "first");
    await changeChatroomSource(executor, outsider, true, true);
    assert.equal(room.source_id, null);
});

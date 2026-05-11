import test from "node:test";
import assert from "node:assert/strict";
import { DbMessagesStore } from "../store.js";
import type { DbExecutor } from "../../../../gateways/db/reuse/db-executor.js";

function createRecordingExecutor() {
    const calls: Array<{ sql: string; params?: unknown[] }> = [];
    const db: DbExecutor = {
        async execute(sql: string, params?: unknown[]) {
            calls.push({ sql, params });
            return { rows: [] };
        },
        async executeCommand() {
            return { rows: [] };
        },
    };
    return { db, calls };
}

test("messages schema uses a native boolean default for PostgreSQL muted flag", async () => {
    const { db, calls } = createRecordingExecutor();
    const store = new DbMessagesStore(db, "postgresql");

    await store.ensureSchema();

    const membersSchema = calls.find((call) =>
        call.sql.includes("CREATE TABLE IF NOT EXISTS chatroom_members"),
    );
    assert.ok(membersSchema);
    assert.match(membersSchema.sql, /muted BOOLEAN NOT NULL DEFAULT FALSE/);
    assert.doesNotMatch(membersSchema.sql, /muted BOOLEAN NOT NULL DEFAULT 0/);
});

test("messages setMuted binds PostgreSQL boolean values", async () => {
    const { db, calls } = createRecordingExecutor();
    const store = new DbMessagesStore(db, "postgresql");

    await store.setMuted("room-1", "account-1", true);

    assert.deepEqual(calls[0].params, [true, "room-1", "account-1"]);
});

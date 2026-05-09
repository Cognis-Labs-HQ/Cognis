import test from "node:test";
import assert from "node:assert/strict";
import { SqliteExecutor } from "../executor.js";

test("sqlite executor emits summarized debug logs", async () => {
    const entries: Array<{
        level: string;
        message: string;
        meta?: Record<string, unknown>;
    }> = [];
    const db = new SqliteExecutor(":memory:", (level, message, meta) => {
        entries.push({ level, message, meta });
    });

    await db.execute("SELECT 1");

    assert.deepEqual(entries, [
        {
            level: "debug",
            message: "Executing SQL statement.",
            meta: {
                component: "db",
                provider: "sqlite",
                statement: "SELECT",
                parameterCount: 0,
            },
        },
    ]);
    assert.equal(JSON.stringify(entries[0]).includes("SELECT 1"), false);
});

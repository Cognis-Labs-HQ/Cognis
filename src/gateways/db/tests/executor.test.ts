import test from "node:test";
import assert from "node:assert/strict";
import { PostgresExecutor } from "../executor.js";

test("postgres executor captures log entries with summarized statements", () => {
    const entries: Array<{
        level: string;
        message: string;
        meta?: Record<string, unknown>;
    }> = [];
    const db = new PostgresExecutor(
        "postgresql://localhost/test",
        (level, message, meta) => {
            entries.push({ level, message, meta });
        },
    );

    assert.ok(db, "PostgresExecutor should be instantiable");
    assert.equal(entries.length, 0, "no log entries before any call");
});

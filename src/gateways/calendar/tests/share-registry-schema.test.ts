import test from "node:test";
import assert from "node:assert/strict";
import type {
    StructuredDbCommand,
    StructuredDbCommandResult,
} from "../../db/reuse/db-command.js";
import type { StructuredDbTableDef } from "../../db/reuse/db-table.js";
import { CalendarShareRegistry } from "../bootstrap/share-registry.js";

class MockSchemaExecutor {
    public readonly executedSql: string[] = [];

    async executeCommand(
        command: StructuredDbCommand,
    ): Promise<StructuredDbCommandResult> {
        throw new Error(
            `executeCommand should not run during schema repair test: ${command.option}`,
        );
    }

    async ensureTable(_def: StructuredDbTableDef): Promise<void> {}

    async transaction<T>(
        callback: (executor: MockSchemaExecutor) => Promise<T>,
    ): Promise<T> {
        return callback(this);
    }

    async execute(
        sql: string,
    ): Promise<{ rows?: unknown[]; rowCount?: number }> {
        this.executedSql.push(sql);
        return { rowCount: 0 };
    }
}

test("ensureSchema repairs legacy calendar_user_shares columns", async () => {
    const executor = new MockSchemaExecutor();
    const shareRegistry = new CalendarShareRegistry(executor);
    await shareRegistry.ensureSchema();
    assert.deepEqual(executor.executedSql, [
        "ALTER TABLE calendar_user_shares ADD COLUMN IF NOT EXISTS permission TEXT NOT NULL DEFAULT 'read'",
        "ALTER TABLE calendar_user_shares ADD COLUMN IF NOT EXISTS expires_at TEXT NOT NULL DEFAULT ''",
    ]);
});

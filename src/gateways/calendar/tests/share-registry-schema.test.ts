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

class MockShareUpdateExecutor {
    public readonly executedCommands: StructuredDbCommand[] = [];

    async executeCommand(
        command: StructuredDbCommand,
    ): Promise<StructuredDbCommandResult> {
        this.executedCommands.push(command);
        if (command.option !== "SELECT") return { rowCount: 1 };
        return {
            rows: [
                {
                    id: "share-1",
                    owner_account_id: "alice",
                    owner_calendar_id: "calendar-1",
                    recipient_account_id: "bob",
                    recipient_calendar_id: "calendar-2",
                    recipient_handle: "bob",
                    recipient_display_name: "Bob",
                    recipient_avatar_key: null,
                    permission: "read",
                    expires_at: "",
                    created_at: "2026-01-01T00:00:00.000Z",
                    updated_at: "2026-01-01T00:00:00.000Z",
                },
            ],
        };
    }

    async ensureTable(_def: StructuredDbTableDef): Promise<void> {}

    async transaction<T>(
        callback: (executor: MockShareUpdateExecutor) => Promise<T>,
    ): Promise<T> {
        return callback(this);
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

test("updateCalendarUserShare sends structured UPDATE set payload", async () => {
    const executor = new MockShareUpdateExecutor();
    const shareRegistry = new CalendarShareRegistry(executor);

    const updatedShare = await shareRegistry.updateCalendarUserShare({
        ownerAccountId: "alice",
        ownerCalendarId: "calendar-1",
        shareId: "share-1",
        permission: "write",
    });

    assert.equal(updatedShare?.permission, "write");
    const updateCommand = executor.executedCommands.find(
        (command) => command.option === "UPDATE",
    );
    assert.ok(updateCommand);
    if (updateCommand.option === "UPDATE") {
        assert.deepEqual(updateCommand.set, {
            permission: "write",
            expires_at: "",
            updated_at: updatedShare.updatedAt,
        });
    }
});

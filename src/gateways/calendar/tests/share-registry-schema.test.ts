import test from "node:test";
import assert from "node:assert/strict";
import type {
    StructuredDbCommand,
    StructuredDbCommandResult,
} from "../../db/reuse/db-command.js";
import type { StructuredDbTableDef } from "../../db/reuse/db-table.js";
import { CalendarShareRegistry } from "../bootstrap/share-registry.js";

class MockSchemaExecutor {
    public readonly capturedTableDefs: StructuredDbTableDef[] = [];

    async executeCommand(
        command: StructuredDbCommand,
    ): Promise<StructuredDbCommandResult> {
        throw new Error(
            `executeCommand should not run during schema test: ${command.option}`,
        );
    }

    async ensureTable(def: StructuredDbTableDef): Promise<void> {
        this.capturedTableDefs.push(def);
    }

    async transaction<T>(
        callback: (executor: MockSchemaExecutor) => Promise<T>,
    ): Promise<T> {
        return callback(this);
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

test("ensureSchema declares permission and expires_at on calendar_user_shares", async () => {
    const executor = new MockSchemaExecutor();
    const shareRegistry = new CalendarShareRegistry(executor);
    await shareRegistry.ensureSchema();
    const sharesDef = executor.capturedTableDefs.find(
        (def) => def.name === "calendar_user_shares",
    );
    assert.ok(sharesDef, "calendar_user_shares table def must be registered");
    const colNames = sharesDef.columns.map((col) => col.name);
    assert.ok(
        colNames.includes("permission"),
        "calendar_user_shares must declare permission column",
    );
    assert.ok(
        colNames.includes("expires_at"),
        "calendar_user_shares must declare expires_at column",
    );
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
    assert.deepEqual(updateCommand.set, {
        permission: "write",
        expires_at: "",
        updated_at: updatedShare.updatedAt,
    });
});

test("keyring reset can enumerate only a recipient's delivered calendars", async () => {
    const shareRegistry = new CalendarShareRegistry(null);
    for (const [shareId, recipientAccountId] of [
        ["share-bob", "bob"],
        ["share-charlie", "charlie"],
    ]) {
        await shareRegistry.upsertCalendarUserShare({
            shareId,
            ownerAccountId: "alice",
            ownerCalendarId: "calendar-owned",
            recipientAccountId,
            recipientCalendarId: `calendar-${recipientAccountId}`,
            permission: "read",
        });
    }

    const shares = await shareRegistry.listCalendarUserSharesByRecipient("bob");
    assert.deepEqual(
        shares.map((share) => share.recipientCalendarId),
        ["calendar-bob"],
    );
});

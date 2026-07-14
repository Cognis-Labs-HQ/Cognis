import test from "node:test";
import assert from "node:assert/strict";
import type {
    StructuredDbCommand,
    StructuredDbCommandResult,
} from "../../db/reuse/db-command.js";
import type { StructuredDbTableDef } from "../../db/reuse/db-table.js";
import { GuestProfileStore } from "../gateway/guest-profile-store.js";

class MemoryExecutor {
    public readonly tableDefs: StructuredDbTableDef[] = [];
    public readonly rows = new Map<string, Record<string, unknown>>();

    async ensureTable(def: StructuredDbTableDef): Promise<void> {
        this.tableDefs.push(def);
    }

    async executeCommand(
        command: StructuredDbCommand,
    ): Promise<StructuredDbCommandResult> {
        if (command.table !== "share_guest_profiles") {
            return { rows: [] };
        }
        if (command.option === "INSERT") {
            this.rows.set(String(command.values.guest_id), {
                ...command.values,
            });
            return { rowCount: 1 };
        }
        if (command.option === "SELECT") {
            const entries = Array.from(this.rows.values()).filter((row) =>
                (command.where ?? []).every(
                    (condition) => row[condition.column] === condition.value,
                ),
            );
            return { rows: entries };
        }
        if (command.option === "DELETE") {
            for (const [key, row] of this.rows.entries()) {
                const matches = (command.where ?? []).every(
                    (condition) => row[condition.column] === condition.value,
                );
                if (matches) this.rows.delete(key);
            }
            return { rowCount: 1 };
        }
        return { rows: [] };
    }
}

test("guest profile default display name includes a distinguishing random number", async () => {
    const store = new GuestProfileStore(new MemoryExecutor() as any);
    await store.ensureSchema();

    const first = await store.create({ shareId: "share-1", ttlSeconds: 60 });
    const second = await store.create({ shareId: "share-1", ttlSeconds: 60 });

    assert.match(first.displayName, /^Guest #\d{6}$/);
    assert.match(second.displayName, /^Guest #\d{6}$/);
    assert.notEqual(
        first.displayName,
        second.displayName,
        "concurrent guests should be assigned distinguishing default names",
    );
});

test("guest profile honors an explicit display name over the random default", async () => {
    const store = new GuestProfileStore(new MemoryExecutor() as any);
    await store.ensureSchema();

    const record = await store.create({
        shareId: "share-1",
        displayName: "Ada",
        ttlSeconds: 60,
    });

    assert.equal(record.displayName, "Ada");
});

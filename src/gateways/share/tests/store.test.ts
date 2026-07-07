import test from "node:test";
import assert from "node:assert/strict";
import type {
    StructuredDbCommand,
    StructuredDbCommandResult,
} from "../../db/reuse/db-command.js";
import type { StructuredDbTableDef } from "../../db/reuse/db-table.js";
import { ShareTokenStore } from "../gateway/store.js";

class MemoryExecutor {
    public readonly tableDefs: StructuredDbTableDef[] = [];
    public readonly rows = new Map<string, Record<string, unknown>>();

    async ensureTable(def: StructuredDbTableDef): Promise<void> {
        this.tableDefs.push(def);
    }

    async executeCommand(
        command: StructuredDbCommand,
    ): Promise<StructuredDbCommandResult> {
        if (command.table !== "share_tokens") {
            return { rows: [] };
        }
        if (command.option === "INSERT") {
            this.rows.set(String(command.values.id), { ...command.values });
            return { rowCount: 1 };
        }
        if (command.option === "SELECT") {
            const entries = Array.from(this.rows.values()).filter((row) => {
                return (command.where ?? []).every(
                    (condition) => row[condition.column] === condition.value,
                );
            });
            return { rows: entries };
        }
        if (command.option === "DELETE") {
            const beforeSize = this.rows.size;
            for (const [key, row] of this.rows.entries()) {
                const matches = (command.where ?? []).every(
                    (condition) => row[condition.column] === condition.value,
                );
                if (matches) {
                    this.rows.delete(key);
                }
            }
            return { rowCount: beforeSize - this.rows.size };
        }
        return { rowCount: 0 };
    }

    async transaction<T>(
        callback: (executor: MemoryExecutor) => Promise<T>,
    ): Promise<T> {
        return callback(this);
    }
}

test("share token schema declares resource and token columns", async () => {
    const executor = new MemoryExecutor();
    const store = new ShareTokenStore(executor as never);
    await store.ensureSchema();
    const tableDef = executor.tableDefs.find(
        (def) => def.name === "share_tokens",
    );
    assert.ok(tableDef);
    const columnNames = tableDef.columns.map((column) => column.name);
    assert.ok(columnNames.includes("resource_type"));
    assert.ok(columnNames.includes("resource_id"));
    assert.ok(columnNames.includes("token_value"));
    assert.ok(columnNames.includes("token_hash"));
});

test("issue, list, resolve, and delete share tokens", async () => {
    const executor = new MemoryExecutor();
    const store = new ShareTokenStore(executor as never);
    const issued = await store.issue({
        ownerAccountId: "alice",
        resourceType: "meeting",
        resourceId: "meeting-1",
        label: "Class meeting",
        grantedCapabilities: ["meeting:join"],
        expiresAt: "",
    });

    assert.match(issued.tokenValue, /^shr_/);
    const listed = await store.listByOwner({
        ownerAccountId: "alice",
        resourceType: "meeting",
        resourceId: "meeting-1",
    });
    assert.equal(listed.length, 1);
    assert.equal(listed[0].label, "Class meeting");

    const resolved = await store.resolve(issued.tokenValue);
    assert.ok(resolved);
    assert.equal(resolved?.resourceId, "meeting-1");
    assert.deepEqual(resolved?.grantedCapabilities, ["meeting:join"]);

    const deleted = await store.deleteById({
        shareId: issued.id,
        ownerAccountId: "alice",
    });
    assert.equal(deleted, true);
    assert.equal(await store.resolve(issued.tokenValue), null);
});

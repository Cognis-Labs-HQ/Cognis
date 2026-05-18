import test from "node:test";
import assert from "node:assert/strict";
import type { StructuredDbCommand } from "../../../../gateways/db/reuse/db-command.js";
import { InMemoryTestExecutor } from "../../../../gateways/db/tests/in-memory-test-executor.js";
import { DbLocalAccountStore } from "../store.js";

class StrictAuthExecutor extends InMemoryTestExecutor {
    async executeCommand(command: StructuredDbCommand) {
        const joins = command.joins ?? [];
        for (const join of joins) {
            if (join.table === "account_profiles") {
                throw new Error("account_profiles_join_forbidden");
            }
        }
        return super.executeCommand(command);
    }
}

async function ensureAuthTables(executor: StrictAuthExecutor): Promise<void> {
    await executor.ensureTable({
        name: "accounts",
        columns: [
            { name: "id", type: "text", primaryKey: true },
            { name: "display_name", type: "text" },
            { name: "is_admin", type: "integer", notNull: true, default: false },
            { name: "role", type: "text" },
            { name: "enabled", type: "integer", notNull: true, default: true },
            { name: "is_founder", type: "integer", notNull: true, default: false },
            { name: "created_at", type: "text" },
            { name: "updated_at", type: "text" },
            { name: "last_login", type: "text" },
        ],
    });
    await executor.ensureTable({
        name: "local_auth_credentials",
        columns: [
            { name: "account_id", type: "text", notNull: true },
            { name: "username", type: "text", primaryKey: true },
            { name: "password_hash", type: "text", notNull: true },
            { name: "password_algorithm", type: "text", notNull: true },
            { name: "created_at", type: "text" },
            { name: "updated_at", type: "text" },
        ],
    });
}

test("db local account store authenticates without the social profile table", async () => {
    const executor = new StrictAuthExecutor();
    await ensureAuthTables(executor);
    const store = new DbLocalAccountStore(executor);

    await store.register("alice", "secret123", "teacher", "Alice");

    const session = await store.verify("alice", "secret123");
    const accounts = await store.list();

    assert.ok(session);
    assert.equal(session?.accountId, "alice");
    assert.equal(session?.role, "teacher");
    assert.deepEqual(accounts, [
        {
            username: "alice",
            enabled: true,
            isFounder: false,
            role: "teacher",
        },
    ]);
});

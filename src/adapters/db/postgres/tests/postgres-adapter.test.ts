import test from "node:test";
import assert from "node:assert/strict";
import { PostgresDbGateway, type PostgresClient } from "../index.js";

test("postgres adapter wraps query and transactions", async () => {
    const calls: string[] = [];
    const client: PostgresClient = {
        async query(sql: string) {
            calls.push(sql);
            if (sql === "SELECT 1") return { rows: [{ n: 1 }], rowCount: 1 };
            return { rows: [], rowCount: 0 };
        },
    };

    const gateway = new PostgresDbGateway(client);
    const rows = await gateway.query("SELECT 1");
    assert.equal(rows.rowCount, 1);
    await gateway.transaction(async () => undefined);
    assert.deepEqual(calls.slice(1), ["BEGIN", "COMMIT"]);
});

test("postgres adapter executes structured commands", async () => {
    const calls: Array<{ sql: string; params?: unknown[] }> = [];
    const client: PostgresClient = {
        async query(sql: string, params?: unknown[]) {
            calls.push({ sql, params });
            return { rows: [{ id: 3 }], rowCount: 1 };
        },
    };

    const gateway = new PostgresDbGateway(client);
    const result = await gateway.executeCommand({
        option: "DELETE",
        table: "profiles",
        where: [{ column: "id", value: 3 }],
    });

    assert.equal(calls[0]?.sql, "DELETE FROM profiles WHERE id = $1");
    assert.deepEqual(calls[0]?.params, [3]);
    assert.equal(result.rowCount, 1);
});

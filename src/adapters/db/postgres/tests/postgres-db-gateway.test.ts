import test from "node:test";
import assert from "node:assert/strict";
import {
    PostgresDbGateway,
    type PostgresClient,
} from "../postgres-db-gateway.js";

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

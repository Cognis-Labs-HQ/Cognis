import test from "node:test";
import assert from "node:assert/strict";
import { MariaDbGateway, type MariaDbClient } from "../adapter.js";

test("mariadb adapter executes and commits transaction", async () => {
    let committed = false;
    const client: MariaDbClient = {
        async query() {
            return [[], { affectedRows: 2 }];
        },
        async beginTransaction() {},
        async commit() {
            committed = true;
        },
        async rollback() {
            throw new Error("should not rollback");
        },
    };

    const gateway = new MariaDbGateway(client);
    const result = await gateway.execute("UPDATE t SET c = 1");
    assert.equal(result.affectedRows, 2);
    await gateway.transaction(async () => undefined);
    assert.equal(committed, true);
});

test("mariadb adapter executes structured commands", async () => {
    const calls: Array<{ sql: string; params?: unknown[] }> = [];
    const client: MariaDbClient = {
        async query(sql: string, params?: unknown[]) {
            calls.push({ sql, params });
            return [[], { affectedRows: 4 }];
        },
        async beginTransaction() {},
        async commit() {},
        async rollback() {},
    };

    const gateway = new MariaDbGateway(client);
    const result = await gateway.executeCommand({
        option: "UPDATE",
        table: "modules",
        set: { enabled: false },
        where: [{ column: "module_id", value: "study" }],
    });

    assert.equal(
        calls[0]?.sql,
        "UPDATE modules SET enabled = ? WHERE module_id = ?",
    );
    assert.deepEqual(calls[0]?.params, [false, "study"]);
    assert.equal(result.rowCount, 4);
});

import test from "node:test";
import assert from "node:assert/strict";
import { MariaDbGateway, type MariaDbClient } from "../mariadb-db-gateway.js";

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

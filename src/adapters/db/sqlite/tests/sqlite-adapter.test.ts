import test from "node:test";
import assert from "node:assert/strict";
import { SqliteDbGateway, type SqliteClient } from "../index.js";

test("sqlite adapter runs query and transaction", async () => {
    const execCalls: string[] = [];
    const client: SqliteClient = {
        async all<Row>() {
            const rows: unknown[] = [{ id: 1 }];
            return rows as Row[];
        },
        async run() {
            return { changes: 1 };
        },
        async exec(statement: string) {
            execCalls.push(statement);
        },
    };

    const gateway = new SqliteDbGateway(client);
    const rows = await gateway.query("select * from t");
    assert.equal(rows.rowCount, 1);
    await gateway.transaction(async () => undefined);
    assert.deepEqual(execCalls, ["BEGIN", "COMMIT"]);
});

test("sqlite adapter executes structured commands", async () => {
    const allCalls: Array<{ statement: string; params?: unknown[] }> = [];
    const runCalls: Array<{ statement: string; params?: unknown[] }> = [];
    const client: SqliteClient = {
        async all<Row>(statement: string, params?: unknown[]) {
            allCalls.push({ statement, params });
            const rows: unknown[] = [{ module_id: "study" }];
            return rows as Row[];
        },
        async run(statement: string, params?: unknown[]) {
            runCalls.push({ statement, params });
            return { changes: 1 };
        },
        async exec() {},
    };

    const gateway = new SqliteDbGateway(client);
    const selectResult = await gateway.executeCommand({
        option: "SELECT",
        table: "modules",
        columns: ["module_id"],
        where: [{ column: "enabled", value: true }],
    });
    const insertResult = await gateway.executeCommand({
        option: "INSERT",
        table: "modules",
        values: {
            module_id: "study",
            enabled: true,
        },
        conflict: {
            action: "ignore",
        },
    });

    assert.equal(
        allCalls[0]?.statement,
        "SELECT module_id FROM modules WHERE enabled = ?",
    );
    assert.deepEqual(allCalls[0]?.params, [true]);
    assert.equal(
        runCalls[0]?.statement,
        "INSERT OR IGNORE INTO modules (module_id, enabled) VALUES (?, ?)",
    );
    assert.deepEqual(runCalls[0]?.params, ["study", true]);
    assert.equal(selectResult.rowCount, 1);
    assert.equal(insertResult.rowCount, 1);
});

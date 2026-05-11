import test from "node:test";
import assert from "node:assert/strict";
import {
    buildStructuredDbCommandStatement,
    type StructuredDbCommand,
} from "../reuse/db-command.js";
import {
    createDbDialectHelper,
    type DbDialectHelper,
} from "../bootstrap.js";
import type { DbExecutor } from "../reuse/db-executor.js";

test("gateway command builder emits postgres delete placeholders", () => {
    const statement = buildStructuredDbCommandStatement(
        {
            option: "DELETE",
            table: "mytable",
            where: [
                { column: "id", value: 7 },
                { column: "owner_id", value: "abc" },
            ],
        },
        "postgresql",
    );

    assert.equal(
        statement.sql,
        "DELETE FROM mytable WHERE id = $1 AND owner_id = $2",
    );
    assert.deepEqual(statement.params, [7, "abc"]);
    assert.equal(statement.returnsRows, false);
});

test("gateway command builder emits mariadb upserts", () => {
    const statement = buildStructuredDbCommandStatement(
        {
            option: "INSERT",
            table: "modules",
            values: {
                module_id: "study",
                enabled: true,
            },
            conflict: {
                action: "update",
                target: ["module_id"],
            },
        },
        "mariadb",
    );

    assert.equal(
        statement.sql,
        "INSERT INTO modules (module_id, enabled) VALUES (?, ?) ON DUPLICATE KEY UPDATE enabled = VALUES(enabled)",
    );
    assert.deepEqual(statement.params, ["study", true]);
});

test("gateway dialect helper executes structured select commands", async () => {
    const calls: Array<{ sql: string; params: unknown[] }> = [];
    const executor: DbExecutor = {
        async execute(sql: string, params: unknown[] = []) {
            calls.push({ sql, params });
            return {
                rows: [{ id: 1, handle: "admin" }],
                rowCount: 1,
            };
        },
    };

    const dialect: DbDialectHelper = createDbDialectHelper(
        executor,
        "postgresql",
    );
    const result = await dialect.executeCommand({
        option: "SELECT",
        table: "profiles",
        columns: ["id", "handle"],
        where: [{ column: "visibility", value: "public" }],
        orderBy: [{ column: "handle", direction: "ASC" }],
        limit: 5,
    });

    assert.equal(
        calls[0]?.sql,
        "SELECT id, handle FROM profiles WHERE visibility = $1 ORDER BY handle ASC LIMIT 5",
    );
    assert.deepEqual(calls[0]?.params, ["public"]);
    assert.equal(result.rowCount, 1);
    assert.deepEqual(result.rows, [{ id: 1, handle: "admin" }]);
});

test("gateway dialect helper insertIgnore uses structured builder", async () => {
    const calls: Array<{ sql: string; params: unknown[] }> = [];
    const executor: DbExecutor = {
        async execute(sql: string, params: unknown[] = []) {
            calls.push({ sql, params });
            return { rowCount: 1 };
        },
    };

    const dialect = createDbDialectHelper(executor, "sqlite");
    await dialect.insertIgnore("modules", {
        module_id: "cognis-core",
        enabled: true,
    });

    assert.equal(
        calls[0]?.sql,
        "INSERT OR IGNORE INTO modules (module_id, enabled) VALUES (?, ?)",
    );
    assert.deepEqual(calls[0]?.params, ["cognis-core", true]);
});

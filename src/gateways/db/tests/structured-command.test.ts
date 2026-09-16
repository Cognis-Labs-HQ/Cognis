import test from "node:test";
import assert from "node:assert/strict";
import {
    buildStructuredDbCommandStatement,
    type StructuredDbCommand,
    type StructuredDbDialect,
} from "../reuse/db-command.js";
import { createDbDialectHelper, type DbDialectHelper } from "../bootstrap.js";
import type { DbExecutor } from "../reuse/db-executor.js";

const POSTGRESQL_STRUCTURED_DB_DIALECT: StructuredDbDialect = {
    createPlaceholder(parameterIndex) {
        return `$${parameterIndex}`;
    },
    buildInsertPrefix() {
        return "INSERT INTO";
    },
    buildInsertConflictClause({
        conflict,
        conflictTarget,
        updateEntries,
        addParameter,
        hasExplicitUpdate,
    }) {
        if (conflict.action === "ignore") {
            const target =
                conflictTarget.length > 0
                    ? ` (${conflictTarget.join(", ")})`
                    : "";
            return ` ON CONFLICT${target} DO NOTHING`;
        }
        const assignments = updateEntries.map(([column, value]) =>
            hasExplicitUpdate
                ? `${column} = ${addParameter(value)}`
                : `${column} = EXCLUDED.${column}`,
        );
        return ` ON CONFLICT (${conflictTarget.join(", ")}) DO UPDATE SET ${assignments.join(", ")}`;
    },
};

const MARIADB_STRUCTURED_DB_DIALECT: StructuredDbDialect = {
    createPlaceholder() {
        return "?";
    },
    buildInsertPrefix(conflict) {
        if (conflict?.action === "ignore") {
            return "INSERT IGNORE INTO";
        }
        return "INSERT INTO";
    },
    buildInsertConflictClause({
        conflict,
        updateEntries,
        addParameter,
        hasExplicitUpdate,
    }) {
        if (conflict.action === "ignore") {
            return "";
        }
        const assignments = updateEntries.map(([column, value]) =>
            hasExplicitUpdate
                ? `${column} = ${addParameter(value)}`
                : `${column} = VALUES(${column})`,
        );
        return ` ON DUPLICATE KEY UPDATE ${assignments.join(", ")}`;
    },
};

const SQLITE_STRUCTURED_DB_DIALECT: StructuredDbDialect = {
    createPlaceholder() {
        return "?";
    },
    buildInsertPrefix(conflict) {
        if (
            conflict?.action === "ignore" &&
            (!conflict.target || conflict.target.length === 0)
        ) {
            return "INSERT OR IGNORE INTO";
        }
        return "INSERT INTO";
    },
    buildInsertConflictClause({ conflict, conflictTarget }) {
        if (conflict.action === "ignore") {
            if (conflictTarget.length === 0) {
                return "";
            }
            return ` ON CONFLICT (${conflictTarget.join(", ")}) DO NOTHING`;
        }
        throw new Error("sqlite test dialect only covers ignore clauses.");
    },
};

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
        POSTGRESQL_STRUCTURED_DB_DIALECT,
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
        MARIADB_STRUCTURED_DB_DIALECT,
    );

    assert.equal(
        statement.sql,
        "INSERT INTO modules (module_id, enabled) VALUES (?, ?) ON DUPLICATE KEY UPDATE enabled = VALUES(enabled)",
    );
    assert.deepEqual(statement.params, ["study", true]);
});

test("gateway command builder emits sqlite ignore syntax", () => {
    const statement = buildStructuredDbCommandStatement(
        {
            option: "INSERT",
            table: "modules",
            values: {
                module_id: "study",
                enabled: true,
            },
            conflict: {
                action: "ignore",
            },
        },
        SQLITE_STRUCTURED_DB_DIALECT,
    );

    assert.equal(
        statement.sql,
        "INSERT OR IGNORE INTO modules (module_id, enabled) VALUES (?, ?)",
    );
    assert.deepEqual(statement.params, ["study", true]);
});

test("gateway dialect helper delegates structured commands to the executor", async () => {
    const calls: StructuredDbCommand[] = [];
    const executor: DbExecutor = {
        async execute() {
            throw new Error(
                "helper should use executeCommand for structured calls",
            );
        },
        async executeCommand(command) {
            calls.push(command);
            return {
                rows: [{ id: 1, handle: "admin" }],
                rowCount: 1,
            };
        },
    };

    const dialect: DbDialectHelper = createDbDialectHelper(executor);
    const result = await dialect.executeCommand({
        option: "SELECT",
        table: "profiles",
        columns: ["id", "handle"],
        where: [{ column: "visibility", value: "public" }],
        orderBy: [{ column: "handle", direction: "ASC" }],
        limit: 5,
    });

    assert.deepEqual(calls[0], {
        option: "SELECT",
        table: "profiles",
        columns: ["id", "handle"],
        where: [{ column: "visibility", value: "public" }],
        orderBy: [{ column: "handle", direction: "ASC" }],
        limit: 5,
    });
    assert.equal(result.rowCount, 1);
    assert.deepEqual(result.rows, [{ id: 1, handle: "admin" }]);
});

test("gateway dialect helper insertIgnore delegates a structured command", async () => {
    const calls: StructuredDbCommand[] = [];
    const executor: DbExecutor = {
        async execute() {
            throw new Error(
                "helper should use executeCommand for structured calls",
            );
        },
        async executeCommand(command) {
            calls.push(command);
            return { rowCount: 1 };
        },
    };

    const dialect = createDbDialectHelper(executor);
    await dialect.insertIgnore("modules", {
        module_id: "cognis-core",
        enabled: true,
    });

    assert.deepEqual(calls[0], {
        option: "INSERT",
        table: "modules",
        values: {
            module_id: "cognis-core",
            enabled: true,
        },
        conflict: {
            action: "ignore",
        },
    });
});

import test from "node:test";
import assert from "node:assert/strict";

import { ensureSchema } from "../store/schema.js";

function createRawExecutor(onExecute) {
    return {
        async ensureTable() {},
        async executeCommand() {
            return { rows: [], rowCount: 0 };
        },
        async transaction(callback) {
            return callback(this);
        },
        async execute(sql) {
            return onExecute(sql);
        },
    };
}

test("classes schema detection avoids sqlite pragma probes on Postgres", async () => {
    const executedStatements = [];
    const executor = createRawExecutor(async (sql) => {
        executedStatements.push(sql);
        if (sql === "SELECT current_schema()") {
            return { rows: [{ current_schema: "public" }], rowCount: 1 };
        }
        if (sql.includes("information_schema.columns")) {
            return { rows: [{ column_name: "present" }], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
    });

    await ensureSchema(executor);

    assert.equal(executedStatements[0], "SELECT current_schema()");
    assert.equal(
        executedStatements.some((statement) => statement.startsWith("PRAGMA")),
        false,
    );
});

test("classes schema adds active whiteboard state column when missing", async () => {
    const executedStatements = [];
    const executor = createRawExecutor(async (sql) => {
        executedStatements.push(sql);
        if (sql === "SELECT current_schema()") {
            return { rows: [{ current_schema: "public" }], rowCount: 1 };
        }
        if (sql.includes("information_schema.columns")) {
            return {
                rows: sql.includes("active_whiteboard_id")
                    ? []
                    : [{ column_name: "present" }],
                rowCount: sql.includes("active_whiteboard_id") ? 0 : 1,
            };
        }
        return { rows: [], rowCount: 0 };
    });

    await ensureSchema(executor);

    assert.equal(
        executedStatements.includes(
            "ALTER TABLE classroom_state ADD COLUMN active_whiteboard_id TEXT",
        ),
        true,
    );
});

import assert from "node:assert/strict";
import test from "node:test";
import { createDbExecutor, type PostgresPool } from "../index.js";

for (const existing of [false, true]) {
    test(`unique declarations are reconciled with existing index coverage: ${existing}`, async () => {
        const statements: string[] = [];
        const query = async (sql: string) => {
            statements.push(sql);
            if (sql.includes("FROM pg_index") && existing) {
                return {
                    rows: [
                        { columns: ["reference_key"] },
                        { columns: ["owner", "scope"] },
                    ],
                    rowCount: 2,
                };
            }
            return { rows: [], rowCount: 0 };
        };
        const executor = await createDbExecutor({
            databaseUrl: "postgresql://unused",
            pool: {
                query,
                connect: async () => ({ query, release() {} }),
                end: async () => undefined,
            } as PostgresPool,
        });
        await executor.ensureTable({
            name: "resources",
            columns: [
                { name: "reference_key", type: "text", unique: true },
                { name: "owner", type: "text" },
                { name: "scope", type: "text" },
            ],
            uniqueKeys: [["reference_key"], ["scope", "owner"]],
        });
        const indexes = statements.filter((sql) =>
            sql.startsWith("CREATE UNIQUE INDEX"),
        );
        assert.equal(indexes.length, existing ? 0 : 2);
        assert.equal(statements[0], "BEGIN");
        assert.match(statements[1], /pg_advisory_xact_lock/);
        assert.equal(statements.at(-1), "COMMIT");
    });
}

test("a rejected unique key rolls back schema initialization and releases the client", async () => {
    const statements: string[] = [];
    let released = false;
    const failure = Object.assign(new Error("duplicate key"), {
        code: "23505",
    });
    const query = async (sql: string) => {
        statements.push(sql);
        if (sql.startsWith("CREATE UNIQUE INDEX")) throw failure;
        return { rows: [], rowCount: 0 };
    };
    const executor = await createDbExecutor({
        databaseUrl: "postgresql://unused",
        pool: {
            query,
            connect: async () => ({
                query,
                release() {
                    released = true;
                },
            }),
            end: async () => undefined,
        },
    });
    await assert.rejects(
        executor.ensureTable({
            name: "resources",
            columns: [{ name: "reference_key", type: "text", unique: true }],
        }),
        failure,
    );
    assert.equal(statements.at(-1), "ROLLBACK");
    assert.equal(released, true);
});

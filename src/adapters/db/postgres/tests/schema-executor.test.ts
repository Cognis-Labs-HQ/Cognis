import assert from "node:assert/strict";
import test from "node:test";
import {
    createDbExecutor,
    type PostgresPool,
    type PostgresClient,
} from "../index.js";

const definition = {
    name: "records",
    columns: ["owner", "item"].map((name) => ({ name, type: "text" as const })),
    primaryKey: ["owner", "item"],
};

function schemaPool({ changedAfterLock = false, failAlter = false } = {}) {
    const statements: string[] = [];
    let locked = false;
    let releases = 0;
    const query = async (sql: string) => {
        statements.push(sql);
        if (sql.startsWith("LOCK TABLE")) locked = true;
        if (failAlter && sql.startsWith("ALTER TABLE"))
            throw new Error("key_conflict");
        const rows = sql.includes("FROM pg_index")
            ? [
                  {
                      is_primary: true,
                      constraint_name: "records_pkey",
                      columns:
                          locked && changedAfterLock
                              ? ["owner", "item"]
                              : ["owner"],
                  },
              ]
            : sql.includes("information_schema.columns")
              ? [{ column_name: "owner" }, { column_name: "item" }]
              : [];
        return { rows, rowCount: rows.length };
    };
    const client: PostgresClient = {
        query: query as PostgresClient["query"],
        release: () => {
            releases++;
        },
    };
    const pool: PostgresPool = {
        query: query as PostgresPool["query"],
        connect: async () => client,
        end: async () => {},
    };
    return { pool, statements, releases: () => releases };
}

test("PostgreSQL rechecks keys under a table lock before repairing a concurrently initialized table", async () => {
    const fixture = schemaPool({ changedAfterLock: true });
    const executor = await createDbExecutor({
        databaseUrl: "unused",
        pool: fixture.pool,
    });
    await executor.ensureTable(definition);
    assert.equal(
        fixture.statements.filter((sql) => sql.includes("FROM pg_index"))
            .length,
        2,
    );
    assert.deepEqual(
        fixture.statements.filter((sql) =>
            /^(BEGIN|LOCK|ALTER|COMMIT|ROLLBACK)/.test(sql),
        ),
        ["BEGIN", "LOCK TABLE records IN ACCESS EXCLUSIVE MODE", "COMMIT"],
    );
    assert.equal(fixture.releases(), 1);
});

test("PostgreSQL key repair shares its caller's transaction and leaves rollback to that caller", async () => {
    const fixture = schemaPool();
    const executor = await createDbExecutor({
        databaseUrl: "unused",
        pool: fixture.pool,
    });
    await assert.rejects(
        executor.transaction(async (transaction) => {
            await transaction.ensureTable(definition);
            throw new Error("caller_failure");
        }),
        /caller_failure/,
    );
    assert.deepEqual(
        fixture.statements.filter((sql) =>
            /^(BEGIN|COMMIT|ROLLBACK)/.test(sql),
        ),
        ["BEGIN", "ROLLBACK"],
    );
    assert.equal(
        fixture.statements.filter((sql) => sql.startsWith("ALTER TABLE"))
            .length,
        2,
    );
    assert.equal(fixture.releases(), 1);
});

test("failed PostgreSQL key repair rolls back and releases its pooled connection", async () => {
    const fixture = schemaPool({ failAlter: true });
    const executor = await createDbExecutor({
        databaseUrl: "unused",
        pool: fixture.pool,
    });
    await assert.rejects(executor.ensureTable(definition), /key_conflict/);
    assert.deepEqual(
        fixture.statements.filter((sql) =>
            /^(BEGIN|COMMIT|ROLLBACK)/.test(sql),
        ),
        ["BEGIN", "ROLLBACK"],
    );
    assert.equal(fixture.releases(), 1);
});

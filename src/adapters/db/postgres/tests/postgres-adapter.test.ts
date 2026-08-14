import test from "node:test";
import assert from "node:assert/strict";
import {
    PostgresDbGateway,
    createDbExecutor,
    readPostgresPoolSettings,
    type PostgresClient,
    type PostgresPool,
} from "../index.js";

function createPool(
    options: {
        query?: PostgresPool["query"];
        connect?: PostgresPool["connect"];
        end?: PostgresPool["end"];
    } = {},
): PostgresPool {
    return {
        query:
            options.query ??
            ((async () => ({
                rows: [],
                rowCount: 0,
            })) as PostgresPool["query"]),
        connect:
            options.connect ??
            (async () => {
                throw new Error("Unexpected pool connection");
            }),
        end: options.end ?? (async () => undefined),
    };
}

function createClient(
    query: PostgresClient["query"],
    release: () => void,
): PostgresClient {
    return { query, release };
}

test("postgres adapter executes concurrent ordinary queries through the pool", async () => {
    const activeStatements = new Set<string>();
    let maximumConcurrency = 0;
    const pool = createPool({
        query: (async (statement: string) => {
            activeStatements.add(statement);
            maximumConcurrency = Math.max(
                maximumConcurrency,
                activeStatements.size,
            );
            await new Promise((resolve) => setTimeout(resolve, 5));
            activeStatements.delete(statement);
            return { rows: [{ statement }], rowCount: 1 };
        }) as PostgresPool["query"],
    });
    const gateway = new PostgresDbGateway(pool);

    const results = await Promise.all([
        gateway.query("SELECT 1"),
        gateway.query("SELECT 2"),
    ]);

    assert.equal(maximumConcurrency, 2);
    assert.deepEqual(
        results.map((result) => result.rows[0]),
        [{ statement: "SELECT 1" }, { statement: "SELECT 2" }],
    );
});

test("postgres transaction keeps every statement on its acquired client", async () => {
    const poolStatements: string[] = [];
    const clientStatements: string[] = [];
    let releases = 0;
    const client = createClient(
        async (statement: string) => {
            clientStatements.push(statement);
            return { rows: [], rowCount: 0 };
        },
        () => {
            releases += 1;
        },
    );
    const pool = createPool({
        query: async (statement: string) => {
            poolStatements.push(statement);
            return { rows: [], rowCount: 0 };
        },
        connect: async () => client,
    });

    await new PostgresDbGateway(pool).transaction(async (transaction) => {
        await transaction.query("SELECT transaction_value");
        await transaction.execute("UPDATE transaction_value");
    });

    assert.deepEqual(clientStatements, [
        "BEGIN",
        "SELECT transaction_value",
        "UPDATE transaction_value",
        "COMMIT",
    ]);
    assert.deepEqual(poolStatements, []);
    assert.equal(releases, 1);
});

test("postgres pool recovers after an ordinary query connection failure", async () => {
    let attempts = 0;
    const pool = createPool({
        query: async () => {
            attempts += 1;
            if (attempts === 1) throw new Error("connection unavailable");
            return { rows: [{ recovered: true }], rowCount: 1 };
        },
    });
    const gateway = new PostgresDbGateway(pool);

    await assert.rejects(gateway.query("SELECT 1"), /connection unavailable/);
    const result = await gateway.query<{ recovered: boolean }>("SELECT 1");

    assert.equal(result.rows[0]?.recovered, true);
    assert.equal(attempts, 2);
});

test("postgres transaction rolls back and releases its client after failure", async () => {
    const statements: string[] = [];
    let releases = 0;
    const pool = createPool({
        connect: async () =>
            createClient(
                async (statement: string) => {
                    statements.push(statement);
                    return { rows: [], rowCount: 0 };
                },
                () => {
                    releases += 1;
                },
            ),
    });

    await assert.rejects(
        new PostgresDbGateway(pool).transaction(async () => {
            throw new Error("transaction failed");
        }),
        /transaction failed/,
    );

    assert.deepEqual(statements, ["BEGIN", "ROLLBACK"]);
    assert.equal(releases, 1);
});

test("postgres adapter registers pool shutdown with the lifecycle capability", async () => {
    let shutdown: (() => Promise<void>) | undefined;
    let endCalls = 0;
    const pool = createPool({
        end: async () => {
            endCalls += 1;
        },
    });

    await createDbExecutor({
        databaseUrl: "postgresql://unused",
        pool,
        lifecycle: {
            registerShutdown(handler) {
                shutdown = handler;
            },
        },
    });
    assert.ok(shutdown);
    await shutdown();

    assert.equal(endCalls, 1);
});

test("postgres adapter executes structured commands", async () => {
    const calls: Array<{ sql: string; params?: unknown[] }> = [];
    const pool = createPool({
        query: async (sql: string, params?: unknown[]) => {
            calls.push({ sql, params });
            return { rows: [{ id: 3 }], rowCount: 1 };
        },
    });

    const result = await new PostgresDbGateway(pool).executeCommand({
        option: "DELETE",
        table: "profiles",
        where: [{ column: "id", value: 3 }],
    });

    assert.equal(calls[0]?.sql, "DELETE FROM profiles WHERE id = $1");
    assert.deepEqual(calls[0]?.params, [3]);
    assert.equal(result.rowCount, 1);
});

test("postgres pool environment settings are bounded", () => {
    const previousMaximum = process.env.POSTGRES_POOL_MAX;
    process.env.POSTGRES_POOL_MAX = "101";
    assert.throws(readPostgresPoolSettings, /between 1 and 100/);
    if (previousMaximum === undefined) delete process.env.POSTGRES_POOL_MAX;
    else process.env.POSTGRES_POOL_MAX = previousMaximum;
});

test("postgres queries have a finite default statement timeout", () => {
    assert.equal(readPostgresPoolSettings().statement_timeout, 30_000);
});

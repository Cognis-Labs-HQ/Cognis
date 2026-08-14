import test from "node:test";
import assert from "node:assert/strict";
import {
    MariaDbGateway,
    createDbExecutor,
    readMariaDbPoolSettings,
    type MariaDbClient,
    type MariaDbPool,
} from "../index.js";

function createPool(
    options: {
        query?: MariaDbPool["query"];
        getConnection?: MariaDbPool["getConnection"];
        end?: MariaDbPool["end"];
    } = {},
): MariaDbPool {
    return {
        query: options.query ?? (async () => [[], {}]),
        getConnection:
            options.getConnection ??
            (async () => {
                throw new Error("Unexpected pool connection");
            }),
        end: options.end ?? (async () => undefined),
    };
}

function createClient(
    query: MariaDbClient["query"],
    calls: string[],
    release: () => void,
): MariaDbClient {
    return {
        query,
        async beginTransaction() {
            calls.push("BEGIN");
        },
        async commit() {
            calls.push("COMMIT");
        },
        async rollback() {
            calls.push("ROLLBACK");
        },
        release,
    };
}

test("mariadb adapter executes concurrent ordinary queries through the pool", async () => {
    const activeStatements = new Set<string>();
    let maximumConcurrency = 0;
    const gateway = new MariaDbGateway(
        createPool({
            query: async (statement: string) => {
                activeStatements.add(statement);
                maximumConcurrency = Math.max(
                    maximumConcurrency,
                    activeStatements.size,
                );
                await new Promise((resolve) => setTimeout(resolve, 5));
                activeStatements.delete(statement);
                return [[{ statement }], {}];
            },
        }),
    );

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

test("mariadb transaction keeps every statement on its acquired connection", async () => {
    const transactionCalls: string[] = [];
    const poolCalls: string[] = [];
    let releases = 0;
    const client = createClient(
        async (statement: string) => {
            transactionCalls.push(statement);
            return [[], {}];
        },
        transactionCalls,
        () => {
            releases += 1;
        },
    );
    const pool = createPool({
        query: async (statement: string) => {
            poolCalls.push(statement);
            return [[], {}];
        },
        getConnection: async () => client,
    });

    await new MariaDbGateway(pool).transaction(async (transaction) => {
        await transaction.query("SELECT transaction_value");
        await transaction.execute("UPDATE transaction_value");
    });

    assert.deepEqual(transactionCalls, [
        "BEGIN",
        "SELECT transaction_value",
        "UPDATE transaction_value",
        "COMMIT",
    ]);
    assert.deepEqual(poolCalls, []);
    assert.equal(releases, 1);
});

test("mariadb pool recovers after an ordinary query connection failure", async () => {
    let attempts = 0;
    const gateway = new MariaDbGateway(
        createPool({
            query: async () => {
                attempts += 1;
                if (attempts === 1) throw new Error("connection unavailable");
                return [[{ recovered: true }], {}];
            },
        }),
    );

    await assert.rejects(gateway.query("SELECT 1"), /connection unavailable/);
    const result = await gateway.query<{ recovered: boolean }>("SELECT 1");

    assert.equal(result.rows[0]?.recovered, true);
    assert.equal(attempts, 2);
});

test("mariadb transaction rolls back and releases after failure", async () => {
    const calls: string[] = [];
    let releases = 0;
    const client = createClient(
        async () => [[], {}],
        calls,
        () => {
            releases += 1;
        },
    );
    const pool = createPool({ getConnection: async () => client });

    await assert.rejects(
        new MariaDbGateway(pool).transaction(async () => {
            throw new Error("transaction failed");
        }),
        /transaction failed/,
    );

    assert.deepEqual(calls, ["BEGIN", "ROLLBACK"]);
    assert.equal(releases, 1);
});

test("mariadb adapter registers pool shutdown with the lifecycle capability", async () => {
    let shutdown: (() => Promise<void>) | undefined;
    let endCalls = 0;
    await createDbExecutor({
        databaseUrl: "mariadb://unused",
        pool: createPool({
            end: async () => {
                endCalls += 1;
            },
        }),
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

test("mariadb adapter executes structured commands", async () => {
    const calls: Array<{ sql: string; params?: unknown[] }> = [];
    const gateway = new MariaDbGateway(
        createPool({
            query: async (sql: string, params?: unknown[]) => {
                calls.push({ sql, params });
                return [{ affectedRows: 4 }, {}];
            },
        }),
    );

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

test("mariadb pool environment settings are bounded", () => {
    const previousMaximum = process.env.MARIADB_POOL_MAX;
    process.env.MARIADB_POOL_MAX = "101";
    assert.throws(readMariaDbPoolSettings, /between 1 and 100/);
    if (previousMaximum === undefined) delete process.env.MARIADB_POOL_MAX;
    else process.env.MARIADB_POOL_MAX = previousMaximum;
});

test("mariadb waiting queries have a bounded default queue", () => {
    assert.equal(readMariaDbPoolSettings().queueLimit, 100);
});

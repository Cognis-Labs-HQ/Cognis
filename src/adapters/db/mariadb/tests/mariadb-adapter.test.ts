import test from "node:test";
import assert from "node:assert/strict";
import {
    MariaDbGateway,
    createDbExecutor,
    readMariaDbPoolSettings,
    waitForMariaDb,
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

test("mariadb startup waits for a temporarily unavailable server", async () => {
    let attempts = 0;
    const delays: number[] = [];
    await waitForMariaDb(
        {
            query: async () => {
                attempts += 1;
                if (attempts < 3) {
                    throw Object.assign(new Error("not ready"), {
                        code: "ECONNREFUSED",
                    });
                }
                return [[], {}];
            },
        },
        { timeout: 1_000, retryInterval: 25 },
        undefined,
        async (milliseconds) => {
            delays.push(milliseconds);
        },
    );

    assert.equal(attempts, 3);
    assert.deepEqual(delays, [25, 25]);
});

test("mariadb startup does not hide configuration failures", async () => {
    let delays = 0;
    await assert.rejects(
        waitForMariaDb(
            {
                query: async () => {
                    throw Object.assign(new Error("access denied"), {
                        code: "ER_ACCESS_DENIED_ERROR",
                    });
                },
            },
            { timeout: 1_000, retryInterval: 25 },
            undefined,
            async () => {
                delays += 1;
            },
        ),
        /access denied/,
    );
    assert.equal(delays, 0);
});

test("mariadb uses indexable types for foreign keys and heals constraints", async () => {
    const statements: string[] = [];
    const executor = await createDbExecutor({
        databaseUrl: "mariadb://unused",
        pool: createPool({
            query: async (sql: string) => {
                statements.push(sql);
                return [[], {}];
            },
        }),
    });

    await executor.ensureTable({
        name: "auth_identities",
        columns: [
            { name: "id", type: "text", primaryKey: true },
            {
                name: "account_id",
                type: "text",
                notNull: true,
                references: {
                    table: "accounts",
                    column: "id",
                    onDelete: "CASCADE",
                },
            },
        ],
        indexes: [{ columns: ["account_id"] }],
    });

    assert.match(
        statements.find((sql) => sql.startsWith("CREATE TABLE")) ?? "",
        /account_id VARCHAR\(255\) NOT NULL REFERENCES accounts\(id\) ON DELETE CASCADE/,
    );
    assert.match(
        statements.find((sql) =>
            sql.includes("ADD COLUMN IF NOT EXISTS account_id"),
        ) ?? "",
        /REFERENCES accounts\(id\) ON DELETE CASCADE/,
    );
});

test("mariadb repairs text index columns before creating their indexes", async () => {
    const statements: string[] = [];
    const executor = await createDbExecutor({
        databaseUrl: "mariadb://unused",
        pool: createPool({
            query: async (sql: string) => {
                statements.push(sql);
                if (sql.includes("information_schema.COLUMNS")) {
                    return [
                        [{ column_name: "account_id", data_type: "text" }],
                        {},
                    ];
                }
                return [[], {}];
            },
        }),
    });

    await executor.ensureTable({
        name: "internal_notifications",
        columns: [
            { name: "account_id", type: "text", notNull: true },
            { name: "created_at", type: "bigint", notNull: true },
        ],
        indexes: [
            {
                name: "idx_internal_notif_account",
                columns: ["account_id", "created_at"],
            },
        ],
    });

    const repairIndex = statements.findIndex((sql) =>
        sql.includes("MODIFY COLUMN account_id VARCHAR(255) NOT NULL"),
    );
    const createIndex = statements.findIndex((sql) =>
        sql.startsWith("CREATE INDEX IF NOT EXISTS"),
    );
    assert.ok(repairIndex >= 0);
    assert.ok(createIndex > repairIndex);
});

import test from "node:test";
import assert from "node:assert/strict";
import {
    resolveDbProviderDir,
    initializeDatabaseSchema,
} from "../../bootstrap/db-init.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesRoot = path.resolve(__dirname, "fixtures");

test("db init resolves supported providers", () => {
    assert.equal(resolveDbProviderDir("sqlite"), "sqlite");
    assert.equal(resolveDbProviderDir("postgresql"), "postgres");
    assert.equal(resolveDbProviderDir("mariadb"), "mariadb");
    assert.equal(resolveDbProviderDir("mysql"), "mariadb");
});

interface Call {
    sql: string;
    params: unknown[];
}

function makeMockExecutor() {
    const calls: Call[] = [];
    const mockedRows: Map<string, { id: string }[]> = new Map();

    const executor = {
        calls,
        mockSelectRows(
            sql: string,
            params: unknown[],
            result: { id: string }[],
        ) {
            const key = `${sql.trim()}${JSON.stringify(params)}`;
            mockedRows.set(key, result);
        },
        async execute(sql: string, params: unknown[] = []) {
            calls.push({ sql: sql.trim(), params });
            const key = `${sql.trim()}${JSON.stringify(params)}`;
            if (mockedRows.has(key)) {
                return { rows: mockedRows.get(key) };
            }
            if (sql.trim().toLowerCase().startsWith("select")) {
                return { rows: [] };
            }
            return { rowCount: 0 };
        },
    };
    return executor;
}

function insertCalls(calls: Call[], table: string): Call[] {
    return calls.filter(
        (c) =>
            c.sql.toLowerCase().startsWith("insert") &&
            c.sql.toLowerCase().includes(table),
    );
}

test("init phase runs SQL files the first time and records sentinel", async () => {
    const executor = makeMockExecutor();
    const logger = { info: async () => {} };

    await initializeDatabaseSchema("sqlite", logger, executor, fixturesRoot);

    const sentinelInserts = insertCalls(executor.calls, "db_migrations").filter(
        (c) => Array.isArray(c.params) && c.params[0] === "init:__phase__",
    );
    assert.equal(sentinelInserts.length, 1, "sentinel should be recorded once");
});

test("init phase is skipped when sentinel already recorded", async () => {
    const executor = makeMockExecutor();
    const logger = { info: async () => {} };

    executor.mockSelectRows(
        "SELECT id FROM db_migrations WHERE id = ?",
        ["init:__phase__"],
        [{ id: "init:__phase__" }],
    );

    await initializeDatabaseSchema("sqlite", logger, executor, fixturesRoot);

    const initDdl = executor.calls.filter(
        (c) =>
            c.sql.toLowerCase().startsWith("create table if not exists") &&
            !c.sql.toLowerCase().includes("db_migrations"),
    );
    assert.equal(
        initDdl.length,
        0,
        "no init DDL should execute on second boot",
    );
});

test("migration runs the first time and records it", async () => {
    const executor = makeMockExecutor();
    const logger = { info: async () => {} };

    executor.mockSelectRows(
        "SELECT id FROM db_migrations WHERE id = ?",
        ["init:__phase__"],
        [{ id: "init:__phase__" }],
    );

    await initializeDatabaseSchema("sqlite", logger, executor, fixturesRoot);

    const migrationInserts = insertCalls(
        executor.calls,
        "db_migrations",
    ).filter(
        (c) =>
            Array.isArray(c.params) &&
            typeof c.params[0] === "string" &&
            (c.params[0] as string).startsWith("migrate:"),
    );
    assert.ok(
        migrationInserts.length >= 1,
        "migration file should be recorded in db_migrations",
    );
});

test("migration is skipped when already recorded", async () => {
    const executor = makeMockExecutor();
    const logger = { info: async () => {} };

    executor.mockSelectRows(
        "SELECT id FROM db_migrations WHERE id = ?",
        ["init:__phase__"],
        [{ id: "init:__phase__" }],
    );
    executor.mockSelectRows(
        "SELECT id FROM db_migrations WHERE id = ?",
        ["migrate:001_test.sql"],
        [{ id: "migrate:001_test.sql" }],
    );

    await initializeDatabaseSchema("sqlite", logger, executor, fixturesRoot);

    const alterStatements = executor.calls.filter((c) =>
        c.sql.toLowerCase().startsWith("alter"),
    );
    assert.equal(alterStatements.length, 0, "migration DDL should not re-run");
});

test("db_migrations table is always created", async () => {
    const executor = makeMockExecutor();
    const logger = { info: async () => {} };

    await initializeDatabaseSchema("sqlite", logger, executor, fixturesRoot);

    const created = executor.calls.some((c) =>
        c.sql
            .toLowerCase()
            .includes("create table if not exists db_migrations"),
    );
    assert.ok(created, "db_migrations table must be created on every boot");
});

test("postgresql uses dollar-sign placeholders", async () => {
    const executor = makeMockExecutor();
    const logger = { info: async () => {} };

    await initializeDatabaseSchema(
        "postgresql",
        logger,
        executor,
        fixturesRoot,
    );

    const selectWithDollar = executor.calls.some((c) =>
        c.sql.includes("WHERE id = $1"),
    );
    assert.ok(selectWithDollar, "postgresql should use $1 placeholders");
});

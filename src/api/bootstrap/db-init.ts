/**
 * Database schema initialisation and migration runner.
 *
 * This module is the entry point for all DDL applied to the database at boot
 * time. It must be called **before** any adapter or store method that touches
 * the database.
 *
 * Boot sequence (see db/README.md for the full convention):
 *
 *   1. initializeDatabaseSchema() runs src/adapters/db/<provider>/sql/init/*.sql in
 *      alphabetical order.  Every statement must use IF NOT EXISTS so the
 *      files are idempotent across restarts.
 *
 *   2. It then runs src/adapters/db/<provider>/sql/migrate/*.sql in alphabetical order.
 *      Migration files must also be guarded (ADD COLUMN IF NOT EXISTS, etc.)
 *      so they are safe to re-run.
 *
 *   3. Adapter ensureSchema() methods may be called afterwards as a no-op
 *      safety net; by the time they execute every table already exists.
 *
 * Authoring constraint: SQL files are split on the `;` character.  Do not
 * include semicolons inside string literals in these files.
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { DbExecutor } from "../adapters/db/account-store.js";

/** Minimal logging interface required by the database initializer. */
export interface DbInitLogger {
    info(message: string, meta?: Record<string, unknown>): void | Promise<void>;
}

export function resolveDbProviderDir(dbType: string) {
    if (dbType === "postgresql") return "postgresql";
    if (dbType === "mariadb" || dbType === "mysql") return "mariadb";
    return "sqlite";
}

function splitSqlStatements(sql: string): string[] {
    return sql
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.startsWith("--"))
        .map((s) => `${s};`);
}

async function runSqlDir(
    dir: string,
    label: string,
    logger: DbInitLogger,
    executor: DbExecutor,
) {
    let files: string[];
    try {
        files = (await readdir(dir))
            .filter((name) => name.endsWith(".sql"))
            .sort();
    } catch {
        return { files: [], sqlCount: 0 };
    }
    const contents = await Promise.all(
        files.map((name) => readFile(path.join(dir, name), "utf8")),
    );
    await logger.info(`Running database ${label} scripts.`, { dir, files });
    for (let i = 0; i < files.length; i++) {
        const statements = splitSqlStatements(contents[i]);
        for (const statement of statements) {
            await executor.execute(statement);
        }
        await logger.info(`Database ${label} script applied.`, {
            file: files[i],
        });
    }
    return { files, sqlCount: contents.length };
}

export async function initializeDatabaseSchema(
    dbType: string,
    logger: DbInitLogger,
    executor: DbExecutor,
    adaptersRoot: string = path.resolve(process.cwd(), "src", "adapters"),
) {
    const dir = resolveDbProviderDir(dbType);
    const initRoot = path.join(adaptersRoot, "db", dir, "sql", "init");
    const migrateRoot = path.join(adaptersRoot, "db", dir, "sql", "migrate");
    const { files: initFiles, sqlCount: initCount } = await runSqlDir(
        initRoot,
        "initialization",
        logger,
        executor,
    );
    const { files: migrateFiles, sqlCount: migrateCount } = await runSqlDir(
        migrateRoot,
        "migration",
        logger,
        executor,
    );
    return {
        dbType: dir,
        files: [...initFiles, ...migrateFiles],
        sqlCount: initCount + migrateCount,
    };
}

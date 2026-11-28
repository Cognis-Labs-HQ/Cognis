/**
 * Database schema initialisation and migration runner.
 *
 * This module is the entry point for all DDL applied to the database at boot
 * time. It must be called **before** any adapter or store method that touches
 * the database.
 *
 * Boot sequence:
 *
 *   1. A `db_migrations` tracking table is created (idempotent).
 *
 *   2. initializeDatabaseSchema() checks whether the init phase has already
 *      run (via a sentinel row in `db_migrations`). If it has, all init files
 *      are skipped. If not, init files under sql/init/ are executed in
 *      alphabetical order and the sentinel is recorded.
 *
 *   3. Each migration file under sql/migrate/ is checked individually by its
 *      SHA-256 checksum. Files already recorded in `db_migrations` are
 *      skipped; new or changed files are executed and then recorded.
 *
 *   4. Adapter ensureSchema() methods may be called afterwards as a no-op
 *      safety net; by the time they execute every table already exists.
 *
 * Authoring constraint: SQL files are split on the `;` character.  Do not
 * include semicolons inside string literals in these files.
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { DatabaseExecutor } from "./reuse/db-executor.js";
import { sha256Of } from "../../api/reuse/crypto.js";

/** Minimal logging interface required by the database initializer. */
export interface DatabaseInitializationLogger {
    info(message: string, meta?: Record<string, unknown>): void | Promise<void>;
}

function resolveDatabaseProviderDirectory(databaseType: string) {
    if (databaseType === "mariadb" || databaseType === "mysql")
        return "mariadb";
    return "postgres";
}
export { resolveDatabaseProviderDirectory };

function splitSqlStatements(sql: string): string[] {
    return sql
        .split(";")
        .map((statement) => statement.trim())
        .filter(
            (statement) => statement.length > 0 && !statement.startsWith("--"),
        )
        .map((statement) => `${statement};`);
}

async function ensureMigrationsTable(
    dir: string,
    executor: DatabaseExecutor,
): Promise<void> {
    if (dir === "mariadb") {
        await executor.execute(
            `CREATE TABLE IF NOT EXISTS db_migrations (
  id VARCHAR(191) PRIMARY KEY,
  sha256 VARCHAR(64) NOT NULL,
  applied_at VARCHAR(32) NOT NULL
)`,
        );
    } else {
        await executor.execute(
            `CREATE TABLE IF NOT EXISTS db_migrations (
  id TEXT PRIMARY KEY,
  sha256 TEXT NOT NULL,
  applied_at TEXT NOT NULL
)`,
        );
    }
}

function migrationPlaceholder(dir: string, index: number): string {
    return dir === "postgres" ? `$${index}` : "?";
}

async function isMigrationApplied(
    id: string,
    dir: string,
    executor: DatabaseExecutor,
): Promise<boolean> {
    const placeholder = migrationPlaceholder(dir, 1);
    const result = await executor.execute(
        `SELECT id FROM db_migrations WHERE id = ${placeholder}`,
        [id],
    );
    return (result.rows?.length ?? 0) > 0;
}

async function recordMigration(
    id: string,
    checksum: string,
    dir: string,
    executor: DatabaseExecutor,
): Promise<void> {
    const now = new Date().toISOString();
    if (dir === "postgres") {
        await executor.execute(
            "INSERT INTO db_migrations (id, sha256, applied_at) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING",
            [id, checksum, now],
        );
    } else {
        await executor.execute(
            "INSERT IGNORE INTO db_migrations (id, sha256, applied_at) VALUES (?, ?, ?)",
            [id, checksum, now],
        );
    }
}

const INITIALIZATION_SENTINEL_ID = "init:__phase__";
const INITIALIZATION_SENTINEL_CHECKSUM = "phase-sentinel";

async function runInitializationPhase(
    initializationRoot: string,
    dir: string,
    logger: DatabaseInitializationLogger,
    executor: DatabaseExecutor,
): Promise<{ files: string[]; sqlCount: number }> {
    const already = await isMigrationApplied(
        INITIALIZATION_SENTINEL_ID,
        dir,
        executor,
    );
    if (already) {
        await logger.info("Database init phase already applied, skipping.", {
            dir: initializationRoot,
        });
        return { files: [], sqlCount: 0 };
    }

    let files: string[];
    try {
        files = (await readdir(initializationRoot))
            .filter((name) => name.endsWith(".sql"))
            .sort();
    } catch {
        await recordMigration(
            INITIALIZATION_SENTINEL_ID,
            INITIALIZATION_SENTINEL_CHECKSUM,
            dir,
            executor,
        );
        return { files: [], sqlCount: 0 };
    }

    if (files.length > 0) {
        const contents = await Promise.all(
            files.map((name) =>
                readFile(path.join(initializationRoot, name), "utf8"),
            ),
        );
        await logger.info("Running database initialization scripts.", {
            dir: initializationRoot,
            files,
        });
        for (let i = 0; i < files.length; i++) {
            const statements = splitSqlStatements(contents[i]);
            for (const statement of statements) {
                await executor.execute(statement);
            }
            await logger.info("Database initialization script applied.", {
                file: files[i],
            });
        }
    }

    await recordMigration(
        INITIALIZATION_SENTINEL_ID,
        INITIALIZATION_SENTINEL_CHECKSUM,
        dir,
        executor,
    );
    return { files, sqlCount: files.length };
}

async function runMigratePhase(
    migrateRoot: string,
    dir: string,
    logger: DatabaseInitializationLogger,
    executor: DatabaseExecutor,
): Promise<{ files: string[]; sqlCount: number }> {
    let files: string[];
    try {
        files = (await readdir(migrateRoot))
            .filter((name) => name.endsWith(".sql"))
            .sort();
    } catch {
        return { files: [], sqlCount: 0 };
    }

    const contents = await Promise.all(
        files.map((name) => readFile(path.join(migrateRoot, name), "utf8")),
    );

    const applied: string[] = [];
    for (let i = 0; i < files.length; i++) {
        const migrationId = `migrate:${files[i]}`;
        const checksum = sha256Of(contents[i]);
        const already = await isMigrationApplied(migrationId, dir, executor);
        if (already) {
            await logger.info(
                "Database migration script already applied, skipping.",
                { file: files[i] },
            );
            continue;
        }
        const statements = splitSqlStatements(contents[i]);
        for (const statement of statements) {
            await executor.execute(statement);
        }
        await recordMigration(migrationId, checksum, dir, executor);
        await logger.info("Database migration script applied.", {
            file: files[i],
        });
        applied.push(files[i]);
    }

    return { files: applied, sqlCount: applied.length };
}

export async function initializeDatabaseSchema(
    databaseType: string,
    logger: DatabaseInitializationLogger,
    executor: DatabaseExecutor,
    adaptersRoot: string = path.resolve(process.cwd(), "src", "adapters"),
) {
    const dir = resolveDatabaseProviderDirectory(databaseType);
    const initializationRoot = path.join(
        adaptersRoot,
        "db",
        dir,
        "sql",
        "init",
    );
    const migrateRoot = path.join(adaptersRoot, "db", dir, "sql", "migrate");

    await ensureMigrationsTable(dir, executor);

    const { files: initializationFiles, sqlCount: initializationCount } =
        await runInitializationPhase(initializationRoot, dir, logger, executor);
    const { files: migrateFiles, sqlCount: migrateCount } =
        await runMigratePhase(migrateRoot, dir, logger, executor);

    return {
        dbType: dir,
        files: [...initializationFiles, ...migrateFiles],
        sqlCount: initializationCount + migrateCount,
    };
}

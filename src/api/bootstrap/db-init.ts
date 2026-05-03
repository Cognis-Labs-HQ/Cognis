import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { DbExecutor } from '../adapters/db/account-store.js';
import type { Logger } from '../logger.js';

export function resolveDbProviderDir(dbType: string) {
    if (dbType === 'postgresql') return 'postgresql';
    if (dbType === 'mariadb' || dbType === 'mysql') return 'mariadb';
    return 'sqlite';
}

function splitSqlStatements(sql: string): string[] {
    // Splits on semicolons at statement boundaries. Init scripts must not contain
    // semicolons inside string literals.
    return sql
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .map((s) => `${s};`);
}

async function runSqlDir(dir: string, label: string, logger: Logger, executor: DbExecutor) {
    let files: string[];
    try {
        files = (await readdir(dir)).filter((name) => name.endsWith('.sql')).sort();
    } catch {
        return { files: [], sqlCount: 0 };
    }
    const contents = await Promise.all(files.map((name) => readFile(path.join(dir, name), 'utf8')));
    await logger.info(`Running database ${label} scripts.`, { dir, files });
    for (let i = 0; i < files.length; i++) {
        const statements = splitSqlStatements(contents[i]);
        for (const statement of statements) {
            await executor.execute(statement);
        }
        await logger.info(`Database ${label} script applied.`, { file: files[i] });
    }
    return { files, sqlCount: contents.length };
}

export async function initializeDatabaseSchema(dbType: string, logger: Logger, executor: DbExecutor) {
    const dir = resolveDbProviderDir(dbType);
    const initRoot = path.resolve(process.cwd(), 'db', 'init', dir);
    const migrateRoot = path.resolve(process.cwd(), 'db', 'migrate', dir);
    const { files: initFiles, sqlCount: initCount } = await runSqlDir(initRoot, 'initialization', logger, executor);
    const { files: migrateFiles, sqlCount: migrateCount } = await runSqlDir(migrateRoot, 'migration', logger, executor);
    return { dbType: dir, files: [...initFiles, ...migrateFiles], sqlCount: initCount + migrateCount };
}

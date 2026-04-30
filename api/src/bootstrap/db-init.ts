import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Logger } from '../logger.js';

export async function initializeDatabaseSchema(dbType: string, logger: Logger) {
  const dir = dbType === 'postgresql' ? 'postgresql' : 'sqlite';
  const initRoot = path.resolve(process.cwd(), 'db', 'init', dir);
  const files = (await readdir(initRoot)).filter((name) => name.endsWith('.sql')).sort();
  const sql = await Promise.all(files.map((name) => readFile(path.join(initRoot, name), 'utf8')));
  await logger.info('Database initialization prepared.', { dbType, files });
  return { dbType: dir, files, sqlCount: sql.length };
}

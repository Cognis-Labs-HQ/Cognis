import { buildServer } from './server.js';
import type { ModuleManifest, ModuleRuntimeGateway, ModuleState } from '@cognis/core';
import { Logger } from './logger.js';
import { initializeDatabaseSchema } from './bootstrap/db-init.js';
import { LocalAuthGateway } from './adapters/local-auth-gateway.js';
import { DbLocalAccountStore, createDbExecutor, type SupportedDbType } from './adapters/db-account-store.js';
import { DbUserPreferenceStore } from './adapters/db-preference-store.js';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { issueAccessToken } from './auth/access-tokens.js';

class InMemoryModuleRuntimeGateway implements ModuleRuntimeGateway {
  private readonly manifests: ModuleManifest[] = [
    { id: 'cognis-core', name: 'Cognis Core', version: '0.1.0', class: 'core', coreApiVersion: 'v1', capabilities: ['system:health'], entrypoints: {} }
  ];
  private readonly states = new Map<string, ModuleState>([['cognis-core', { moduleId: 'cognis-core', enabled: true }]]);
  async listManifests() { return this.manifests; }
  async installFromZip(_binary: Uint8Array) { throw new Error('ZIP module installation is not wired in bootstrap runtime yet'); }
  async enable(moduleId: string) { const state = { moduleId, enabled: true }; this.states.set(moduleId, state); return state; }
  async disable(moduleId: string) { const state = { moduleId, enabled: false }; this.states.set(moduleId, state); return state; }
}

const port = Number.parseInt(process.env.PORT ?? '3000', 10);
const host = process.env.HOST ?? '0.0.0.0';
const dbType = (process.env.DB_TYPE as SupportedDbType | undefined) ?? 'sqlite';
const logLevel = (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error' | undefined) ?? 'info';
const logFile = process.env.LOG_FILE ?? '/var/log/cognis/app.log';

const logger = new Logger(logLevel, logFile);
const dbExecutor = await createDbExecutor(dbType);
const accountStore = new DbLocalAccountStore(dbExecutor, dbType);
await accountStore.ensureSchema();
const authGateway = new LocalAuthGateway(accountStore);
const preferenceStore = new DbUserPreferenceStore(dbExecutor, dbType);
await preferenceStore.ensureSchema();
await dbExecutor.execute('CREATE TABLE IF NOT EXISTS modules (module_id VARCHAR(255) PRIMARY KEY, enabled BOOLEAN NOT NULL DEFAULT TRUE)');
if (dbType === 'postgresql') {
  await dbExecutor.execute('INSERT INTO modules (module_id, enabled) VALUES ($1, $2) ON CONFLICT (module_id) DO NOTHING', ['cognis-core', true]);
} else if (dbType === 'sqlite') {
  await dbExecutor.execute('INSERT OR IGNORE INTO modules (module_id, enabled) VALUES (?, ?)', ['cognis-core', true]);
} else {
  await dbExecutor.execute('INSERT IGNORE INTO modules (module_id, enabled) VALUES (?, ?)', ['cognis-core', true]);
}

await initializeDatabaseSchema(dbType, logger);
const adminPassword = LocalAuthGateway.generatePassword();
await authGateway.createLocalAdmin('admin', adminPassword);
await logger.warn('Default admin account created.', { username: 'admin', generatedPassword: adminPassword });

const cliTokenPath = process.env.COGNIS_CLI_TOKEN_PATH ?? '/var/run/cognis/cli-access.token';
const cliAccessToken = issueAccessToken('cognis-cli', 'admin', null);
try {
  await mkdir(path.dirname(cliTokenPath), { recursive: true });
  await writeFile(cliTokenPath, `${cliAccessToken}
`, { mode: 0o600 });
  await logger.info('CLI access token initialized.', { path: cliTokenPath });
} catch (error) {
  await logger.warn('Failed to persist CLI access token; continuing without file bootstrap token.', {
    path: cliTokenPath,
    error: error instanceof Error ? error.message : String(error)
  });
}

const server = buildServer({ moduleRuntimeGateway: new InMemoryModuleRuntimeGateway(), authGateway, accountStore, preferenceStore });
server.listen(port, host, async () => {
  await logger.info('Cognis API listening.', { host, port, dbType });
});

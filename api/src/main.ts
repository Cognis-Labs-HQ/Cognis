import { buildServer } from './server.js';
import type { ModuleManifest, ModuleRuntimeGateway, ModuleState } from '@cognis/core';
import { Logger } from './logger.js';
import { initializeDatabaseSchema } from './bootstrap/db-init.js';
import { LocalAuthStore } from './routes/auth-routes.js';
import { UserPreferenceStore } from './routes/preferences-routes.js';

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
const dbType = process.env.DB_TYPE ?? 'sqlite';
const logLevel = (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error' | undefined) ?? 'info';
const logFile = process.env.LOG_FILE ?? '/var/log/cognis/app.log';

const logger = new Logger(logLevel, logFile);
const authStore = new LocalAuthStore();
const preferenceStore = new UserPreferenceStore();

await initializeDatabaseSchema(dbType, logger);
const defaultAdmin = authStore.ensureDefaultAdmin();
if (defaultAdmin) {
  await logger.warn('Default admin account created.', { username: defaultAdmin.username, generatedPassword: defaultAdmin.password });
}

const server = buildServer({ moduleRuntimeGateway: new InMemoryModuleRuntimeGateway(), authStore, preferenceStore });
server.listen(port, host, async () => {
  await logger.info('Cognis API listening.', { host, port, dbType });
});

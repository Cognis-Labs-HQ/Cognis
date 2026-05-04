import { buildServer } from './server.js';
import type { ModuleManifest, ModuleRuntimeGateway, ModuleState } from '@cognis/core';
import { Logger } from './logger.js';
import { initializeDatabaseSchema } from './bootstrap/db-init.js';
import { LocalAuthGateway } from './adapters/local-auth-gateway.js';
import { DbLocalAccountStore, createDbExecutor, type SupportedDbType } from './adapters/db/account-store.js';
import { DbUserPreferenceStore } from './adapters/db/preference-store.js';
import { DbProfileStore } from './adapters/db/profile-store.js';
import { CoreNotificationGateway, VolatileNotificationPreferenceStore } from './gateways/notification.js';
import { DbNotificationStore, DbNotificationPreferenceStore } from './adapters/db/notification-store.js';
import { LocalFileGateway } from '../adapters/file-local/local-file-gateway.js';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { issueAccessToken } from './auth/access-tokens.js';
import { createHash } from 'node:crypto';
import { TfaCodeService, InMemoryTfaStore } from './utils/tfa-code.js';
import { VerifyTokenService, InMemoryVerifyTokenStore } from './utils/verify-token.js';

class InMemoryModuleRuntimeGateway implements ModuleRuntimeGateway {
  private readonly manifests: ModuleManifest[];
  private readonly states = new Map<string, ModuleState>();

  constructor(manifests: ModuleManifest[]) {
    this.manifests = manifests;
    for (const manifest of manifests) {
      const enabled = manifest.class === 'core';
      this.states.set(manifest.id, { moduleId: manifest.id, enabled });
    }
  }

  static async bootstrap(): Promise<InMemoryModuleRuntimeGateway> {
    const manifests: ModuleManifest[] = [
      { id: 'cognis-core', name: 'Cognis Core', version: '1.0.0', class: 'core', coreApiVersion: 'v1', capabilities: ['system:health', 'auth:accounts', 'modules:lifecycle', 'ui:shell'], entrypoints: {}, publisher: 'Cognis Labs' }
    ];
    const modulesRoot = process.env.COGNIS_MODULES_ROOT ?? path.resolve(process.cwd(), 'src', 'modules');
    try {
      const entries = await readdir(modulesRoot);
      for (const entry of entries) {
        const manifestPath = path.join(modulesRoot, entry, 'manifest.json');
        try {
          const raw = await readFile(manifestPath, 'utf8');
          manifests.push(JSON.parse(raw));
        } catch {}
      }
    } catch {}
    return new InMemoryModuleRuntimeGateway(manifests);
  }

  async listManifests() {
    return this.manifests;
  }

  async installFromZip(_binary: Uint8Array) {
    throw new Error('ZIP module installation is not wired in bootstrap runtime yet');
  }

  async enable(moduleId: string) {
    const state = { moduleId, enabled: true };
    this.states.set(moduleId, state);
    return state;
  }

  async disable(moduleId: string) {
    const state = { moduleId, enabled: false };
    this.states.set(moduleId, state);
    return state;
  }
}

const port = Number.parseInt(process.env.PORT ?? '3000', 10);
const host = process.env.LISTEN_HOST ?? '0.0.0.0';
const dbType = (process.env.DB_TYPE as SupportedDbType | undefined) ?? 'sqlite';
const logLevel = (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error' | undefined) ?? 'info';
const logFile = process.env.LOG_FILE ?? '/app/logs/app.log';

const logger = new Logger(logLevel, logFile);
await logger.info('Starting Cognis API bootstrap.', { host, port, dbType, logLevel, logFile });
const dbExecutor = await createDbExecutor(dbType);
await logger.info('Database executor initialized.', { dbType });

await initializeDatabaseSchema(dbType, logger, dbExecutor);
await logger.info('Database schema initialised.');

const accountStore = new DbLocalAccountStore(dbExecutor, dbType);
await accountStore.ensureSchema();
await logger.info('Account schema ensured.');
const authGateway = new LocalAuthGateway(accountStore);
const preferenceStore = new DbUserPreferenceStore(dbExecutor, dbType);
await preferenceStore.ensureSchema();
await logger.info('Preference schema ensured.');
if (dbType === 'postgresql') {
  await dbExecutor.execute('INSERT INTO modules (module_id, enabled) VALUES ($1, $2) ON CONFLICT (module_id) DO NOTHING', ['cognis-core', true]);
} else if (dbType === 'sqlite') {
  await dbExecutor.execute('INSERT OR IGNORE INTO modules (module_id, enabled) VALUES (?, ?)', ['cognis-core', true]);
} else {
  await dbExecutor.execute('INSERT IGNORE INTO modules (module_id, enabled) VALUES (?, ?)', ['cognis-core', true]);
}
await logger.info('Core module baseline state ensured.');

const profileStore = new DbProfileStore(dbExecutor, dbType);
await profileStore.ensureSchema();
await logger.info('Profile schema ensured.');

const notifStore = new DbNotificationStore(dbExecutor, dbType);
await notifStore.ensureSchema();
await logger.info('Notification schema ensured.');

const mediaLocation = process.env.MEDIA_LOCATION ?? '/app/media';
const fileStorePath = `${mediaLocation}/uploads`;
const fileGateway = new LocalFileGateway(fileStorePath);
await logger.info('File gateway initialized.', { provider: 'local', path: fileStorePath });

const adminState = await dbExecutor.execute(
  dbType === 'postgresql'
    ? 'SELECT state_value FROM bootstrap_state WHERE state_key = $1'
    : 'SELECT state_value FROM bootstrap_state WHERE state_key = ?',
  ['default_admin_initialized']
);
const adminInitialized = adminState.rows?.[0]?.state_value === 'true';

if (!adminInitialized) {
  const adminPassword = LocalAuthGateway.generatePassword();
  await authGateway.createLocalAdmin('admin', adminPassword);
  await profileStore.createProfile('admin', 'admin', 'admin');
  if (dbType === 'postgresql') {
    await dbExecutor.execute(
      'INSERT INTO bootstrap_state (state_key, state_value) VALUES ($1, $2) ON CONFLICT (state_key) DO UPDATE SET state_value = EXCLUDED.state_value',
      ['default_admin_initialized', 'true']
    );
  } else if (dbType === 'sqlite') {
    await dbExecutor.execute(
      'INSERT INTO bootstrap_state (state_key, state_value) VALUES (?, ?) ON CONFLICT(state_key) DO UPDATE SET state_value = excluded.state_value',
      ['default_admin_initialized', 'true']
    );
  } else {
    await dbExecutor.execute(
      'INSERT INTO bootstrap_state (state_key, state_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE state_value = VALUES(state_value)',
      ['default_admin_initialized', 'true']
    );
  }
  await logger.warn('Default admin account created.', { username: 'admin', generatedPassword: adminPassword });
} else {
  await logger.info('Default admin bootstrap skipped (already initialized).');
}

const cliTokenPath = process.env.COGNIS_CLI_TOKEN_PATH ?? '/app/config/cli-access.token';
const cliAccessToken = issueAccessToken('cognis-cli', 'admin', null);
try {
  await mkdir(path.dirname(cliTokenPath), { recursive: true });
  await writeFile(cliTokenPath, `${cliAccessToken}\n`, { mode: 0o600 });
  await logger.info('CLI access token initialized.', { path: cliTokenPath });
} catch (error) {
  await logger.warn('Failed to persist CLI access token; continuing without file bootstrap token.', {
    path: cliTokenPath,
    error: error instanceof Error ? error.message : String(error)
  });
}

const runtime = await InMemoryModuleRuntimeGateway.bootstrap();
await logger.info('Module runtime bootstrapped.');

const notificationPrefStore = new DbNotificationPreferenceStore(notifStore);
const notificationGateway = new CoreNotificationGateway(notificationPrefStore, notifStore, notifStore);
const adaptersRoot = process.env.COGNIS_ADAPTERS_ROOT ?? path.resolve(process.cwd(), 'src', 'adapters');
await notificationGateway.discoverSenders(adaptersRoot);
await notificationGateway.loadPersistedConfigs();
notificationGateway.registerCategory('system', 'System Notifications');
await logger.info('Notification gateway bootstrapped.', { adaptersRoot });

const tfaService = new TfaCodeService(new InMemoryTfaStore());
const verifyTokenService = new VerifyTokenService(new InMemoryVerifyTokenStore());
const externalHost = process.env.EXTERNAL_HOST ?? (process.env.HOST ? `http://${process.env.HOST}` : undefined);

const server = buildServer({
  moduleRuntimeGateway: runtime,
  authGateway,
  accountStore,
  preferenceStore,
  profileStore,
  fileGateway,
  notificationGateway,
  notifStore,
  tfaService,
  verificationEmailSender: notificationGateway,
  verifyTokenService,
  externalHost,
  loadModuleStates: async () => {
    const result = await dbExecutor.execute('SELECT module_id, enabled FROM modules');
    return (result.rows ?? []).map((row) => ({ moduleId: row.module_id, enabled: Boolean(row.enabled) }));
  },
  persistModuleState: async (moduleId, enabled) => {
    if (dbType === 'postgresql') {
      await dbExecutor.execute(
        'INSERT INTO modules (module_id, enabled) VALUES ($1, $2) ON CONFLICT (module_id) DO UPDATE SET enabled = EXCLUDED.enabled',
        [moduleId, enabled]
      );
      return;
    }
    if (dbType === 'sqlite') {
      await dbExecutor.execute(
        'INSERT INTO modules (module_id, enabled) VALUES (?, ?) ON CONFLICT(module_id) DO UPDATE SET enabled = excluded.enabled',
        [moduleId, enabled]
      );
      return;
    }
    await dbExecutor.execute(
      'INSERT INTO modules (module_id, enabled) VALUES (?, ?) ON DUPLICATE KEY UPDATE enabled = VALUES(enabled)',
      [moduleId, enabled]
    );
  },
  moduleIntegrityChecker: async () => {
    const manifests = await runtime.listManifests();
    const report = [] as Array<{ moduleId: string; file: string; expected: string; actual: string | null; status: 'ok' | 'mismatch' | 'missing' }>;
    for (const manifest of manifests) {
      for (const file of manifest.files ?? []) {
        const candidate = path.resolve(process.env.COGNIS_MODULES_ROOT ?? path.resolve(process.cwd(), 'src', 'modules'), manifest.id, file.path);
        try {
          const raw = await readFile(candidate);
          const actual = createHash('sha256').update(raw).digest('hex');
          report.push({ moduleId: manifest.id, file: file.path, expected: file.sha256, actual, status: actual === file.sha256 ? 'ok' : 'mismatch' });
        } catch {
          report.push({ moduleId: manifest.id, file: file.path, expected: file.sha256, actual: null, status: 'missing' });
        }
      }
    }
    return report;
  }
});
server.listen(port, host, async () => {
  await logger.info('Cognis API listening.', { host, port, dbType });
});

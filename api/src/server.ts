import { createServer } from 'node:http';
import { HealthService, ModuleService, type ModuleRuntimeGateway } from '@cognis/core';
import { createModuleRoutes } from './routes/module-routes.js';
import { createSystemRoutes } from './routes/system-routes.js';
import { createDocsRoutes } from './routes/docs-routes.js';
import { createUiRoutes } from './routes/ui-routes.js';
import { createAuthRoutes } from './routes/auth-routes.js';
import { createModuleExtensionRoutes } from './routes/module-extension-routes.js';
import type { AuthGateway } from '@cognis/core';
import type { LocalAccountStore } from './adapters/local-auth-gateway.js';
import { createPreferencesRoutes, type UserPreferenceStore } from './routes/preferences-routes.js';
import { createUserRoutes } from './routes/user-routes.js';

export interface ApiDependencies {
  moduleRuntimeGateway: ModuleRuntimeGateway;
  authGateway: AuthGateway;
  accountStore: LocalAccountStore;
  preferenceStore: UserPreferenceStore;
  moduleIntegrityChecker?: () => Promise<Array<{ moduleId: string; file: string; expected: string; actual: string | null; status: 'ok' | 'mismatch' | 'missing' }>>;
}

export function buildServer(deps: ApiDependencies) {
  const moduleService = new ModuleService(deps.moduleRuntimeGateway);
  const healthService = new HealthService();
  const enabledModules = new Set<string>();

  const moduleExtensionRoutes = createModuleExtensionRoutes(deps.moduleRuntimeGateway, (moduleId) => enabledModules.has(moduleId));

  const moduleRoutes = createModuleRoutes(moduleService, {
    onEnabled: async (moduleId) => {
      enabledModules.add(moduleId);
      await moduleExtensionRoutes.refresh();
    },
    onDisabled: async (moduleId) => {
      enabledModules.delete(moduleId);
      await moduleExtensionRoutes.refresh();
    },
    getStatus: (moduleId) => (enabledModules.has(moduleId) ? 'enabled' : 'disabled'),
    getIntegrityReport: deps.moduleIntegrityChecker
  });
  const systemRoutes = createSystemRoutes(healthService);
  const docsRoutes = createDocsRoutes();
  const uiRoutes = createUiRoutes(deps.moduleRuntimeGateway);
  const authRoutes = createAuthRoutes(deps.authGateway, deps.accountStore);
  const preferencesRoutes = createPreferencesRoutes(deps.preferenceStore);
  const userRoutes = createUserRoutes(deps.accountStore, deps.preferenceStore);

  deps.moduleRuntimeGateway.listManifests().then((manifests) => {
    for (const manifest of manifests) enabledModules.add(manifest.id);
    return moduleExtensionRoutes.refresh();
  }).catch(() => undefined);

  return createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');

    try {
      const handledByModule = await moduleRoutes(req, res, url);
      if (handledByModule) return;

      const handledBySystem = await systemRoutes(req, res, url);
      if (handledBySystem) return;

      const handledByAuth = await authRoutes(req, res, url);
      if (handledByAuth) return;

      const handledByPreferences = await preferencesRoutes(req, res, url);
      if (handledByPreferences) return;

      const handledByUsers = await userRoutes(req, res, url);
      if (handledByUsers) return;

      const handledByExtensions = await moduleExtensionRoutes.handle(req, res, url);
      if (handledByExtensions) return;

      const handledByDocs = await docsRoutes(req, res, url);
      if (handledByDocs) return;

      const handledByUi = await uiRoutes(req, res, url);
      if (handledByUi) return;

      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: { code: 'not_found', message: 'Route not found' } }));
    } catch (error) {
      res.writeHead(400, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: { code: 'bad_request', message: error instanceof Error ? error.message : 'Unknown error' } }));
    }
  });
}

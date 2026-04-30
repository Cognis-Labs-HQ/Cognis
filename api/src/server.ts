import { createServer } from 'node:http';
import { HealthService, ModuleService, type ModuleRuntimeGateway } from '@cognis/core';
import { createModuleRoutes } from './routes/module-routes.js';
import { createSystemRoutes } from './routes/system-routes.js';
import { createDocsRoutes } from './routes/docs-routes.js';
import { createUiRoutes } from './routes/ui-routes.js';
import { createAuthRoutes, type LocalAuthStore } from './routes/auth-routes.js';
import { createPreferencesRoutes, type UserPreferenceStore } from './routes/preferences-routes.js';

export interface ApiDependencies {
  moduleRuntimeGateway: ModuleRuntimeGateway;
  authStore: LocalAuthStore;
  preferenceStore: UserPreferenceStore;
}

export function buildServer(deps: ApiDependencies) {
  const moduleService = new ModuleService(deps.moduleRuntimeGateway);
  const healthService = new HealthService();

  const moduleRoutes = createModuleRoutes(moduleService);
  const systemRoutes = createSystemRoutes(healthService);
  const docsRoutes = createDocsRoutes();
  const uiRoutes = createUiRoutes();
  const authRoutes = createAuthRoutes(deps.authStore);
  const preferencesRoutes = createPreferencesRoutes(deps.preferenceStore);

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

      const handledByDocs = await docsRoutes(req, res, url);
      if (handledByDocs) return;

      const handledByUi = await uiRoutes(req, res, url);
      if (handledByUi) return;

      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: { code: 'not_found', message: 'Route not found' } }));
    } catch (error) {
      res.writeHead(400, { 'content-type': 'application/json' });
      res.end(
        JSON.stringify({
          error: { code: 'bad_request', message: error instanceof Error ? error.message : 'Unknown error' }
        })
      );
    }
  });
}

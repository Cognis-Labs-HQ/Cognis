import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ModuleRuntimeGateway } from '@cognis/core';
import path from 'node:path';

interface RouteHandler {
  method: string;
  routePath: string;
  handler: (req: IncomingMessage, res: ServerResponse) => Promise<void> | void;
}

export function createModuleExtensionRoutes(runtime: ModuleRuntimeGateway) {
  const handlers: RouteHandler[] = [];
  let loaded = false;

  async function loadHandlers() {
    if (loaded) return;
    loaded = true;
    const manifests = await runtime.listManifests();
    for (const manifest of manifests) {
      if (!manifest.entrypoints?.api) continue;
      const moduleRoot = path.resolve(process.cwd(), 'modules', manifest.id);
      const pluginPath = path.join(moduleRoot, manifest.entrypoints.api);
      try {
        const plugin = await import(pluginPath);
        if (typeof plugin.registerApiRoutes === 'function') {
          plugin.registerApiRoutes({
            get(routePath: string, handler: RouteHandler['handler']) {
              handlers.push({ method: 'GET', routePath, handler });
            },
            post(routePath: string, handler: RouteHandler['handler']) {
              handlers.push({ method: 'POST', routePath, handler });
            }
          });
        }
      } catch {
        // ignore invalid module route plugin
      }
    }
  }

  return async (req: IncomingMessage, res: ServerResponse, url: URL): Promise<boolean> => {
    await loadHandlers();
    const method = (req.method || 'GET').toUpperCase();
    const match = handlers.find((entry) => entry.method === method && entry.routePath === url.pathname);
    if (!match) return false;
    await match.handler(req, res);
    return true;
  };
}

#!/usr/bin/env node
import { readdir } from 'node:fs/promises';
import path from 'node:path';

interface CommandContext {
  args: string[];
  apiBaseUrl: string;
}

type CommandHandler = (ctx: CommandContext) => Promise<void>;

const registry = new Map<string, CommandHandler>();

function register(name: string, handler: CommandHandler) {
  registry.set(name, handler);
}

async function apiGet(apiBaseUrl: string, route: string) {
  const response = await fetch(`${apiBaseUrl}${route}`);
  return response.json();
}

async function apiPost(apiBaseUrl: string, route: string) {
  const response = await fetch(`${apiBaseUrl}${route}`, { method: 'POST' });
  return response.json();
}

register('help', async () => {
  console.log('cognisctl commands:');
  for (const name of [...registry.keys()].sort()) console.log(`- ${name}`);
});

register('system:health', async ({ apiBaseUrl }) => {
  const payload = await apiGet(apiBaseUrl, '/api/v1/system/health');
  console.log(JSON.stringify(payload, null, 2));
});

register('modules:list', async ({ apiBaseUrl }) => {
  const payload = await apiGet(apiBaseUrl, '/api/v1/docs');
  console.log('Available docs slugs (placeholder for module registry):');
  for (const item of payload.data) console.log(`- ${item.slug}`);
});

register('modules:enable', async ({ args, apiBaseUrl }) => {
  const [moduleId] = args;
  if (!moduleId) throw new Error('Usage: cognisctl modules:enable <moduleId>');
  const payload = await apiPost(apiBaseUrl, `/api/v1/modules/${encodeURIComponent(moduleId)}/enable`);
  console.log(JSON.stringify(payload, null, 2));
});

register('modules:disable', async ({ args, apiBaseUrl }) => {
  const [moduleId] = args;
  if (!moduleId) throw new Error('Usage: cognisctl modules:disable <moduleId>');
  const payload = await apiPost(apiBaseUrl, `/api/v1/modules/${encodeURIComponent(moduleId)}/disable`);
  console.log(JSON.stringify(payload, null, 2));
});

register('auth:create-admin', async ({ args }) => {
  const username = args[0] ?? 'admin';
  const password = args[1] ?? 'admin';
  console.log(`Create admin request prepared for username=${username}.`);
  console.log('Bootstrap path currently provisions admin at server startup; persistent provider implementation is pluggable.');
  console.log(`Suggested credentials override -> username: ${username}, password: ${password}`);
});

register('preferences:get', async ({ args, apiBaseUrl }) => {
  const [accountId, pageId] = args;
  if (!accountId || !pageId) throw new Error('Usage: cognisctl preferences:get <accountId> <pageId>');
  const payload = await apiGet(apiBaseUrl, `/api/v1/users/${encodeURIComponent(accountId)}/preferences/${encodeURIComponent(pageId)}`);
  console.log(JSON.stringify(payload, null, 2));
});

async function loadModuleCliPlugins() {
  const modulesRoot = path.resolve(process.cwd(), 'modules');
  let entries: string[] = [];
  try {
    entries = await readdir(modulesRoot);
  } catch {
    return;
  }

  for (const moduleName of entries) {
    const pluginPath = path.join(modulesRoot, moduleName, 'cli', 'index.js');
    try {
      const plugin = await import(pluginPath);
      if (typeof plugin.registerCommands === 'function') {
        plugin.registerCommands({ register });
      }
    } catch {
      // module has no cli plugin
    }
  }
}

async function main() {
  await loadModuleCliPlugins();

  const [command = 'help', ...args] = process.argv.slice(2);
  const apiBaseUrl = process.env.COGNIS_API_URL ?? 'http://localhost:3000';
  const handler = registry.get(command);

  if (!handler) {
    console.error(`Unknown command: ${command}`);
    process.exit(1);
  }

  await handler({ args, apiBaseUrl });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

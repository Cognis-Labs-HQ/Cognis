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

async function apiPost(apiBaseUrl: string, route: string, body?: unknown) {
  const response = await fetch(`${apiBaseUrl}${route}`, {
    method: 'POST',
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
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

register('user:create', async ({ args }) => {
  const [username, password = 'changeme', role = 'user'] = args;
  if (!username) throw new Error('Usage: cognisctl user:create <username> [password] [role]');
  console.log(`Prepared user creation: username=${username}, role=${role}`);
  console.log('Persistent user provisioning is adapter-backed and should be implemented via provider-specific user gateway.');
  console.log(`Temporary credentials: ${password}`);
});

register('user:role', async ({ args }) => {
  const [username, role] = args;
  if (!username || !role) throw new Error('Usage: cognisctl user:role <username> <role>');
  console.log(`Prepared role change: ${username} -> ${role}`);
});

register('user:set-password', async ({ args }) => {
  const [username, password] = args;
  if (!username || !password) throw new Error('Usage: cognisctl user:set-password <username> <password>');
  console.log(`Prepared password reset for user ${username}.`);
});

register('user:disable', async ({ args }) => {
  const [username] = args;
  if (!username) throw new Error('Usage: cognisctl user:disable <username>');
  console.log(`Prepared disable action for user ${username}.`);
});

register('user:enable', async ({ args }) => {
  const [username] = args;
  if (!username) throw new Error('Usage: cognisctl user:enable <username>');
  console.log(`Prepared enable action for user ${username}.`);
});

register('user:delete', async ({ args }) => {
  const [username] = args;
  if (!username) throw new Error('Usage: cognisctl user:delete <username>');
  console.log(`Prepared delete action for user ${username}.`);
});

register('user:preferences:clear', async ({ args }) => {
  const [username] = args;
  if (!username) throw new Error('Usage: cognisctl user:preferences:clear <username>');
  console.log(`Prepared preferences reset for user ${username}.`);
  console.log('Granular preference mutations are intentionally excluded from CLI scope.');
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

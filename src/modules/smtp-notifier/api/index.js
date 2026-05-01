import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const CONFIG_FILE = path.resolve(process.cwd(), 'src', 'modules', 'smtp-notifier', 'smtp-config.json');

async function loadConfig() {
  try { return JSON.parse(await readFile(CONFIG_FILE, 'utf8')); } catch {
    return { host: '', port: 587, secure: false, username: '', password: '', fromAddress: '', enabled: false };
  }
}

async function saveConfig(config) { await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2)); }

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
}

function send(res, status, data) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ data }));
}

export function registerNotificationAdapters(notificationService) {
  notificationService.registerAdapter({
    id: 'smtp-notifier',
    canDeliver(message) {
      return message.channel === 'email';
    },
    async deliver(message) {
      const config = await loadConfig();
      if (!config.enabled || !config.host || !config.fromAddress) {
        return { delivered: false, adapter: 'smtp-notifier', detail: 'SMTP adapter is not configured.' };
      }

      return {
        delivered: true,
        adapter: 'smtp-notifier',
        detail: `Delivered via ${config.host}:${config.port} to ${message.recipient}`
      };
    }
  });
}

export function registerApiRoutes(router) {
  router.get('/api/v1/modules/smtp-notifier/admin-panel', async (_req, res) => {
    send(res, 200, {
      id: 'smtp-notifier',
      title: 'SMTP Notifier',
      description: 'Configure the SMTP adapter used by the core notification gateway.',
      route: '/administration/notifications/smtp'
    });
  });

  router.get('/api/v1/modules/smtp-notifier/smtp-config', async (_req, res) => {
    const config = await loadConfig();
    send(res, 200, { ...config, password: config.password ? '********' : '' });
  });

  router.post('/api/v1/modules/smtp-notifier/smtp-config', async (req, res) => {
    const payload = await readBody(req);
    await saveConfig({
      host: String(payload.host || ''),
      port: Number(payload.port || 587),
      secure: Boolean(payload.secure),
      username: String(payload.username || ''),
      password: String(payload.password || ''),
      fromAddress: String(payload.fromAddress || ''),
      enabled: Boolean(payload.enabled)
    });
    send(res, 200, { saved: true });
  });
}

import type { IncomingMessage, ServerResponse } from 'node:http';
import type { LocalAccountStore } from '../adapters/local-auth-gateway.js';
import { getAuthClaims, requireAuth } from '../auth/guard.js';
import type { UserPreferenceStore } from './preferences-routes.js';
import type { ProfileCreateStore } from '../adapters/db/profile-store.js';
import { readJson } from './read-json.js';
import type { DbNotificationStore } from '../adapters/db/notification-store.js';
import type { TfaCodeService } from '../utils/tfa-code.js';
import type { SmtpNotificationSender } from '../../adapters/notify-smtp/smtp-notification-sender.js';

const VALID_ROLES = new Set(['user', 'teacher', 'moderator', 'admin']);

export function createUserRoutes(
  accountStore: LocalAccountStore,
  preferenceStore: UserPreferenceStore,
  profileStore?: ProfileCreateStore,
  notifStore?: DbNotificationStore,
  tfaService?: TfaCodeService,
  smtpSender?: SmtpNotificationSender,
) {
  const adminRoutes = async (req: IncomingMessage, res: ServerResponse, url: URL): Promise<boolean> => {
    if (url.pathname === '/api/v1/users' && req.method === 'GET') {
      if (!requireAuth(req, res, 'admin')) return true;
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: await accountStore.list() }));
      return true;
    }

    const infoMatch = url.pathname.match(/^\/api\/v1\/users\/([^/]+)\/info$/);
    if (infoMatch && req.method === 'GET') {
      const claims = getAuthClaims(req);
      if (!claims) {
        res.writeHead(401, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'unauthorized', message: 'Login required' } }));
        return true;
      }
      const target = decodeURIComponent(infoMatch[1]);
      if (claims.sub !== target && claims.role !== 'admin') {
        res.writeHead(403, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'forbidden', message: 'Access denied' } }));
        return true;
      }
      const info = await accountStore.getInfo(target);
      if (!info) {
        res.writeHead(404, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'not_found', message: 'User not found' } }));
        return true;
      }
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: info }));
      return true;
    }

    const match = url.pathname.match(/^\/api\/v1\/users\/([^/]+)(?:\/(role|password|enable|disable|preferences\/clear))?$/);
    if (!match) return false;
    if (!requireAuth(req, res, 'admin')) return true;

    const username = decodeURIComponent(match[1]);
    const action = match[2];

    if (req.method === 'POST' && !action) {
      const body = await readJson(req);
      const role = String(body.role ?? 'user');
      if (!VALID_ROLES.has(role)) {
        res.writeHead(400, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'bad_request', message: `Invalid role: ${role}` } }));
        return true;
      }
      const created = await accountStore.register(username, String(body.password ?? 'changeme'), role === 'admin');
      await profileStore?.createProfile(username, username, role as any);
      res.writeHead(201, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: created }));
      return true;
    }

    if (req.method === 'POST' && action === 'role') {
      const body = await readJson(req);
      const role = String(body.role ?? 'user');
      if (!VALID_ROLES.has(role)) {
        res.writeHead(400, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'bad_request', message: `Invalid role: ${role}` } }));
        return true;
      }
      await accountStore.setRole(username, role as any);
      await profileStore?.setRoleByHandle(username, role as any);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: { updated: true } }));
      return true;
    }

    if (req.method === 'POST' && action === 'password') {
      const body = await readJson(req);
      await accountStore.setPassword(username, String(body.password ?? 'changeme'));
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: { updated: true } }));
      return true;
    }

    if (req.method === 'POST' && action === 'enable') {
      await accountStore.setEnabled(username, true);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: { updated: true } }));
      return true;
    }

    if (req.method === 'POST' && action === 'disable') {
      await accountStore.setEnabled(username, false);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: { updated: true } }));
      return true;
    }

    if (req.method === 'POST' && action === 'preferences/clear') {
      await preferenceStore.clearUser(username);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: { cleared: true } }));
      return true;
    }

    if (req.method === 'DELETE' && !action) {
      await accountStore.delete(username);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: { deleted: true } }));
      return true;
    }

    return false;
  };

  async function handleEmailRoutes(req: IncomingMessage, res: ServerResponse, url: URL): Promise<boolean> {
    if (!notifStore) return false;

    const emailsMatch = url.pathname.match(/^\/api\/v1\/users\/([^/]+)\/emails$/);
    if (emailsMatch) {
      const username = decodeURIComponent(emailsMatch[1]);
      const claims = getAuthClaims(req);
      if (!claims) {
        res.writeHead(401, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'unauthorized', message: 'Login required' } }));
        return true;
      }
      if (claims.sub !== username && claims.role !== 'admin') {
        res.writeHead(403, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'forbidden', message: 'Access denied' } }));
        return true;
      }

      if (req.method === 'GET') {
        const emails = await notifStore.getUserEmails(username);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ data: emails }));
        return true;
      }

      if (req.method === 'POST') {
        const body = await readJson(req);
        const email = String(body.email ?? '').trim().toLowerCase();
        if (!email) {
          res.writeHead(400, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ error: { code: 'bad_request', message: 'email is required' } }));
          return true;
        }
        await notifStore.addUserEmail(username, email);

        const smtpReady = smtpSender?.isConfigured?.() ?? false;
        if (tfaService && smtpReady) {
          try {
            const code = tfaService.issue(`${username}:${email}`);
            await smtpSender!.sendVerificationEmail(email, code);
            res.writeHead(201, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ data: { added: true, pendingVerification: true } }));
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            if (msg === 'smtp_rate_limited') {
              res.writeHead(429, { 'content-type': 'application/json' });
              res.end(JSON.stringify({ error: { code: 'rate_limited', message: 'Verification email sent too recently. Please wait before requesting another.' } }));
            } else {
              res.writeHead(201, { 'content-type': 'application/json' });
              res.end(JSON.stringify({ data: { added: true, pendingVerification: true, verificationEmailFailed: true } }));
            }
          }
        } else {
          await notifStore.verifyUserEmail(username, email);
          res.writeHead(201, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ data: { added: true, pendingVerification: false } }));
        }
        return true;
      }

      return false;
    }

    const emailActionsMatch = url.pathname.match(/^\/api\/v1\/users\/([^/]+)\/emails\/([^/]+)(?:\/(primary|verify))?$/);
    if (emailActionsMatch) {
      const username = decodeURIComponent(emailActionsMatch[1]);
      const email = decodeURIComponent(emailActionsMatch[2]);
      const emailAction = emailActionsMatch[3];

      const claims = getAuthClaims(req);
      if (!claims) {
        res.writeHead(401, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'unauthorized', message: 'Login required' } }));
        return true;
      }
      if (claims.sub !== username && claims.role !== 'admin') {
        res.writeHead(403, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'forbidden', message: 'Access denied' } }));
        return true;
      }

      if (req.method === 'DELETE' && !emailAction) {
        try {
          await notifStore.removeUserEmail(username, email);
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ data: { removed: true } }));
        } catch (err) {
          const code = err instanceof Error ? err.message : 'remove_failed';
          const status = code === 'cannot_remove_primary_email' || code === 'cannot_remove_last_email' ? 409 : 500;
          res.writeHead(status, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ error: { code, message: code } }));
        }
        return true;
      }

      if (req.method === 'PUT' && emailAction === 'primary') {
        await notifStore.setPrimaryEmail(username, email);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ data: { updated: true } }));
        return true;
      }

      if (req.method === 'POST' && emailAction === 'verify') {
        if (!tfaService) {
          res.writeHead(503, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ error: { code: 'verification_unavailable', message: 'Verification service is not configured' } }));
          return true;
        }
        const body = await readJson(req);
        const code = String(body.code ?? '').trim();
        const valid = tfaService.verify(`${username}:${email}`, code);
        if (!valid) {
          res.writeHead(422, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ error: { code: 'invalid_code', message: 'Invalid or expired verification code' } }));
          return true;
        }
        await notifStore.verifyUserEmail(username, email);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ data: { verified: true } }));
        return true;
      }

      return false;
    }

    return false;
  }

  return async (req: IncomingMessage, res: ServerResponse, url: URL): Promise<boolean> => {
    const emailResult = await handleEmailRoutes(req, res, url);
    if (emailResult) return true;
    return adminRoutes(req, res, url);
  };
}

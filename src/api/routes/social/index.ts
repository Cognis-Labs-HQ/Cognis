import type { IncomingMessage, ServerResponse } from 'node:http';
import { requireAuth } from '../../auth/guard.js';
import type { DbProfileStore, AccountProfile } from '../../adapters/db-profile-store.js';
import { visibilityRank } from '../../adapters/db-profile-store.js';

function publicProfile(profile: AccountProfile) {
  return {
    accountId: profile.accountId,
    handle: profile.handle,
    role: profile.role,
    displayName: profile.handle,
    avatarKey: profile.avatarKey,
    visibility: profile.visibility,
  };
}

async function canViewProfile(
  requesterId: string,
  requesterRole: string,
  target: AccountProfile,
  profileStore: DbProfileStore
): Promise<boolean> {
  if (requesterRole === 'admin') return true;
  if (requesterId === target.accountId) return true;
  if (target.visibility === 'hidden') return false;
  if (target.visibility === 'private') return profileStore.isFollowing(requesterId, target.accountId);
  return true;
}

export function createSocialRoutes(profileStore: DbProfileStore) {
  return async (req: IncomingMessage, res: ServerResponse, url: URL): Promise<boolean> => {
    const followMatch = url.pathname.match(/^\/api\/v1\/users\/([^/]+)\/follow$/);
    if (followMatch) {
      const claims = requireAuth(req, res, 'user');
      if (!claims) return true;
      const handle = decodeURIComponent(followMatch[1]);
      const target = await profileStore.getProfileByHandle(handle);
      if (!target) {
        res.writeHead(404, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'not_found', message: 'User not found' } }));
        return true;
      }
      if (await profileStore.isBlocked(target.accountId, claims.sub)) {
        res.writeHead(404, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'not_found', message: 'User not found' } }));
        return true;
      }
      if (req.method === 'POST') {
        if (claims.sub === target.accountId) {
          res.writeHead(400, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ error: { code: 'bad_request', message: 'Cannot follow yourself' } }));
          return true;
        }
        const canView = await canViewProfile(claims.sub, claims.role, target, profileStore);
        if (!canView) {
          res.writeHead(404, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ error: { code: 'not_found', message: 'User not found' } }));
          return true;
        }
        await profileStore.follow(claims.sub, target.accountId);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ data: { following: true } }));
        return true;
      }
      if (req.method === 'DELETE') {
        await profileStore.unfollow(claims.sub, target.accountId);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ data: { following: false } }));
        return true;
      }
    }

    const blockMatch = url.pathname.match(/^\/api\/v1\/users\/([^/]+)\/block$/);
    if (blockMatch) {
      const claims = requireAuth(req, res, 'user');
      if (!claims) return true;
      const handle = decodeURIComponent(blockMatch[1]);
      const target = await profileStore.getProfileByHandle(handle);
      if (!target) {
        res.writeHead(404, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'not_found', message: 'User not found' } }));
        return true;
      }
      if (req.method === 'POST') {
        if (claims.sub === target.accountId) {
          res.writeHead(400, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ error: { code: 'bad_request', message: 'Cannot block yourself' } }));
          return true;
        }
        await profileStore.block(claims.sub, target.accountId);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ data: { blocked: true } }));
        return true;
      }
      if (req.method === 'DELETE') {
        await profileStore.unblock(claims.sub, target.accountId);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ data: { blocked: false } }));
        return true;
      }
    }

    const followersMatch = url.pathname.match(/^\/api\/v1\/users\/([^/]+)\/followers$/);
    if (followersMatch && req.method === 'GET') {
      const claims = requireAuth(req, res, 'user');
      if (!claims) return true;
      const handle = decodeURIComponent(followersMatch[1]);
      const target = await profileStore.getProfileByHandle(handle);
      if (!target) {
        res.writeHead(404, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'not_found', message: 'User not found' } }));
        return true;
      }
      if (await profileStore.isBlocked(target.accountId, claims.sub)) {
        res.writeHead(404, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'not_found', message: 'User not found' } }));
        return true;
      }
      const canView = await canViewProfile(claims.sub, claims.role, target, profileStore);
      if (!canView) {
        res.writeHead(404, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'not_found', message: 'User not found' } }));
        return true;
      }
      const showList = claims.role === 'admin'
        || claims.sub === target.accountId
        || visibilityRank(target.visibility) >= visibilityRank('community')
        || await profileStore.isFollowing(claims.sub, target.accountId);
      if (!showList) {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ data: [] }));
        return true;
      }
      const followers = await profileStore.getFollowers(target.accountId);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: followers.map(publicProfile) }));
      return true;
    }

    const followingMatch = url.pathname.match(/^\/api\/v1\/users\/([^/]+)\/following$/);
    if (followingMatch && req.method === 'GET') {
      const claims = requireAuth(req, res, 'user');
      if (!claims) return true;
      const handle = decodeURIComponent(followingMatch[1]);
      const target = await profileStore.getProfileByHandle(handle);
      if (!target) {
        res.writeHead(404, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'not_found', message: 'User not found' } }));
        return true;
      }
      if (await profileStore.isBlocked(target.accountId, claims.sub)) {
        res.writeHead(404, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'not_found', message: 'User not found' } }));
        return true;
      }
      const canView = await canViewProfile(claims.sub, claims.role, target, profileStore);
      if (!canView) {
        res.writeHead(404, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'not_found', message: 'User not found' } }));
        return true;
      }
      const showList = claims.role === 'admin'
        || claims.sub === target.accountId
        || visibilityRank(target.visibility) >= visibilityRank('community')
        || await profileStore.isFollowing(claims.sub, target.accountId);
      if (!showList) {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ data: [] }));
        return true;
      }
      const following = await profileStore.getFollowing(target.accountId);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: following.map(publicProfile) }));
      return true;
    }

    return false;
  };
}

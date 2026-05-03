import type { IncomingMessage, ServerResponse } from 'node:http';
import { getAuthClaims, requireAuth } from '../auth/guard.js';
import type { DbProfileStore, AccountProfile, AccountVisibility, AccountRole } from '../adapters/db-profile-store.js';
import { visibilityRank } from '../adapters/db-profile-store.js';
import type { FileStorageGateway } from '@cognis/core';
import { readRawBody } from './read-json.js';
import { readJson } from './read-json.js';

const VALID_VISIBILITY = new Set<AccountVisibility>(['hidden', 'private', 'friends', 'community']);

const AVATAR_ALLOWED_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const BANNER_ALLOWED_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']);

function profileResponse(
  profile: AccountProfile,
  followerCount: number | null,
  followingCount: number | null,
  postCount: number | null
) {
  return {
    accountId: profile.accountId,
    handle: profile.handle,
    role: profile.role,
    bio: profile.bio,
    location: profile.location,
    website: profile.website,
    avatarKey: profile.avatarKey,
    bannerKey: profile.bannerKey,
    visibility: profile.visibility,
    followerCount,
    followingCount,
    postCount,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

async function canViewProfile(
  requesterId: string | null,
  requesterRole: string | null,
  target: AccountProfile,
  profileStore: DbProfileStore
): Promise<boolean> {
  if (requesterRole === 'admin') return true;
  if (requesterId === target.accountId) return true;
  if (target.visibility === 'hidden') return false;
  if (target.visibility === 'private') {
    if (!requesterId) return false;
    return profileStore.isFollowing(requesterId, target.accountId);
  }
  return requesterId !== null;
}

export function createProfileRoutes(profileStore: DbProfileStore, fileGateway: FileStorageGateway) {
  return async (req: IncomingMessage, res: ServerResponse, url: URL): Promise<boolean> => {
    const claims = getAuthClaims(req);

    if (url.pathname === '/api/v1/profile' && req.method === 'GET') {
      if (!requireAuth(req, res, 'user')) return true;
      let profile = await profileStore.getProfile(claims!.sub);
      if (!profile) {
        profile = await profileStore.createProfile(
          claims!.sub,
          claims!.sub,
          (claims!.role as AccountRole) ?? 'user'
        );
      }
      if (!profile) {
        res.writeHead(404, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'not_found', message: 'Profile not found' } }));
        return true;
      }
      const [followerCount, followingCount, posts] = await Promise.all([
        profileStore.getFollowerCount(profile.accountId),
        profileStore.getFollowingCount(profile.accountId),
        profileStore.getPostsByAccount(profile.accountId),
      ]);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: profileResponse(profile, followerCount, followingCount, posts.length) }));
      return true;
    }

    if (url.pathname === '/api/v1/profile' && req.method === 'PATCH') {
      if (!requireAuth(req, res, 'user')) return true;
      const body = await readJson(req);
      const updates: Parameters<typeof profileStore.updateProfile>[1] = {};
      if ('bio' in body) updates.bio = body.bio != null ? String(body.bio) : null;
      if ('location' in body) updates.location = body.location != null ? String(body.location) : null;
      if ('website' in body) updates.website = body.website != null ? String(body.website) : null;
      if ('visibility' in body) {
        const v = String(body.visibility);
        if (!VALID_VISIBILITY.has(v as AccountVisibility)) {
          res.writeHead(400, { 'content-type': 'application/json' });
          res.end(JSON.stringify({ error: { code: 'bad_request', message: `Invalid visibility: ${v}` } }));
          return true;
        }
        updates.visibility = v as AccountVisibility;
      }
      const updated = await profileStore.updateProfile(claims!.sub, updates);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: updated }));
      return true;
    }

    if (url.pathname === '/api/v1/profile/avatar' && req.method === 'PUT') {
      if (!requireAuth(req, res, 'user')) return true;
      const mime = (req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
      if (!AVATAR_ALLOWED_MIME.has(mime)) {
        res.writeHead(415, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'unsupported_media_type', message: 'Avatar must be jpeg, png, or webp' } }));
        return true;
      }
      const maxBytes = await profileStore.getFileSizeLimit('image');
      const body = await readRawBody(req);
      if (body.length > maxBytes) {
        res.writeHead(413, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'payload_too_large', message: `Avatar exceeds ${maxBytes} byte limit` } }));
        return true;
      }
      const existing = await profileStore.getProfile(claims!.sub);
      if (existing?.avatarKey) await fileGateway.delete(existing.avatarKey);
      const stored = await fileGateway.store(claims!.sub, body, mime);
      const updated = await profileStore.updateProfile(claims!.sub, { avatarKey: stored.key });
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: { avatarKey: stored.key, profile: updated } }));
      return true;
    }

    if (url.pathname === '/api/v1/profile/avatar' && req.method === 'DELETE') {
      if (!requireAuth(req, res, 'user')) return true;
      const profile = await profileStore.getProfile(claims!.sub);
      if (profile?.avatarKey) await fileGateway.delete(profile.avatarKey);
      await profileStore.updateProfile(claims!.sub, { avatarKey: null });
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: { removed: true } }));
      return true;
    }

    if (url.pathname === '/api/v1/profile/banner' && req.method === 'PUT') {
      if (!requireAuth(req, res, 'user')) return true;
      const mime = (req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
      if (!BANNER_ALLOWED_MIME.has(mime)) {
        res.writeHead(415, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'unsupported_media_type', message: 'Banner must be jpeg, png, webp, or gif' } }));
        return true;
      }
      const maxBytes = await profileStore.getFileSizeLimit('image');
      const body = await readRawBody(req);
      if (body.length > maxBytes) {
        res.writeHead(413, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'payload_too_large', message: `Banner exceeds ${maxBytes} byte limit` } }));
        return true;
      }
      const existing = await profileStore.getProfile(claims!.sub);
      if (existing?.bannerKey) await fileGateway.delete(existing.bannerKey);
      const stored = await fileGateway.store(claims!.sub, body, mime);
      const updated = await profileStore.updateProfile(claims!.sub, { bannerKey: stored.key });
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: { bannerKey: stored.key, profile: updated } }));
      return true;
    }

    if (url.pathname === '/api/v1/profile/banner' && req.method === 'DELETE') {
      if (!requireAuth(req, res, 'user')) return true;
      const profile = await profileStore.getProfile(claims!.sub);
      if (profile?.bannerKey) await fileGateway.delete(profile.bannerKey);
      await profileStore.updateProfile(claims!.sub, { bannerKey: null });
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ data: { removed: true } }));
      return true;
    }

    const publicProfileMatch = url.pathname.match(/^\/api\/v1\/users\/([^/]+)\/profile$/);
    if (publicProfileMatch && req.method === 'GET') {
      if (!requireAuth(req, res, 'user')) return true;
      const handle = decodeURIComponent(publicProfileMatch[1]);
      const target = await profileStore.getProfileByHandle(handle);
      if (!target) {
        res.writeHead(404, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'not_found', message: 'Profile not found' } }));
        return true;
      }
      if (await profileStore.isBlocked(target.accountId, claims!.sub)) {
        res.writeHead(404, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'not_found', message: 'Profile not found' } }));
        return true;
      }
      const visible = await canViewProfile(claims!.sub, claims!.role, target, profileStore);
      if (!visible) {
        res.writeHead(404, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'not_found', message: 'Profile not found' } }));
        return true;
      }
      const isFollower = await profileStore.isFollowing(claims!.sub, target.accountId);
      const showCounts = claims!.role === 'admin'
        || claims!.sub === target.accountId
        || visibilityRank(target.visibility) >= visibilityRank('community')
        || isFollower;
      const [followerCount, followingCount, posts] = showCounts
        ? await Promise.all([
            profileStore.getFollowerCount(target.accountId),
            profileStore.getFollowingCount(target.accountId),
            profileStore.getPostsByAccount(target.accountId),
          ])
        : [null, null, []];
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        data: profileResponse(target, followerCount, followingCount, showCounts ? posts.length : null),
      }));
      return true;
    }

    return false;
  };
}

import type { IncomingMessage, ServerResponse } from 'node:http';
import { requireAuth } from '../auth/guard.js';
import type { DbProfileStore } from '../adapters/db/profile-store.js';
import type { FileStorageGateway } from '@cognis/core';
import { readRawBody, readJson } from './read-json.js';

const MIME_FROM_EXT: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
};

const BUCKET_CATEGORY: Record<'avatars' | 'banners', 'image'> = {
    avatars: 'image',
    banners: 'image',
};

function mimeFromKey(key: string): string {
    const ext = key.split('.').pop()?.toLowerCase() ?? '';
    return MIME_FROM_EXT[ext] ?? 'application/octet-stream';
}

function categoryForBucket(bucket: string): string {
    return BUCKET_CATEGORY[bucket] ?? 'global';
}

export function createFileRoutes(profileStore: DbProfileStore, fileGateway: FileStorageGateway) {
    return async (req: IncomingMessage, res: ServerResponse, url: URL): Promise<boolean> => {
        const fileMatch = url.pathname.match(/^\/api\/v1\/files\/([^/]+)\/(.+)$/);
        if (fileMatch) {
            const claims = requireAuth(req, res, 'user');
            if (!claims) return true;
            const bucket = decodeURIComponent(fileMatch[1]);
            const key = `${bucket}/${decodeURIComponent(fileMatch[2])}`;

            if (req.method === 'PUT') {
                const category = categoryForBucket(bucket);
                const maxBytes = await profileStore.getFileSizeLimit(category);
                const body = await readRawBody(req);
                if (body.length > maxBytes) {
                    res.writeHead(413, { 'content-type': 'application/json' });
                    res.end(JSON.stringify({ error: { code: 'payload_too_large', message: `File exceeds ${maxBytes} byte limit for category '${category}'` } }));
                    return true;
                }
                const mime = (req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase()
                    || mimeFromKey(key);
                const stored = await fileGateway.put(key, body, mime || undefined);
                res.writeHead(201, { 'content-type': 'application/json' });
                res.end(JSON.stringify({ data: { key: stored.key, size: stored.size, contentType: mime } }));
                return true;
            }

            if (req.method === 'GET') {
                const content = await fileGateway.get(key);
                if (!content) {
                    res.writeHead(404, { 'content-type': 'application/json' });
                    res.end(JSON.stringify({ error: { code: 'not_found', message: 'File not found' } }));
                    return true;
                }
                const mime = mimeFromKey(key);
                res.writeHead(200, { 'content-type': mime });
                res.end(Buffer.from(content));
                return true;
            }

            if (req.method === 'DELETE') {
                if (claims.role !== 'admin') {
                    res.writeHead(403, { 'content-type': 'application/json' });
                    res.end(JSON.stringify({ error: { code: 'forbidden', message: 'Admin required to delete arbitrary files' } }));
                    return true;
                }
                const deleted = await fileGateway.delete(key);
                res.writeHead(200, { 'content-type': 'application/json' });
                res.end(JSON.stringify({ data: { deleted } }));
                return true;
            }
        }

        if (url.pathname === '/api/v1/admin/file-limits' && req.method === 'GET') {
            if (!requireAuth(req, res, 'admin')) return true;
            const limits = await profileStore.getAllFileSizeLimits();
            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ data: limits }));
            return true;
        }

        const limitMatch = url.pathname.match(/^\/api\/v1\/admin\/file-limits\/([^/]+)$/);
        if (limitMatch && req.method === 'PUT') {
            if (!requireAuth(req, res, 'admin')) return true;
            const category = decodeURIComponent(limitMatch[1]);
            const body = await readJson(req);
            const maxBytes = Number(body.maxBytes);
            if (!Number.isInteger(maxBytes) || maxBytes <= 0) {
                res.writeHead(400, { 'content-type': 'application/json' });
                res.end(JSON.stringify({ error: { code: 'bad_request', message: 'maxBytes must be a positive integer' } }));
                return true;
            }
            await profileStore.setFileSizeLimit(category, maxBytes);
            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ data: { category, maxBytes } }));
            return true;
        }

        return false;
    };
}

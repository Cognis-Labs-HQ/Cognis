/**
 * Jitsi Meet module API routes.
 *
 * Public exports:
 *   registerApiRoutes(router) — called by the module extension router when
 *   this module is enabled. Registers all routes and initialises the DB store.
 *
 * Routes registered:
 *   GET  /api/v1/modules/jitsi-meet/ping           — liveness probe (any user)
 *   GET  /api/v1/modules/jitsi-meet/config         — public module config
 *   GET  /api/v1/modules/jitsi-meet/admin/settings — admin: get settings
 *   POST /api/v1/modules/jitsi-meet/admin/settings — admin: save settings
 *   GET  /api/v1/modules/jitsi-meet/contacts       — searchable contact list
 *   POST /api/v1/modules/jitsi-meet/meetings       — create or retrieve meeting
 *   GET  /api/v1/modules/jitsi-meet/meetings/:id   — pre-flight check + details
 */

import { createHash, randomBytes } from 'node:crypto';
import { JitsiMeetStore } from './store.js';

const MODULE_ID = 'jitsi-meet';
const DEFAULT_JITSI_URL = 'https://meet.jit.si';

const DEFAULT_TOOLBAR_BUTTONS = [
    'microphone',
    'camera',
    'desktop',
    'participants-pane',
    'tileview',
    'raisehand',
    'hangup',
    'toggle-camera',
];

function trimTrailingSlash(value) {
    return String(value ?? '').replace(/\/+$/, '');
}

function sanitizeUrl(value) {
    const trimmed = trimTrailingSlash(String(value ?? '').trim());
    if (!trimmed) return '';
    try {
        const parsed = new URL(trimmed);
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
            return '';
        }
        return trimmed;
    } catch {
        return '';
    }
}

function deriveRoomSlug(participantA, participantB, secret) {
    const sorted = [participantA, participantB].sort();
    const seed = `${sorted[0]}:${sorted[1]}:${secret ?? 'cognis-jitsi'}`;
    const digest = createHash('sha256').update(seed).digest('hex');
    return digest.slice(0, 24);
}

function buildJitsiUrl(baseUrl, roomSlug) {
    const base = trimTrailingSlash(baseUrl || DEFAULT_JITSI_URL);
    const params = new URLSearchParams();
    params.set('config.toolbarButtons', JSON.stringify(DEFAULT_TOOLBAR_BUTTONS));
    params.set('config.disableDeepLinking', 'true');
    params.set('config.prejoinPageEnabled', 'false');
    params.set('config.prejoinConfig.enabled', 'false');
    params.set('config.requireDisplayName', 'false');
    params.set('config.disableProfile', 'true');
    params.set('interfaceConfig.DISABLE_CHAT', 'true');
    params.set('interfaceConfig.DISABLE_PROFILE', 'true');
    return `${base}/${roomSlug}#${params.toString()}`;
}

function readJsonBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', (chunk) => {
            body += chunk;
            if (body.length > 64_000) {
                reject(new Error('Request body too large'));
            }
        });
        req.on('end', () => {
            try {
                resolve(JSON.parse(body));
            } catch {
                resolve({});
            }
        });
        req.on('error', reject);
    });
}

function getClaims(req) {
    const authHeader = req.headers['authorization'] ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) return null;
    try {
        const { lookupAccessToken } = await import('/static/reuse/api-client.js').catch(() => null) ?? {};
        void lookupAccessToken;
    } catch {
        // handled below
    }
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    try {
        const payload = JSON.parse(
            Buffer.from(parts[1], 'base64url').toString('utf8'),
        );
        return payload;
    } catch {
        return null;
    }
}

export function registerApiRoutes(router) {
    const capabilities = router.capabilities;
    const dbExecutor = capabilities?.get('db:executor') ?? null;

    let store = null;
    if (dbExecutor) {
        store = new JitsiMeetStore(dbExecutor);
        store.ensureSchema().catch((error) => {
            console.error(
                `[jitsi-meet] Failed to ensure DB schema: ${error.message}`,
            );
        });
    }

    router.get(
        `/api/v1/modules/${MODULE_ID}/ping`,
        async (_req, res) => {
            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ data: { module: MODULE_ID, ok: true } }));
        },
        { access: { minRole: 'user' } },
    );

    router.get(
        `/api/v1/modules/${MODULE_ID}/config`,
        async (_req, res) => {
            const baseUrl = store
                ? (await store.getSetting('baseUrl').catch(() => null)) ?? DEFAULT_JITSI_URL
                : DEFAULT_JITSI_URL;
            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(
                JSON.stringify({
                    data: {
                        baseUrl: sanitizeUrl(baseUrl) || DEFAULT_JITSI_URL,
                        toolbarButtons: DEFAULT_TOOLBAR_BUTTONS,
                    },
                }),
            );
        },
        { access: { minRole: 'user' } },
    );

    router.get(
        `/api/v1/modules/${MODULE_ID}/admin/settings`,
        async (_req, res) => {
            const settings = store
                ? await store.getAllSettings().catch(() => ({}))
                : {};
            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(
                JSON.stringify({
                    data: {
                        baseUrl: sanitizeUrl(settings.baseUrl ?? '') || DEFAULT_JITSI_URL,
                    },
                }),
            );
        },
        { access: { minRole: 'admin' } },
    );

    router.post(
        `/api/v1/modules/${MODULE_ID}/admin/settings`,
        async (req, res) => {
            const body = await readJsonBody(req).catch(() => ({}));
            const baseUrl = sanitizeUrl(body.baseUrl ?? '');
            if (!baseUrl) {
                res.writeHead(400, { 'content-type': 'application/json' });
                res.end(
                    JSON.stringify({
                        error: {
                            code: 'invalid_url',
                            message: 'A valid HTTPS Jitsi base URL is required.',
                        },
                    }),
                );
                return;
            }
            if (store) {
                await store.setSetting('baseUrl', baseUrl).catch((error) => {
                    console.error(
                        `[jitsi-meet] Failed to save settings: ${error.message}`,
                    );
                });
            }
            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ data: { saved: true, baseUrl } }));
        },
        { access: { minRole: 'admin' } },
    );

    router.get(
        `/api/v1/modules/${MODULE_ID}/contacts`,
        async (req, res) => {
            const claims = getClaims(req);
            const query = new URL(
                req.url ?? '/',
                'http://localhost',
            ).searchParams.get('q') ?? '';

            const profileStore = capabilities?.get('social:profileStore') ?? null;
            let contacts = [];
            if (profileStore && typeof profileStore.searchProfiles === 'function') {
                const raw = await profileStore
                    .searchProfiles(query, 20)
                    .catch(() => []);
                contacts = raw
                    .filter(
                        (profile) =>
                            profile.handle && profile.handle !== claims?.sub,
                    )
                    .map((profile) => ({
                        handle: profile.handle,
                        displayName: profile.displayName || profile.handle,
                    }));
            }

            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ data: contacts }));
        },
        { access: { minRole: 'user' } },
    );

    router.post(
        `/api/v1/modules/${MODULE_ID}/meetings`,
        async (req, res) => {
            const claims = getClaims(req);
            if (!claims?.sub) {
                res.writeHead(401, { 'content-type': 'application/json' });
                res.end(
                    JSON.stringify({
                        error: { code: 'unauthorized', message: 'Not authenticated.' },
                    }),
                );
                return;
            }

            const body = await readJsonBody(req).catch(() => ({}));
            const participantHandle = String(body.participantHandle ?? '').trim();
            if (!participantHandle) {
                res.writeHead(400, { 'content-type': 'application/json' });
                res.end(
                    JSON.stringify({
                        error: {
                            code: 'missing_participant',
                            message: 'participantHandle is required.',
                        },
                    }),
                );
                return;
            }

            if (participantHandle === claims.sub) {
                res.writeHead(400, { 'content-type': 'application/json' });
                res.end(
                    JSON.stringify({
                        error: {
                            code: 'self_meeting',
                            message: 'Cannot create a meeting with yourself.',
                        },
                    }),
                );
                return;
            }

            const requesterHandle = claims.sub;
            const baseUrl = store
                ? (await store.getSetting('baseUrl').catch(() => null)) ?? DEFAULT_JITSI_URL
                : DEFAULT_JITSI_URL;
            const effectiveBaseUrl = sanitizeUrl(baseUrl) || DEFAULT_JITSI_URL;

            const roomSlug = deriveRoomSlug(
                requesterHandle,
                participantHandle,
                process.env.COGNIS_CREDENTIAL_SECRET ?? process.env.COGNIS_SESSION_SECRET ?? 'cognis-jitsi',
            );
            const jitsiUrl = buildJitsiUrl(effectiveBaseUrl, roomSlug);

            let meeting = null;
            if (store) {
                meeting = await store
                    .findMeetingByParticipants(requesterHandle, participantHandle)
                    .catch(() => null);

                if (!meeting) {
                    const meetingId = randomBytes(16).toString('hex');
                    await store
                        .createMeeting(meetingId, roomSlug, requesterHandle, participantHandle)
                        .catch((error) => {
                            console.error(
                                `[jitsi-meet] Failed to persist meeting: ${error.message}`,
                            );
                        });
                    meeting = await store
                        .findMeetingByParticipants(requesterHandle, participantHandle)
                        .catch(() => null);
                } else {
                    await store.touchMeeting(meeting.id).catch(() => {});
                }
            }

            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(
                JSON.stringify({
                    data: {
                        id: meeting?.id ?? null,
                        roomSlug,
                        jitsiUrl,
                        participants: [requesterHandle, participantHandle],
                    },
                }),
            );
        },
        { access: { minRole: 'user' } },
    );

    router.get(
        `/api/v1/modules/${MODULE_ID}/meetings/:id`,
        async (req, res) => {
            const claims = getClaims(req);
            if (!claims?.sub) {
                res.writeHead(401, { 'content-type': 'application/json' });
                res.end(
                    JSON.stringify({
                        error: { code: 'unauthorized', message: 'Not authenticated.' },
                    }),
                );
                return;
            }

            const meetingIdMatch = req.url?.match(
                /\/api\/v1\/modules\/jitsi-meet\/meetings\/([^/?#]+)/,
            );
            const meetingId = meetingIdMatch
                ? decodeURIComponent(meetingIdMatch[1])
                : null;

            if (!meetingId) {
                res.writeHead(400, { 'content-type': 'application/json' });
                res.end(
                    JSON.stringify({
                        error: { code: 'bad_request', message: 'Meeting ID is required.' },
                    }),
                );
                return;
            }

            if (!store) {
                res.writeHead(503, { 'content-type': 'application/json' });
                res.end(
                    JSON.stringify({
                        error: { code: 'unavailable', message: 'Database not available.' },
                    }),
                );
                return;
            }

            const meeting = await store.findMeetingById(meetingId).catch(() => null);
            if (!meeting) {
                res.writeHead(404, { 'content-type': 'application/json' });
                res.end(
                    JSON.stringify({
                        error: { code: 'not_found', message: 'Meeting not found.' },
                    }),
                );
                return;
            }

            const requesterHandle = claims.sub;
            const isParticipant =
                meeting.participant_a === requesterHandle ||
                meeting.participant_b === requesterHandle;
            if (!isParticipant) {
                res.writeHead(403, { 'content-type': 'application/json' });
                res.end(
                    JSON.stringify({
                        error: {
                            code: 'forbidden',
                            message: 'You are not a participant in this meeting.',
                        },
                    }),
                );
                return;
            }

            const baseUrl = await store
                .getSetting('baseUrl')
                .catch(() => null) ?? DEFAULT_JITSI_URL;
            const effectiveBaseUrl = sanitizeUrl(baseUrl) || DEFAULT_JITSI_URL;
            const jitsiUrl = buildJitsiUrl(effectiveBaseUrl, meeting.room_slug);

            await store.touchMeeting(meetingId).catch(() => {});

            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(
                JSON.stringify({
                    data: {
                        id: meeting.id,
                        roomSlug: meeting.room_slug,
                        jitsiUrl,
                        participants: [meeting.participant_a, meeting.participant_b],
                        createdAt: meeting.created_at,
                        lastUsedAt: meeting.last_used_at,
                    },
                }),
            );
        },
        { access: { minRole: 'user' } },
    );
}

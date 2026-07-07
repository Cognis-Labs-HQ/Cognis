import { readJson } from '../../../api/reuse/read-json.js';
import { resolveRequesterUsername } from './reuse/requester.js';
import { resolveStore } from './reuse/store-runtime.js';

function sendJson(res, status, payload) {
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(payload));
}

function sendError(res, status, code, message) {
    sendJson(res, status, { error: { code, message } });
}

function resolveExpiry(hoursValue) {
    const parsed = Number(hoursValue);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return '';
    }
    return new Date(Date.now() + parsed * 60 * 60 * 1000).toISOString();
}

async function requireOwnedMeeting({ meetingId, claims, profileStore, store, res }) {
    const meeting = await store.getMeetingById(meetingId);
    if (!meeting) {
        sendError(res, 404, 'not_found', 'Meeting not found.');
        return null;
    }
    const requesterUsername = await resolveRequesterUsername(
        profileStore,
        claims.sub,
    ).catch(() => '');
    if (!requesterUsername || requesterUsername !== meeting.createdBy) {
        sendError(res, 403, 'forbidden', 'Only the meeting owner may share this meeting.');
        return null;
    }
    return meeting;
}

export function registerMeetingShareRoutes({
    router,
    ctx,
    requireAuth,
    profileStore,
}) {
    const dbExecutor = ctx.getCapability('db:executor');
    const log = ctx.getCapability('logging:log');
    const systemCtx = ctx.getCapability('system:ctx');
    const listTokens = ctx.getCapability('share:listTokens');
    if (!dbExecutor || !profileStore || !systemCtx || typeof listTokens !== 'function') {
        router.get('/api/v1/modules/jitsi-meet/share', async (_req, res) => {
            sendError(res, 503, 'service_unavailable', 'Share capabilities are unavailable.');
        }, { access: { minRole: 'user' } });
        router.post('/api/v1/modules/jitsi-meet/share', async (_req, res) => {
            sendError(res, 503, 'service_unavailable', 'Share capabilities are unavailable.');
        }, { access: { minRole: 'user' } });
        router.post('/api/v1/modules/jitsi-meet/share/delete', async (_req, res) => {
            sendError(res, 503, 'service_unavailable', 'Share capabilities are unavailable.');
        }, { access: { minRole: 'user' } });
        return;
    }

    const store = resolveStore(dbExecutor, log);

    router.get(
        '/api/v1/modules/jitsi-meet/share',
        async (req, res) => {
            const claims = requireAuth(req, res, 'user');
            if (!claims) return;
            await store.ensureSchema();
            const url = new URL(req.url, 'http://localhost');
            const meetingId = String(url.searchParams.get('meetingId') ?? '').trim();
            if (!meetingId) {
                sendError(res, 400, 'bad_request', 'meetingId is required.');
                return;
            }
            const meeting = await requireOwnedMeeting({
                meetingId,
                claims,
                profileStore,
                store,
                res,
            });
            if (!meeting) return;
            const data = await listTokens({
                ownerAccountId: claims.sub,
                resourceType: 'meeting',
                resourceId: meeting.id,
            });
            sendJson(res, 200, { data });
        },
        { access: { minRole: 'user' } },
    );

    router.post(
        '/api/v1/modules/jitsi-meet/share',
        async (req, res) => {
            const claims = requireAuth(req, res, 'user');
            if (!claims) return;
            await store.ensureSchema();
            const body = await readJson(req);
            const meetingId = String(body.meetingId ?? '').trim();
            if (!meetingId) {
                sendError(res, 400, 'bad_request', 'meetingId is required.');
                return;
            }
            const meeting = await requireOwnedMeeting({
                meetingId,
                claims,
                profileStore,
                store,
                res,
            });
            if (!meeting) return;
            const flowResult = await systemCtx.flow.run('mint-share-token', {
                claims,
                ownerAccountId: claims.sub,
                resourceType: 'meeting',
                resourceId: meeting.id,
                label: typeof body.label === 'string' ? body.label : '',
                grantedCapabilities: ['meeting:join'],
                expiresAt: resolveExpiry(body.expiresInHours),
            });
            const issued = flowResult.stageResults['issue-token']?.[0];
            if (!issued?.minted) {
                sendError(res, 403, 'forbidden', 'Share token could not be created.');
                return;
            }
            sendJson(res, 200, { data: issued.shareRecord ?? null });
        },
        { access: { minRole: 'user' } },
    );

    router.post(
        '/api/v1/modules/jitsi-meet/share/delete',
        async (req, res) => {
            const claims = requireAuth(req, res, 'user');
            if (!claims) return;
            await store.ensureSchema();
            const body = await readJson(req);
            const meetingId = String(body.meetingId ?? '').trim();
            const shareId = String(body.shareId ?? '').trim();
            if (!meetingId || !shareId) {
                sendError(res, 400, 'bad_request', 'meetingId and shareId are required.');
                return;
            }
            const meeting = await requireOwnedMeeting({
                meetingId,
                claims,
                profileStore,
                store,
                res,
            });
            if (!meeting) return;
            const flowResult = await systemCtx.flow.run('revoke-share-token', {
                claims,
                shareId,
                ownerAccountId: claims.sub,
                resourceType: 'meeting',
                resourceId: meeting.id,
            });
            const deleted = flowResult.stageResults['delete-token']?.[0];
            if (!deleted?.revoked) {
                sendError(res, 403, 'forbidden', 'Share token could not be revoked.');
                return;
            }
            sendJson(res, 200, { data: { deleted: true } });
        },
        { access: { minRole: 'user' } },
    );
}

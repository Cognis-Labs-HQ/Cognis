import test from 'node:test';
import assert from 'node:assert/strict';
import { createCtx, registerCanonicalFlow, SHARE_FLOW_CATALOG } from '@cognis/core';
import { registerShareFlowHooks } from '../share-hooks.js';

class MeetingExecutor {
    async ensureTable() {}

    async executeCommand(command) {
        if (command.table === 'jitsi_meetings') {
            return {
                rows: [
                    {
                        id: 'meeting-1',
                        participant_key: 'participants',
                        meeting_url: 'https://meet.example.test/room-1',
                        meeting_password: 'secret',
                        meeting_name: 'Planning',
                        room_slug: 'room-1',
                        chat_room_id: 'chat-1',
                        classroom_id: null,
                        created_by: 'alice',
                        created_at: '2026-07-07T00:00:00.000Z',
                        updated_at: '2026-07-07T00:00:00.000Z',
                    },
                ],
            };
        }
        if (command.table === 'jitsi_meeting_participants') {
            return { rows: [{ username: 'alice' }, { username: 'bob' }] };
        }
        if (command.table === 'jitsi_meeting_state') {
            return {
                rows: [
                    {
                        meeting_id: 'meeting-1',
                        first_joined_by: 'alice',
                        first_joined_at: '2026-07-07T00:00:00.000Z',
                        auth_required: 0,
                        auth_started_by: null,
                        auth_started_at: null,
                        auth_completed_at: null,
                        updated_at: '2026-07-07T00:00:00.000Z',
                        ended_by: null,
                        ended_at: null,
                    },
                ],
            };
        }
        return { rows: [] };
    }

    async transaction(callback) {
        return callback(this);
    }
}

test('jitsi share hooks validate owned meetings and resolve public payloads', async () => {
    const ctx = createCtx();
    for (const flow of SHARE_FLOW_CATALOG) {
        registerCanonicalFlow(ctx, flow);
    }
    const capabilities = new Map([
        ['db:executor', new MeetingExecutor()],
        ['social:profileStore', {
            async getProfile(accountId) {
                return { handle: accountId };
            },
            async getProfileByHandle(handle) {
                return {
                    handle,
                    displayName: handle === 'alice' ? 'Alice Example' : handle,
                };
            },
        }],
        ['logging:log', () => undefined],
    ]);

    registerShareFlowHooks({
        flow: ctx.flow,
        getCapability(capabilityId) {
            return capabilities.get(capabilityId);
        },
    });

    const mintResult = await ctx.flow.run('mint-share-token', {
        claims: { sub: 'alice' },
        ownerAccountId: 'alice',
        resourceType: 'meeting',
        resourceId: 'meeting-1',
    });
    assert.equal(
        mintResult.stageResults['validate-resource'][0].valid,
        true,
    );
    assert.equal(
        mintResult.stageResults['authorize-minter'][0].authorized,
        true,
    );

    ctx.flow.extend(
        'resolve-share-token',
        'validate-token',
        { id: 'test:share-token' },
        () => ({
            valid: true,
            tokenRecord: {
                resourceType: 'meeting',
                resourceId: 'meeting-1',
                grantedCapabilities: ['meeting:join'],
            },
        }),
    );

    const resolveResult = await ctx.flow.run('resolve-share-token', {
        token: 'shr_test.secret',
    });
    const resolvedPayload = resolveResult.stageResults['resolve-resource'][0];
    assert.equal(resolvedPayload.resolved, true);
    assert.equal(resolvedPayload.payload.title, 'Planning');
    assert.equal(
        resolvedPayload.payload.hostDisplayName,
        'Alice Example',
    );
    assert.equal(
        resolvedPayload.payload.joinUrl,
        'https://meet.example.test/room-1',
    );
    assert.equal(resolveResult.stageResults['check-access'][0].allowed, true);
});

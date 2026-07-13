import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import {
    createCtx,
    registerCanonicalFlow,
    SHARE_FLOW_CATALOG,
} from "@cognis/core";
import { registerMeetingShareRoutes } from "../share-routes.js";
import { registerShareFlowHooks } from "../share-hooks.js";

function createProfileStore() {
    const accountIdByHandle = {
        alice: "alice-account",
        bob: "bob-account",
        carol: "carol-account",
        dana: "dana-account",
    };
    const handleByAccountId = Object.fromEntries(
        Object.entries(accountIdByHandle).map(([handle, accountId]) => [
            accountId,
            handle,
        ]),
    );
    return {
        async getProfile(accountId) {
            const handle =
                handleByAccountId[String(accountId ?? "")] ??
                String(accountId ?? "");
            return {
                accountId: String(accountId ?? ""),
                handle,
                displayName: handle,
            };
        },
        async getProfileByHandle(handle) {
            const normalizedHandle = String(handle ?? "");
            return {
                accountId:
                    accountIdByHandle[normalizedHandle] ?? normalizedHandle,
                handle: normalizedHandle,
                displayName:
                    normalizedHandle === "alice"
                        ? "Alice Example"
                        : normalizedHandle,
            };
        },
    };
}

class MeetingExecutor {
    constructor({
        participantUsernames = ["alice", "bob"],
        presenceRows = [],
        meetingStateRow = {},
    } = {}) {
        this.participantUsernames = participantUsernames;
        this.presenceRows = presenceRows;
        this.meetingRow = {
            id: "meeting-1",
            participant_key: "participants",
            meeting_url: "https://meet.example.test/room-1",
            meeting_password: "secret",
            meeting_name: "Planning",
            room_slug: "room-1",
            chat_room_id: "chat-1",
            classroom_id: null,
            created_by: "alice",
            created_at: "2026-07-07T00:00:00.000Z",
            updated_at: "2026-07-07T00:00:00.000Z",
        };
        this.meetingStateRow = {
            meeting_id: "meeting-1",
            instance_id: "instance-1",
            first_joined_by: "alice",
            first_joined_at: "2026-07-07T00:00:00.000Z",
            auth_required: 0,
            auth_started_by: null,
            auth_started_at: null,
            auth_completed_at: null,
            updated_at: "2026-07-07T00:00:00.000Z",
            ended_by: null,
            ended_at: null,
            ...meetingStateRow,
        };
    }

    async ensureTable() {}

    async executeCommand(command) {
        if (command.table === "jitsi_meetings") {
            if (
                Array.isArray(command.where) &&
                command.where.some(
                    (condition) =>
                        condition.column === "id" &&
                        condition.value !== this.meetingRow.id,
                )
            ) {
                return { rows: [] };
            }
            return { rows: [this.meetingRow] };
        }
        if (command.table === "jitsi_meeting_participants") {
            return {
                rows: this.participantUsernames.map((username) => ({
                    username,
                })),
            };
        }
        if (command.table === "jitsi_meeting_state") {
            return { rows: [this.meetingStateRow] };
        }
        if (command.table === "jitsi_meeting_presence") {
            return { rows: this.presenceRows };
        }
        return { rows: [] };
    }

    async transaction(callback) {
        return callback(this);
    }
}

function createFlowHarness(executor, profileStore = createProfileStore()) {
    const ctx = createCtx();
    for (const flow of SHARE_FLOW_CATALOG) {
        registerCanonicalFlow(ctx, flow);
    }
    const capabilities = new Map([
        ["db:executor", executor],
        ["social:profileStore", profileStore],
        ["logging:log", () => undefined],
    ]);
    registerShareFlowHooks({
        flow: ctx.flow,
        getCapability(capabilityId) {
            return capabilities.get(capabilityId);
        },
    });
    return { ctx, capabilities };
}

function createRouterHarness({
    executor,
    profileStore = createProfileStore(),
    listByResource,
    runFlow,
}) {
    const handlers = new Map();
    const router = {
        get(path, handler) {
            handlers.set(`GET ${path}`, handler);
        },
        post(path, handler) {
            handlers.set(`POST ${path}`, handler);
        },
    };
    const capabilities = new Map([
        ["db:executor", executor],
        ["logging:log", () => undefined],
        ["system:ctx", { flow: { run: runFlow } }],
        ["share:listByResource", listByResource],
    ]);
    registerMeetingShareRoutes({
        router,
        ctx: {
            getCapability(capabilityId) {
                return capabilities.get(capabilityId);
            },
        },
        requireAuth(req) {
            return req.claims ?? null;
        },
        profileStore,
    });
    return handlers;
}

async function invokeRoute(handler, { method, url, claims, body }) {
    const request = Readable.from(
        body === undefined ? [] : [JSON.stringify(body)],
    );
    request.method = method;
    request.url = url;
    request.claims = claims;
    const response = {
        statusCode: 200,
        headers: {},
        body: "",
        writeHead(statusCode, headers) {
            this.statusCode = statusCode;
            this.headers = headers ?? {};
        },
        end(chunk = "") {
            this.body += String(chunk ?? "");
        },
    };
    await handler(request, response);
    return {
        statusCode: response.statusCode,
        headers: response.headers,
        body: response.body ? JSON.parse(response.body) : null,
    };
}

test("jitsi share hooks let participants mint and revoke meeting shares", async () => {
    const { ctx } = createFlowHarness(new MeetingExecutor());

    const mintResult = await ctx.flow.run("mint-share-token", {
        claims: { sub: "bob-account" },
        ownerAccountId: "bob-account",
        resourceType: "meeting",
        resourceId: "meeting-1",
    });
    assert.equal(mintResult.stageResults["validate-resource"][0].valid, true);
    assert.equal(
        mintResult.stageResults["authorize-minter"][0].authorized,
        true,
    );
    assert.equal(
        mintResult.stageResults["authorize-minter"][0].meetingInstanceId,
        "instance-1",
    );

    const revokeResult = await ctx.flow.run("revoke-share-token", {
        claims: { sub: "bob-account" },
        shareId: "share-1",
        resourceType: "meeting",
        resourceId: "meeting-1",
    });
    assert.equal(
        revokeResult.stageResults["authorize-revocation"][0].authorized,
        true,
    );

    ctx.flow.extend(
        "resolve-share-token",
        "validate-token",
        { id: "test:share-token" },
        () => ({
            valid: true,
            tokenRecord: {
                resourceType: "meeting",
                resourceId: "meeting-1",
                grantedCapabilities: ["meeting:join"],
                metadata: { meetingInstanceId: "instance-1" },
            },
        }),
    );

    const resolveResult = await ctx.flow.run("resolve-share-token", {
        token: "shr_test.secret",
    });
    const resolvedPayload = resolveResult.stageResults["resolve-resource"][0];
    assert.equal(resolvedPayload.resolved, true);
    assert.equal(resolvedPayload.payload.title, "Planning");
    assert.equal(resolvedPayload.payload.hostDisplayName, "Alice Example");
    assert.equal(
        resolvedPayload.payload.joinUrl,
        "https://meet.example.test/room-1",
    );
    assert.equal(resolveResult.stageResults["check-access"][0].allowed, true);
});

test("jitsi share hooks flag direct access for the meeting owner and participants", async () => {
    const { ctx } = createFlowHarness(new MeetingExecutor());

    ctx.flow.extend(
        "resolve-share-token",
        "validate-token",
        { id: "test:share-token" },
        () => ({
            valid: true,
            tokenRecord: {
                resourceType: "meeting",
                resourceId: "meeting-1",
                grantedCapabilities: ["meeting:join"],
                metadata: { meetingInstanceId: "instance-1" },
            },
        }),
    );

    const ownerResult = await ctx.flow.run("resolve-share-token", {
        token: "shr_test.secret",
        requesterClaims: { sub: "alice-account" },
    });
    assert.equal(
        ownerResult.stageResults["check-access"][0].directAccess,
        true,
    );

    const participantResult = await ctx.flow.run("resolve-share-token", {
        token: "shr_test.secret",
        requesterClaims: { sub: "bob-account" },
    });
    assert.equal(
        participantResult.stageResults["check-access"][0].directAccess,
        true,
    );

    const unrelatedResult = await ctx.flow.run("resolve-share-token", {
        token: "shr_test.secret",
        requesterClaims: { sub: "carol-account" },
    });
    assert.notEqual(
        unrelatedResult.stageResults["check-access"][0].directAccess,
        true,
    );
});

test("meeting share routes let participants manage shares and reject outsiders", async () => {
    const listCalls = [];
    const flowCalls = [];
    const handlers = createRouterHarness({
        executor: new MeetingExecutor({
            participantUsernames: ["alice", "bob"],
        }),
        listByResource: async (filter) => {
            listCalls.push(filter);
            return [{ id: "share-1" }, { id: "share-2" }];
        },
        runFlow: async (flowId, payload) => {
            flowCalls.push({ flowId, payload });
            if (flowId === "mint-share-token") {
                return {
                    stageResults: {
                        "issue-token": [
                            { minted: true, shareRecord: { id: "share-3" } },
                        ],
                    },
                };
            }
            return {
                stageResults: {
                    "delete-token": [{ revoked: true }],
                },
            };
        },
    });

    const listResponse = await invokeRoute(
        handlers.get("GET /api/v1/modules/jitsi-meet/share"),
        {
            method: "GET",
            url: "/api/v1/modules/jitsi-meet/share?meetingId=meeting-1",
            claims: { sub: "bob-account" },
        },
    );
    assert.equal(listResponse.statusCode, 200);
    assert.equal(listCalls.length, 1);
    assert.deepEqual(listCalls[0], {
        resourceType: "meeting",
        resourceId: "meeting-1",
    });
    assert.equal(listResponse.body.data.length, 2);

    const createResponse = await invokeRoute(
        handlers.get("POST /api/v1/modules/jitsi-meet/share"),
        {
            method: "POST",
            url: "/api/v1/modules/jitsi-meet/share",
            claims: { sub: "bob-account" },
            body: { meetingId: "meeting-1", label: "Open session" },
        },
    );
    assert.equal(createResponse.statusCode, 200);
    assert.equal(createResponse.body.data.id, "share-3");

    const deleteResponse = await invokeRoute(
        handlers.get("POST /api/v1/modules/jitsi-meet/share/delete"),
        {
            method: "POST",
            url: "/api/v1/modules/jitsi-meet/share/delete",
            claims: { sub: "bob-account" },
            body: { meetingId: "meeting-1", shareId: "share-3" },
        },
    );
    assert.equal(deleteResponse.statusCode, 200);
    assert.equal(deleteResponse.body.data.deleted, true);
    assert.deepEqual(
        flowCalls.map((entry) => entry.flowId),
        ["mint-share-token", "revoke-share-token"],
    );

    const outsiderHandlers = createRouterHarness({
        executor: new MeetingExecutor({
            participantUsernames: ["alice", "bob"],
        }),
        listByResource: async () => [],
        runFlow: async () => ({ stageResults: {} }),
    });
    for (const request of [
        {
            handler: outsiderHandlers.get(
                "GET /api/v1/modules/jitsi-meet/share",
            ),
            method: "GET",
            url: "/api/v1/modules/jitsi-meet/share?meetingId=meeting-1",
        },
        {
            handler: outsiderHandlers.get(
                "POST /api/v1/modules/jitsi-meet/share",
            ),
            method: "POST",
            url: "/api/v1/modules/jitsi-meet/share",
            body: { meetingId: "meeting-1" },
        },
        {
            handler: outsiderHandlers.get(
                "POST /api/v1/modules/jitsi-meet/share/delete",
            ),
            method: "POST",
            url: "/api/v1/modules/jitsi-meet/share/delete",
            body: { meetingId: "meeting-1", shareId: "share-3" },
        },
    ]) {
        const response = await invokeRoute(request.handler, {
            ...request,
            claims: { sub: "dana-account" },
        });
        assert.equal(response.statusCode, 403);
        assert.equal(response.body.error.code, "forbidden");
    }
});

test("meeting share approval targets only include currently present participants", async () => {
    const currentTimestamp = new Date().toISOString();
    const staleTimestamp = new Date(Date.now() - 130_000).toISOString();
    const { ctx } = createFlowHarness(
        new MeetingExecutor({
            participantUsernames: ["alice", "bob", "carol"],
            presenceRows: [
                {
                    meeting_id: "meeting-1",
                    username: "alice",
                    session_id: "session-1",
                    active: 1,
                    last_seen_at: currentTimestamp,
                },
                {
                    meeting_id: "meeting-1",
                    username: "bob",
                    session_id: "session-2",
                    active: 1,
                    last_seen_at: currentTimestamp,
                },
                {
                    meeting_id: "meeting-1",
                    username: "carol",
                    session_id: "session-3",
                    active: 1,
                    last_seen_at: staleTimestamp,
                },
            ],
        }),
    );

    const result = await ctx.flow.run("resolve-share-approval-targets", {
        resourceType: "meeting",
        resourceId: "meeting-1",
        requesterAccountId: "alice-account",
    });
    assert.deepEqual(
        result.stageResults["resolve-targets"][0].targetAccountIds,
        ["bob-account"],
    );
});

test("meeting share tokens expire when the meeting instance changes", async () => {
    const { ctx } = createFlowHarness(
        new MeetingExecutor({
            meetingStateRow: {
                instance_id: "instance-current",
            },
        }),
    );

    ctx.flow.extend(
        "resolve-share-token",
        "validate-token",
        { id: "test:share-token" },
        () => ({
            valid: true,
            tokenRecord: {
                resourceType: "meeting",
                resourceId: "meeting-1",
                grantedCapabilities: ["meeting:join"],
                metadata: { meetingInstanceId: "instance-old" },
            },
        }),
    );

    const result = await ctx.flow.run("resolve-share-token", {
        token: "shr_test.secret",
    });
    assert.equal(result.stageResults["check-access"][0].allowed, false);
    assert.equal(result.stageResults["check-access"][0].reason, "expired");
});

test("meeting share tokens minted before a meeting's first instance still resolve", async () => {
    const { ctx } = createFlowHarness(
        new MeetingExecutor({
            meetingStateRow: {
                instance_id: "instance-current",
            },
        }),
    );

    ctx.flow.extend(
        "resolve-share-token",
        "validate-token",
        { id: "test:share-token" },
        () => ({
            valid: true,
            tokenRecord: {
                resourceType: "meeting",
                resourceId: "meeting-1",
                grantedCapabilities: ["meeting:join"],
                // Minted before the meeting ever started, so no instance id
                // was known yet.
                metadata: { meetingInstanceId: "" },
            },
        }),
    );

    const result = await ctx.flow.run("resolve-share-token", {
        token: "shr_test.secret",
    });
    assert.equal(result.stageResults["check-access"][0].allowed, true);
});

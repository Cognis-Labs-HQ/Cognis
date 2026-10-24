import assert from "node:assert/strict";
import test from "node:test";
import { createCtx, CapabilityStore } from "@cognis/core";
import type { ActivityScoreInput, ActivityScore } from "@cognis/core";
import { LeaderboardService } from "../service.js";
import { registerPracticeIntegration } from "../practice.js";

function fixture() {
    const system = createCtx();
    const capabilities = new CapabilityStore();
    capabilities.contribute("system:ctx", system);
    const allowed = new Set(["alice", "bob"]);
    const events = new Map(
        ["alice", "bob"].map((actorId) => [
            actorId,
            { id: actorId, actorId, occurredAt: "2026-10-19T07:00:00.000Z" },
        ]),
    );
    let enabled = true;
    let persisted: unknown;
    const service = new LeaderboardService(
        {
            listEvents: async (_actor, filters) => {
                const event = events.get(filters?.eventId ?? "");
                return event ? [event] : [];
            },
        },
        () => enabled,
        undefined,
        { canRead: async (_classId, accountId) => allowed.has(accountId) },
        undefined,
        async (state) => {
            persisted = state;
        },
    );
    registerPracticeIntegration(
        { capabilities, flow: system.flow, isAdapterEnabled: () => enabled },
        service,
    );
    return {
        service,
        capabilities,
        allowed,
        enabled: (value: boolean) => {
            enabled = value;
        },
        persisted: () => persisted,
    };
}

async function submit(
    state: ReturnType<typeof fixture>,
    actorId: string,
): Promise<void> {
    const activity: ActivityScoreInput = {
        activityId: actorId,
        participantId: actorId,
        providerId: "study",
        difficulty: 1,
        completedAt: "2026-10-19T07:00:00.000Z",
        events: [
            {
                id: actorId,
                activityType: "drawing",
                correct: true,
                independentCorrect: true,
                hints: 0,
                durationMs: 1000,
            },
        ],
    };
    const record = state.capabilities.require<
        (input: unknown) => Promise<void>
    >("study:leaderboard:recordPractice");
    const score: ActivityScore = {
        xp: 13,
        baseXp: 13,
        completion: "standard",
        appliedModifiers: [],
    };
    await record({
        actor: { accountId: actorId, role: "user" },
        event: {
            id: actorId,
            actorId,
            content: { language: "ja" },
            context: { classroomId: "room" },
        },
        activity,
        score,
    });
}

test("canonical classroom practice creates a privacy-gated XP board and replays one observation", async () => {
    const state = fixture();
    await submit(state, "alice");
    await submit(state, "alice");
    const [definition] = state.service.listDefinitions();
    assert.equal(definition.classroomId, "room");
    assert.match(definition.metadata?.labels.en ?? "", /Japanese/);
    assert.match(definition.metadata?.labels.ja ?? "", /日本語/);
    assert.equal(
        (
            await state.service.queryStandings({
                definitionId: definition.id,
                viewerId: "alice",
            })
        ).total,
        0,
    );
    await submit(state, "bob");
    const standings = await state.service.queryStandings({
        definitionId: definition.id,
        viewerId: "alice",
    });
    assert.equal(standings.total, 2);
    assert.equal(
        standings.rows.find(({ participant }) => participant.id === "alice")
            ?.criteria.xp,
        13,
    );
    assert.ok(state.persisted());
    state.allowed.delete("alice");
    assert.equal(
        await state.service.canAccessDefinition(
            { accountId: "alice", role: "user" },
            definition.id,
        ),
        false,
    );
    assert.equal(
        (
            await state.service.queryStandings({
                definitionId: definition.id,
                viewerId: "bob",
            })
        ).total,
        0,
    );
});

test("corrected practice invalidates its standings and disabled integration refuses delivery", async () => {
    const state = fixture();
    await submit(state, "alice");
    await submit(state, "bob");
    const invalidate = state.capabilities.require<
        (input: unknown) => Promise<void>
    >("study:leaderboard:invalidateEvidence");
    await invalidate({
        actor: { accountId: "alice", role: "user" },
        eventId: "alice",
    });
    const [definition] = state.service.listDefinitions();
    assert.equal(
        (
            await state.service.queryStandings({
                definitionId: definition.id,
                viewerId: "bob",
            })
        ).total,
        0,
    );
    state.enabled(false);
    await assert.rejects(submit(state, "bob"), /adapter_disabled/);
});

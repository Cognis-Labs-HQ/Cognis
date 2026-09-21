import assert from "node:assert/strict";
import test from "node:test";
import { LeaderboardService } from "../service.js";
import { bootstrapStudyAdapter } from "../index.js";
import type { LeaderboardDefinition } from "../types.js";
import { CapabilityStore, createCtx, ScoringEngine } from "@cognis/core";
import type { StudyAdapterBootstrapCtx } from "../../../../gateways/study/gateway.js";
import { createDefaultRouteContext } from "../../../../api/reuse/route-context.js";

const events = new Map(
    [
        ["a", "alice"],
        ["b", "bob"],
        ["c", "carol"],
    ].map(([id, actorId]) => [
        id,
        { id, actorId, occurredAt: "2026-09-01T00:00:00.000Z" },
    ]),
);
const progress = {
    listEvents: async (_actor: unknown, filters?: { eventId?: string }) =>
        events.has(filters!.eventId!) ? [events.get(filters!.eventId!)!] : [],
};
const actor = (accountId: string) => ({ accountId, role: "user" as const });
const definition: LeaderboardDefinition = {
    id: "weekly",
    kind: "event",
    recurring: true,
    optIn: true,
    minimumCohortSize: 2,
    season: {
        id: "s1",
        startsAt: "2026-09-01T00:00:00Z",
        endsAt: "2026-09-08T00:00:00Z",
    },
    criteria: [
        {
            id: "accuracy",
            label: { en: "Accuracy" },
            priority: 1,
            direction: "descending",
            valueType: "percentage",
            minimumEvidence: 1,
            tieBreak: "participantId",
            window: { kind: "season" },
            scope: "event",
        },
        {
            id: "time",
            label: { en: "Time" },
            priority: 2,
            direction: "ascending",
            valueType: "duration",
            minimumEvidence: 1,
            tieBreak: "participantId",
            window: { kind: "season" },
            scope: "event",
        },
    ],
};

test("bootstrap publishes the leaderboard capability for language providers", async () => {
    const systemCtx = createCtx();
    const capabilities = new CapabilityStore();
    capabilities.contribute("system:ctx", systemCtx);
    capabilities.contribute("study:progress", progress);
    capabilities.contribute("engagement:scoring", new ScoringEngine());
    capabilities.contribute("auth:routeContext", createDefaultRouteContext());
    await bootstrapStudyAdapter({
        capabilities,
        isAdapterEnabled: () => true,
        registerRoute: () => undefined,
    } as unknown as StudyAdapterBootstrapCtx);
    assert.equal(systemCtx.isPublicCapability("study:leaderboard"), true);
    assert.ok(systemCtx.getCapability("study:leaderboard"));
});

async function fixture() {
    const service = new LeaderboardService(progress);
    service.registerDefinition(definition);
    for (const participant of ["alice", "bob"]) {
        service.setParticipation(participant, "weekly", {
            optedIn: true,
            alias: participant,
        });
        service.assignCohort(participant, "weekly", "red");
    }
    const submit = (
        participantId: string,
        criterionId: string,
        value: number,
        evidence: string,
        id = `${participantId}-${criterionId}`,
    ) =>
        service.submitObservation(actor(participantId), {
            id,
            definitionId: "weekly",
            participantId,
            criterionId,
            value,
            observedAt: "2026-09-02T00:00:00Z",
            evidenceEventIds: [evidence],
            cohortId: "red",
            seasonId: "s1",
        });
    return { service, submit };
}

test("lexicographic criteria priority, ties, privacy, plating, pagination and accessibility", async () => {
    const { service, submit } = await fixture();
    await submit("alice", "accuracy", 90, "a");
    await submit("alice", "time", 20, "a");
    await submit("bob", "accuracy", 90, "b");
    await submit("bob", "time", 30, "b");
    const result = await service.queryStandings({
        definitionId: "weekly",
        viewerId: "alice",
        cohortId: "red",
        seasonId: "s1",
        limit: 1,
    });
    assert.equal(result.total, 2);
    assert.equal(result.rows[0].participant.id, "alice");
    assert.equal(result.rows[0].plating, "gold");
    const table = await service.requestTableModel(
        {
            definitionId: "weekly",
            viewerId: "alice",
            cohortId: "red",
            seasonId: "s1",
        },
        "en",
    );
    assert.match(table.rows[0].screenReaderLabel, /rank 1/);
    assert.ok(table.columns.some((column) => column.id === "movement"));
});

test("corrections, expiry, cohort isolation, ties and rollover archives", async () => {
    const { service, submit } = await fixture();
    await submit("alice", "accuracy", 90, "a");
    await submit("alice", "time", 20, "a");
    await submit("bob", "accuracy", 90, "b");
    await submit("bob", "time", 20, "b");
    let result = await service.queryStandings({
        definitionId: "weekly",
        viewerId: "alice",
        cohortId: "red",
        seasonId: "s1",
    });
    assert.ok(result.rows.every((row) => row.tied));
    await service.invalidateObservation(actor("alice"), "alice-time");
    result = await service.queryStandings({
        definitionId: "weekly",
        viewerId: "alice",
        cohortId: "red",
        seasonId: "s1",
    });
    assert.equal(result.total, 0);
    service.rollover("weekly", {
        id: "s2",
        startsAt: "2026-09-08T00:00:00Z",
        endsAt: "2026-09-15T00:00:00Z",
    });
    assert.equal(service.archivedResults("weekly")[0].seasonId, "s1");
});

test("weighted ranking is explicit and rolling observations expire", async () => {
    const service = new LeaderboardService(progress);
    service.registerDefinition({
        ...definition,
        minimumCohortSize: 1,
        id: "weighted",
        strategy: "weighted",
        season: undefined,
        criteria: definition.criteria.map((c) => ({
            ...c,
            window: { kind: "rolling", durationMs: 1000 } as const,
            weight: 1,
        })),
    });
    service.setParticipation("alice", "weighted", { optedIn: true });
    service.setParticipation("bob", "weighted", { optedIn: true });
    assert.equal(
        (
            await service.queryStandings({
                definitionId: "weighted",
                viewerId: "alice",
                now: "2026-09-02T00:00:00Z",
            })
        ).total,
        0,
    );
});

test("activity collections score through core and become evidence-backed XP", async () => {
    const scoring = new ScoringEngine();
    const service = new LeaderboardService(progress, () => true, scoring);
    service.registerDefinition({
        ...definition,
        minimumCohortSize: 1,
        criteria: [
            {
                ...definition.criteria[0],
                id: "xp",
                valueType: "number",
                window: { kind: "allTime" },
            },
        ],
    });
    service.setParticipation("alice", "weekly", {
        optedIn: true,
        alias: "alice",
    });
    const score = await service.scoreActivity(actor("alice"), "weekly", "xp", {
        activityId: "activity-a",
        participantId: "alice",
        providerId: "study-language-ja",
        difficulty: 2,
        completedAt: "2026-09-01T00:00:00.000Z",
        events: [
            {
                id: "a",
                activityType: "writing",
                correct: true,
                independentCorrect: true,
                hints: 0,
                durationMs: 1_000,
            },
        ],
    });
    const standings = await service.queryStandings({
        definitionId: "weekly",
        viewerId: "alice",
    });
    assert.equal(standings.rows[0].criteria.xp, score.xp);
});

import assert from "node:assert/strict";
import test from "node:test";
import { LeaderboardService } from "../service.js";
import { bootstrapStudyAdapter } from "../index.js";
import type {
    LeaderboardDefinition,
    ProgressEvidenceCapability,
} from "../types.js";
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
    capabilities.contribute("engagement:scoring", new ScoringEngine());
    capabilities.contribute("auth:routeContext", createDefaultRouteContext());
    capabilities.contribute("db:executor", {
        ensureTable: async () => {},
        executeCommand: async () => ({ rows: [] }),
        transaction: async (operation: (db: unknown) => Promise<unknown>) =>
            operation(capabilities.get("db:executor")),
    });
    let spaRoute:
        { pattern: string; requiredCapabilities?: string[] } | undefined;
    await bootstrapStudyAdapter({
        capabilities,
        flow: systemCtx.flow,
        isAdapterEnabled: () => true,
        registerRoute: () => undefined,
        registerSpaRoute: (route: {
            pattern: string;
            requiredCapabilities?: string[];
        }) => {
            spaRoute = route;
        },
    } as unknown as StudyAdapterBootstrapCtx);
    assert.equal(systemCtx.isPublicCapability("study:leaderboard"), true);
    assert.ok(systemCtx.getCapability("study:leaderboard"));
    assert.equal(spaRoute?.pattern, "^/study/leaderboard$");
    assert.deepEqual(spaRoute?.requiredCapabilities, undefined);
    const capability =
        capabilities.require<import("../types.js").LeaderboardCapability>(
            "study:leaderboard",
        );
    let registrations = 0;
    systemCtx.flow.extend(
        "study:leaderboard:registerDefinition",
        "persist",
        { id: "test:registration-hook", order: -200 },
        () => {
            registrations++;
        },
    );
    await capability.registerDefinition({
        ...definition,
        id: "classroom",
        kind: "classroom",
        classroomId: "room",
        minimumCohortSize: 1,
    });
    assert.equal(registrations, 1);
    assert.equal(
        await capability.canAccessDefinition(actor("alice"), "classroom"),
        false,
    );
    capabilities.contribute("study:classes:access", {
        canRead: async () => true,
    });
    assert.equal(
        await capability.canAccessDefinition(actor("alice"), "classroom"),
        true,
    );
    capabilities.contribute("study:classes:access", {
        canRead: async () => false,
    });
    assert.equal(
        await capability.canAccessDefinition(actor("alice"), "classroom"),
        false,
    );
});

test("leaderboard resolves Progress lazily without changing gateway bootstrap", async () => {
    const capabilities = new CapabilityStore();
    const service = new LeaderboardService(() =>
        capabilities.get<ProgressEvidenceCapability>("study:progress"),
    );
    await service.registerDefinition({ ...definition, minimumCohortSize: 1 });
    await service.setParticipation("alice", "weekly", { optedIn: true });
    await service.assignCohort("alice", "weekly", "red");
    capabilities.contribute("study:progress", progress);

    await service.submitObservation(actor("alice"), {
        id: "lazy-progress",
        definitionId: "weekly",
        participantId: "alice",
        criterionId: "accuracy",
        value: 100,
        observedAt: "2026-09-02T00:00:00Z",
        evidenceEventIds: ["a"],
        cohortId: "red",
        seasonId: "s1",
    });
});

async function fixture() {
    const service = new LeaderboardService(progress);
    await service.registerDefinition(definition);
    for (const participant of ["alice", "bob"]) {
        await service.setParticipation(participant, "weekly", {
            optedIn: true,
            alias: participant,
        });
        await service.assignCohort(participant, "weekly", "red");
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
    await service.rollover("weekly", {
        id: "s2",
        startsAt: "2026-09-08T00:00:00Z",
        endsAt: "2026-09-15T00:00:00Z",
    });
    assert.equal(service.archivedResults("weekly")[0].seasonId, "s1");
});

test("weighted ranking is explicit and rolling observations expire", async () => {
    const service = new LeaderboardService(progress);
    await service.registerDefinition({
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
    await service.setParticipation("alice", "weighted", { optedIn: true });
    await service.setParticipation("bob", "weighted", { optedIn: true });
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
    await service.registerDefinition({
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
    await service.setParticipation("alice", "weekly", {
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

test("definition validation rejects unsafe cohort thresholds and duplicate IDs", async () => {
    const service = new LeaderboardService(progress);
    await assert.rejects(
        () =>
            service.registerDefinition({ ...definition, minimumCohortSize: 0 }),
        /invalid_minimum_cohort_size/,
    );
    await service.registerDefinition(definition);
    await assert.rejects(
        () => service.registerDefinition(definition),
        /definition_exists/,
    );
});

test("evidence is immutable, window-derived, and scored once per criterion", async () => {
    const service = new LeaderboardService(progress);
    await service.registerDefinition({
        ...definition,
        minimumCohortSize: 1,
        criteria: [definition.criteria[0]],
    });
    await service.setParticipation("alice", "weekly", { optedIn: true });
    const observation = {
        id: "immutable-observation",
        definitionId: "weekly",
        participantId: "alice",
        criterionId: "accuracy",
        value: 10,
        observedAt: "2026-09-07T00:00:00Z",
        evidenceEventIds: ["a"],
        seasonId: "s1",
    };
    await service.submitObservation(actor("alice"), observation);
    await assert.rejects(
        service.submitObservation(actor("alice"), {
            ...observation,
            id: "duplicate-evidence",
        }),
        /evidence_already_scored/,
    );
    await assert.rejects(
        service.submitObservation(actor("alice"), {
            ...observation,
            value: 11,
        }),
        /observation_id_conflict/,
    );
    const result = await service.queryStandings({
        definitionId: "weekly",
        viewerId: "alice",
    });
    assert.equal(result.rows[0].updatedAt, events.get("a")!.occurredAt);
});

test("all participants in a multi-way tie retain the same rank", async () => {
    const service = new LeaderboardService(progress);
    await service.registerDefinition({
        ...definition,
        minimumCohortSize: 1,
        criteria: [definition.criteria[0]],
    });
    for (const participant of ["alice", "bob", "carol"]) {
        await service.setParticipation(participant, "weekly", {
            optedIn: true,
        });
        await service.submitObservation(actor(participant), {
            id: `tie-${participant}`,
            definitionId: "weekly",
            participantId: participant,
            criterionId: "accuracy",
            value: 100,
            observedAt: "2026-09-07T00:00:00Z",
            evidenceEventIds: [participant[0]],
            seasonId: "s1",
        });
    }
    const result = await service.queryStandings({
        definitionId: "weekly",
        viewerId: "alice",
    });
    assert.deepEqual(
        result.rows.map(({ rank }) => rank),
        [1, 1, 1],
    );
});

test("persisted competitive state can be restored after restart", async () => {
    let saved: import("../store.js").LeaderboardState | undefined;
    const service = new LeaderboardService(
        progress,
        () => true,
        undefined,
        undefined,
        undefined,
        async (state) => {
            saved = state;
        },
    );
    await service.registerDefinition({
        ...definition,
        minimumCohortSize: 1,
        criteria: [definition.criteria[0]],
    });
    await service.setParticipation("alice", "weekly", { optedIn: true });
    await service.submitObservation(actor("alice"), {
        id: "persisted",
        definitionId: "weekly",
        participantId: "alice",
        criterionId: "accuracy",
        value: 42,
        observedAt: "2026-09-02T00:00:00Z",
        evidenceEventIds: ["a"],
        seasonId: "s1",
    });
    const restarted = new LeaderboardService(progress);
    restarted.restoreState(saved!);
    assert.equal(restarted.listDefinitions().length, 1);
    assert.equal(
        (
            await restarted.queryStandings({
                definitionId: "weekly",
                viewerId: "alice",
            })
        ).rows[0].score[0],
        -42,
    );
});

test("a failed leaderboard save does not poison future writes and retrying the observation persists it", async () => {
    let rejectObservation = true;
    let saved: import("../store.js").LeaderboardState | undefined;
    const errors: unknown[] = [];
    const service = new LeaderboardService(
        progress,
        () => true,
        undefined,
        undefined,
        (level, _message, metadata) => {
            if (level === "error") errors.push(metadata);
        },
        async (state) => {
            if (state.observations.length && rejectObservation)
                throw new Error("database_unavailable");
            saved = state;
        },
    );
    await service.registerDefinition({
        ...definition,
        minimumCohortSize: 1,
        criteria: [definition.criteria[0]],
    });
    await service.setParticipation("alice", "weekly", { optedIn: true });
    const observation = {
        id: "retry",
        definitionId: "weekly",
        participantId: "alice",
        criterionId: "accuracy",
        value: 100,
        observedAt: "2026-09-01T00:00:00.000Z",
        evidenceEventIds: ["a"],
        seasonId: "s1",
    };
    await assert.rejects(
        service.submitObservation(actor("alice"), observation),
        /database_unavailable/,
    );
    assert.equal(
        (
            await service.queryStandings({
                definitionId: "weekly",
                viewerId: "alice",
                seasonId: "s1",
            })
        ).total,
        0,
    );
    rejectObservation = false;
    await service.setParticipation("bob", "weekly", { optedIn: true });
    assert.equal(saved?.observations.length, 0);

    await service.submitObservation(actor("alice"), observation);
    assert.equal(saved?.observations.length, 1);
    assert.equal(errors.length, 1);
});

test("metadata saves propagate failure, roll back unpublished changes and remain retryable", async () => {
    let reject = true;
    const service = new LeaderboardService(
        progress,
        () => true,
        undefined,
        undefined,
        () => {},
        async () => {
            if (reject) throw new Error("storage_failed");
        },
    );
    await assert.rejects(
        service.registerDefinition(definition),
        /storage_failed/,
    );
    assert.deepEqual(service.listDefinitions(), []);
    reject = false;
    await service.registerDefinition(definition);
    reject = true;
    await assert.rejects(
        service.assignCohort("alice", "weekly", "red"),
        /storage_failed/,
    );
    assert.equal(service.resolveCohort(actor("alice"), "weekly"), undefined);
    await assert.rejects(
        service.setParticipation("alice", "weekly", { optedIn: true }),
        /storage_failed/,
    );
    assert.equal(
        await service.canAccessDefinition(actor("alice"), "weekly"),
        false,
    );
    reject = false;
    await service.assignCohort("alice", "weekly", "red");
    await service.setParticipation("alice", "weekly", { optedIn: true });
    assert.equal(
        await service.canAccessDefinition(actor("alice"), "weekly", "red"),
        true,
    );
});

test("rollover rebuilds final rankings after restart and persists cohort changes atomically", async () => {
    let saved: import("../store.js").LeaderboardState | undefined;
    const original = new LeaderboardService(
        progress,
        () => true,
        undefined,
        undefined,
        undefined,
        async (state) => {
            saved = state;
        },
    );
    await original.registerDefinition({
        ...definition,
        criteria: [definition.criteria[0]],
        promotion: { count: 1, targetCohortId: "upper" },
        relegation: { count: 1, targetCohortId: "lower" },
    });
    for (const [participantId, evidence, value] of [
        ["alice", "a", 90],
        ["bob", "b", 60],
    ] as const) {
        await original.setParticipation(participantId, "weekly", {
            optedIn: true,
            alias: participantId,
        });
        await original.submitObservation(actor(participantId), {
            id: participantId,
            definitionId: "weekly",
            participantId,
            criterionId: "accuracy",
            value,
            observedAt: "2026-09-01T00:00:00.000Z",
            evidenceEventIds: [evidence],
            seasonId: "s1",
        });
    }
    let fail = true;
    const restarted = new LeaderboardService(
        progress,
        () => true,
        undefined,
        undefined,
        undefined,
        async (state) => {
            if (fail) throw new Error("unavailable");
            saved = state;
        },
    );
    restarted.restoreState(saved!);
    const next = {
        id: "s2",
        startsAt: "2026-09-08T00:00:00Z",
        endsAt: "2026-09-15T00:00:00Z",
    };
    await assert.rejects(restarted.rollover("weekly", next), /unavailable/);
    assert.equal(restarted.listDefinitions()[0].season?.id, "s1");
    assert.equal(restarted.archivedResults("weekly").length, 0);
    fail = false;
    await restarted.rollover("weekly", next);
    assert.deepEqual(
        restarted
            .archivedResults("weekly")[0]
            .rows.map((row) => row.participant.alias),
        ["alice", "bob"],
    );
    assert.deepEqual(
        saved?.cohorts.map(([, cohort]) => cohort),
        ["upper", "lower"],
    );
});

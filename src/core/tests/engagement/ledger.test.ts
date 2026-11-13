import assert from "node:assert/strict";
import test from "node:test";
import {
    createCtx,
    registerEngagementCapabilities,
    MemoryEngagementStore,
} from "../../index.js";
import type {
    ActivityScoreInput,
    FlowRunResult,
    EngagementStore,
} from "../../index.js";

const activity: ActivityScoreInput = {
    activityId: "attempt-one",
    participantId: "learner",
    providerId: "study",
    events: [
        {
            id: "event-one",
            activityType: "drawing",
            correct: true,
            independentCorrect: true,
            hints: 0,
            durationMs: 1200,
        },
    ],
    difficulty: 1,
    completedAt: "2026-10-19T07:00:00.000Z",
    repeatKey: "card-one",
};

function fixture(store: EngagementStore = new MemoryEngagementStore()) {
    const ctx = createCtx();
    const capabilities = registerEngagementCapabilities(ctx, () => store);
    capabilities.achievements.register({
        id: "independent",
        providerId: "study",
        difficulty: "normal",
        title: { en: "Independent" },
        description: { en: "Independent practice" },
        icon: "/award.svg",
        evaluate: (input) =>
            input.events.every(({ independentCorrect }) => independentCorrect),
    });
    const record = ctx.requireCapability<
        (input: ActivityScoreInput) => Promise<FlowRunResult>
    >("engagement:recordActivity");
    return { ctx, ...capabilities, record };
}

function nextActivity(id: string): ActivityScoreInput {
    return {
        ...structuredClone(activity),
        activityId: id,
        events: [{ ...activity.events[0], id }],
    };
}

function booster(state: ReturnType<typeof fixture>): void {
    state.scoring.redeemBooster("learner", {
        id: "boost",
        multiplier: 2,
        startsAt: "2026-10-19T00:00:00Z",
        endsAt: "2026-10-20T00:00:00Z",
        source: "booster",
        consumable: true,
    });
}

test("concurrent replay settles one XP receipt, one booster use and one immutable achievement", async () => {
    const state = fixture();
    booster(state);
    const results = await Promise.all([
        state.record(activity),
        state.record(activity),
    ]);
    assert.deepEqual(
        results[0].stageResults.score,
        results[1].stageResults.score,
    );
    const summary = await state.ledger.summary("learner");
    assert.equal(summary.activities, 1);
    assert.equal(summary.xp, 26);
    assert.equal(summary.achievements.length, 1);
    state.scoring.setDefaultWeight("drawing", 2);
    const replay = await state.record(activity);
    assert.deepEqual(replay.stageResults.score, results[0].stageResults.score);
    await state.record(nextActivity("second"));
    assert.equal((await state.ledger.summary("learner")).activities, 2);
    assert.equal(
        (await state.ledger.summary("learner")).achievements.length,
        1,
    );
});

test("failed persistence leaves boosters and achievements available for a successful retry", async () => {
    const backing = new MemoryEngagementStore();
    let fail = true;
    const state = fixture({
        read: (id) => backing.read(id),
        commit: async (...args) => {
            if (fail) throw new Error("storage_unavailable");
            await backing.commit(...args);
        },
    });
    booster(state);
    await assert.rejects(state.record(activity), /storage_unavailable/);
    assert.equal((await state.ledger.summary("learner")).xp, 0);
    assert.equal(state.achievements.list("learner").length, 0);
    fail = false;
    await state.record(activity);
    assert.equal((await state.ledger.summary("learner")).xp, 26);
});

test("receipts restore XP, achievements and personal bests after the host restarts", async () => {
    const store = new MemoryEngagementStore();
    const first = fixture(store);
    await first.record(activity);
    const expected = await first.ledger.summary("learner");
    const restarted = fixture(store);
    assert.deepEqual(await restarted.ledger.summary("learner"), expected);
    assert.equal(
        restarted.scoring.personalBest("learner", "drawing")?.xp,
        expected.xp,
    );
    assert.equal(restarted.achievements.list("learner").length, 1);
    assert.equal(
        Object.isFrozen(restarted.achievements.list("learner")[0].title),
        true,
    );
    await restarted.record(activity);
    assert.deepEqual(await restarted.ledger.summary("learner"), expected);
});

test("a failure after commit retries publication without another XP or booster award", async () => {
    const state = fixture();
    booster(state);
    state.ctx.flow.extend(
        "engagement:scoreActivity",
        "publish",
        { id: "test:publication" },
        () => {
            throw new Error("publication_unavailable");
        },
    );
    await assert.rejects(state.record(activity), /publication_unavailable/);
    state.ctx.removeFlowStageHook(
        "engagement:scoreActivity",
        "publish",
        "test:publication",
    );
    await state.record(activity);
    assert.equal((await state.ledger.summary("learner")).xp, 26);
});

test("the same activity cannot change and evidence cannot mint a second receipt", async () => {
    const state = fixture();
    await state.record({ ...activity, basePoints: undefined });
    await state.record({ ...activity, basePoints: undefined });
    await assert.rejects(
        state.record({ ...activity, difficulty: 2 }),
        /engagement_activity_conflict/,
    );
    await assert.rejects(
        state.record({ ...activity, activityId: "another" }),
        /engagement_evidence_already_scored/,
    );
});

test("corrections invalidate XP and badge projections without rewriting the original receipt", async () => {
    const store = new MemoryEngagementStore();
    const state = fixture(store);
    await state.record(activity);
    const original = (await store.read("learner")).state.receipts[0];
    await state.ledger.invalidate("learner", "study", "attempt-one");
    await state.ledger.invalidate("learner", "study", "attempt-one");
    assert.deepEqual(await state.ledger.summary("learner"), {
        xp: 0,
        activities: 0,
        achievements: [],
    });
    assert.deepEqual((await store.read("learner")).state.receipts[0], original);
    await state.record(nextActivity("corrected-practice"));
    assert.equal(
        (await state.ledger.summary("learner")).achievements.length,
        1,
    );
});

test("independent writers detect revision conflicts instead of losing another worker's rewards", async () => {
    const store = new MemoryEngagementStore();
    const first = fixture(store);
    const second = fixture(store);
    const results = await Promise.allSettled([
        first.record(activity),
        second.record(nextActivity("other-worker")),
    ]);
    assert.equal(
        results.filter(({ status }) => status === "fulfilled").length,
        1,
    );
    const failure = results.find((result) => result.status === "rejected");
    assert.match(String(failure?.reason), /engagement_state_conflict/);
    await first.record(activity);
    await second.record(nextActivity("other-worker"));
    assert.equal((await first.ledger.summary("learner")).activities, 2);
});

test("durably redeemed boosters survive restart and are consumed by one settled activity", async () => {
    const store = new MemoryEngagementStore();
    const original = fixture(store);
    const modifier = {
        id: "persisted-boost",
        multiplier: 2,
        startsAt: "2026-10-19T00:00:00Z",
        endsAt: "2026-10-20T00:00:00Z",
        source: "booster" as const,
        consumable: true,
    };
    await original.ledger.redeemBooster("learner", modifier);
    await original.ledger.redeemBooster("learner", modifier);
    const restarted = fixture(store);
    const first = await restarted.record(activity);
    assert.equal((first.stageResults.score[0] as { xp: number }).xp, 26);
    const next = await restarted.record(nextActivity("later"));
    assert.deepEqual(
        (next.stageResults.score[0] as { appliedModifiers: unknown[] })
            .appliedModifiers,
        [],
    );
    await assert.rejects(
        restarted.ledger.redeemBooster("learner", {
            ...modifier,
            multiplier: 3,
        }),
        /engagement_booster_conflict/,
    );
});

test("ledger reads, booster redemption and invalidation execute their registered validation stages", async () => {
    const state = fixture();
    const observed: string[] = [];
    for (const action of ["summary", "redeemBooster", "invalidate"])
        for (const stage of ["validate", "execute"])
            state.ctx.flow.extend(
                `engagement:ledger:${action}`,
                stage,
                { id: `test:${action}:${stage}` },
                () => {
                    observed.push(`${action}:${stage}`);
                },
            );
    await state.ledger.summary("learner");
    await state.ledger.redeemBooster("learner", {
        id: "staged",
        multiplier: 2,
        startsAt: "2026-10-19T00:00:00Z",
        endsAt: "2026-10-20T00:00:00Z",
        source: "booster",
        consumable: true,
    });
    await state.ledger.invalidate("learner", "study", "missing");
    assert.deepEqual(observed, [
        "summary:validate",
        "summary:execute",
        "redeemBooster:validate",
        "redeemBooster:execute",
        "invalidate:validate",
        "invalidate:execute",
    ]);
    await assert.rejects(
        state.ledger.summary("bad\u0000actor"),
        /invalid_participant_id/,
    );
});

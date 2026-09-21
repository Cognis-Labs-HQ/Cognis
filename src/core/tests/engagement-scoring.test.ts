import test from "node:test";
import assert from "node:assert/strict";
import {
    AchievementRegistry,
    createCtx,
    registerEngagementCapabilities,
    ScoringEngine,
} from "../index.js";

const activity = {
    activityId: "flashcards-1",
    participantId: "learner",
    providerId: "study-language-ja",
    events: Array.from({ length: 20 }, (_, index) => ({
        id: `event-${index}`,
        activityType: "flashcardReading",
        correct: index < 18,
        independentCorrect: index < 16,
        hints: index < 16 ? 0 : 1,
        durationMs: 2_000,
    })),
    difficulty: 2,
    firstCompletion: true,
    completedAt: "2026-09-22T12:00:00.000Z",
    completionTargetMs: { fast: 45_000, slow: 90_000 },
    scopes: { language: "ja", activity: "flashcards" },
};

test("scoring combines provider difficulty, fallback weights, events, and scoped modifiers", () => {
    const scoring = new ScoringEngine();
    scoring.setDefaultWeight("flashcardReading", 1.1);
    scoring.registerModifier({
        id: "japanese-tuesday",
        multiplier: 2,
        startsAt: "2026-09-22T00:00:00.000Z",
        endsAt: "2026-09-22T23:59:59.999Z",
        scopes: { language: "ja" },
        source: "provider",
    });
    scoring.registerModifier({
        id: "global-flashcards",
        multiplier: 1.5,
        startsAt: "2026-09-22T11:30:00.000Z",
        endsAt: "2026-09-22T12:30:00.000Z",
        scopes: { activity: "flashcards" },
        source: "event",
    });
    scoring.redeemBooster("learner", {
        id: "learner-boost",
        multiplier: 1.25,
        startsAt: "2026-09-22T11:00:00.000Z",
        endsAt: "2026-09-22T13:00:00.000Z",
        source: "booster",
        consumable: true,
    });
    const score = scoring.score(activity);
    assert.equal(score.completion, "fast");
    assert.deepEqual(
        score.appliedModifiers.map(({ id }) => id),
        ["japanese-tuesday", "global-flashcards", "learner-boost"],
    );
    assert.equal(score.xp, Math.round(score.baseXp * 2 * 1.5 * 1.25));
    assert.equal(
        scoring.personalBest("learner", "flashcardReading")?.xp,
        score.xp,
    );
    assert.equal(
        scoring
            .score({ ...activity, activityId: "flashcards-2" })
            .appliedModifiers.some(({ id }) => id === "learner-boost"),
        false,
    );
});

test("repeat scoring uses a discrete reduced rate instead of continuous decay", () => {
    const scoring = new ScoringEngine();
    const first = scoring.score({ ...activity, firstCompletion: false });
    const repeat = scoring.score({
        ...activity,
        activityId: "repeat",
        firstCompletion: false,
        repeated: true,
    });
    assert.equal(repeat.xp, Math.round(first.xp * 0.5));
});

test("achievements are difficulty-ranked immutable evidence-backed badges", () => {
    const scoring = new ScoringEngine();
    const achievements = new AchievementRegistry();
    achievements.register({
        id: "flawless-flashcards",
        providerId: "study-language-ja",
        difficulty: "rare",
        title: { en: "Flawless Flashcards" },
        description: { en: "Complete a set without a mistake." },
        icon: "spark",
        evaluate: (input) => input.events.every(({ correct }) => correct),
    });
    const flawless = {
        ...activity,
        events: activity.events.map((event) => ({
            ...event,
            correct: true,
        })),
    };
    const score = scoring.score(flawless);
    const [award] = achievements.evaluate(flawless, score);
    assert.equal(award.difficulty, "rare");
    assert.equal(Object.isFrozen(award), true);
    assert.equal(achievements.evaluate(flawless, score).length, 0);
    assert.equal(achievements.list("learner").length, 1);
});

test("engagement registration exposes provider capabilities and composes flows", async () => {
    const ctx = createCtx();
    registerEngagementCapabilities(ctx);
    assert.deepEqual(ctx.listPublicCapabilities(), [
        "engagement:achievements",
        "engagement:recordActivity",
        "engagement:scoring",
    ]);
    const achievements = ctx.requireCapability<AchievementRegistry>(
        "engagement:achievements",
    );
    achievements.register({
        id: "first-set",
        providerId: "study-language-ja",
        difficulty: "normal",
        title: { en: "First Set" },
        description: { en: "Complete an activity." },
        icon: "award",
        evaluate: () => true,
    });
    const record = ctx.requireCapability<
        (input: typeof activity) => Promise<{
            stageResults: Record<string, unknown[]>;
        }>
    >("engagement:recordActivity");
    const result = await record(activity);
    assert.equal(result.stageResults.score.length, 1);
    assert.equal(achievements.list("learner").length, 1);
});

test("scoring rejects ambiguous evidence and penalizes hints", () => {
    const scoring = new ScoringEngine();
    const noHints = scoring.score({
        ...activity,
        firstCompletion: false,
        events: activity.events.map((event) => ({ ...event, hints: 0 })),
    });
    const hints = scoring.score({ ...activity, firstCompletion: false });
    assert.ok(hints.baseXp < noHints.baseXp);
    assert.throws(
        () =>
            scoring.score({
                ...activity,
                events: activity.events.map((event) => ({
                    ...event,
                    id: "duplicate",
                })),
            }),
        /invalid_activity_score_input/,
    );
});

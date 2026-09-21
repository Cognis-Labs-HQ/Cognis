import type { Ctx } from "../../ctx/types.js";

export const ENGAGEMENT_SCORING_CAPABILITY = "engagement:scoring";
export const ENGAGEMENT_ACHIEVEMENTS_CAPABILITY = "engagement:achievements";
export const ENGAGEMENT_RECORD_ACTIVITY_CAPABILITY =
    "engagement:recordActivity";

export type AchievementDifficulty = "normal" | "rare" | "legendary";

export interface ScoringEvent {
    id: string;
    activityType: string;
    correct: boolean;
    independentCorrect: boolean;
    hints: number;
    durationMs: number;
}

export interface ActivityScoreInput {
    activityId: string;
    participantId: string;
    providerId: string;
    events: readonly ScoringEvent[];
    difficulty: number;
    basePoints?: number;
    activityWeight?: number;
    firstCompletion?: boolean;
    repeated?: boolean;
    completedAt: string;
    completionTargetMs?: { fast: number; slow: number };
    scopes?: Readonly<Record<string, string>>;
}

export interface ScoreModifier {
    id: string;
    multiplier: number;
    startsAt: string;
    endsAt: string;
    scopes?: Readonly<Record<string, string>>;
    source: "core" | "provider" | "event" | "booster";
    consumable?: boolean;
}

export interface ActivityScore {
    xp: number;
    baseXp: number;
    completion: "fast" | "standard" | "slow";
    appliedModifiers: readonly { id: string; multiplier: number }[];
}

export interface ScoringCapability {
    setDefaultWeight(activityType: string, weight: number): void;
    registerModifier(modifier: ScoreModifier): void;
    redeemBooster(participantId: string, modifier: ScoreModifier): void;
    score(input: ActivityScoreInput, now?: string): ActivityScore;
    personalBest(
        participantId: string,
        activityType: string,
    ): ActivityScore | null;
}

export interface AchievementDefinition {
    id: string;
    providerId: string;
    difficulty: AchievementDifficulty;
    title: Readonly<Record<string, string>>;
    description: Readonly<Record<string, string>>;
    icon: string;
    evaluate(input: ActivityScoreInput, score: ActivityScore): boolean;
}

export interface AchievementAward {
    definitionId: string;
    participantId: string;
    awardedAt: string;
    evidenceEventIds: readonly string[];
    difficulty: AchievementDifficulty;
    title: Readonly<Record<string, string>>;
    description: Readonly<Record<string, string>>;
    icon: string;
}

export interface AchievementCapability {
    register(definition: AchievementDefinition): void;
    evaluate(
        input: ActivityScoreInput,
        score: ActivityScore,
    ): readonly AchievementAward[];
    list(participantId: string): readonly AchievementAward[];
}

const validNumber = (value: number, minimum = 0) =>
    Number.isFinite(value) && value >= minimum;

const within = (value: number, minimum: number, maximum: number) =>
    validNumber(value, minimum) && value <= maximum;

function matchesScopes(
    required: Readonly<Record<string, string>> | undefined,
    actual: Readonly<Record<string, string>> | undefined,
) {
    return Object.entries(required ?? {}).every(
        ([key, value]) => actual?.[key] === value,
    );
}

export class ScoringEngine implements ScoringCapability {
    private readonly weights = new Map<string, number>();
    private readonly modifiers = new Map<string, ScoreModifier>();
    private readonly boosters = new Map<string, Map<string, ScoreModifier>>();
    private readonly bests = new Map<string, ActivityScore>();

    setDefaultWeight(activityType: string, weight: number) {
        if (!activityType.trim() || !within(weight, 0.01, 10))
            throw new Error("invalid_activity_weight");
        this.weights.set(activityType, weight);
    }

    registerModifier(modifier: ScoreModifier) {
        if (
            !modifier.id.trim() ||
            !within(modifier.multiplier, 0.01, 10) ||
            !Number.isFinite(Date.parse(modifier.startsAt)) ||
            !Number.isFinite(Date.parse(modifier.endsAt)) ||
            Date.parse(modifier.startsAt) >= Date.parse(modifier.endsAt)
        )
            throw new Error("invalid_score_modifier");
        this.modifiers.set(modifier.id, structuredClone(modifier));
    }

    redeemBooster(participantId: string, modifier: ScoreModifier) {
        if (modifier.source !== "booster" || modifier.consumable !== true)
            throw new Error("invalid_booster");
        this.registerModifier(modifier);
        this.modifiers.delete(modifier.id);
        const participantBoosters =
            this.boosters.get(participantId) ?? new Map();
        participantBoosters.set(modifier.id, structuredClone(modifier));
        this.boosters.set(participantId, participantBoosters);
    }

    score(input: ActivityScoreInput, now = input.completedAt): ActivityScore {
        if (
            !input.events.length ||
            input.events.length > 10_000 ||
            !input.activityId.trim() ||
            !input.participantId.trim() ||
            !input.providerId.trim() ||
            !within(input.difficulty, 0.1, 10) ||
            !Number.isFinite(Date.parse(input.completedAt)) ||
            !Number.isFinite(Date.parse(now)) ||
            new Set(input.events.map(({ id }) => id)).size !==
                input.events.length ||
            input.events.some(
                ({ id, activityType, hints, durationMs }) =>
                    !id.trim() ||
                    !activityType.trim() ||
                    !Number.isInteger(hints) ||
                    hints < 0 ||
                    !validNumber(durationMs),
            ) ||
            (input.activityWeight !== undefined &&
                !within(input.activityWeight, 0.01, 10)) ||
            (input.basePoints !== undefined &&
                !within(input.basePoints, 0.01, 1_000_000)) ||
            (input.completionTargetMs !== undefined &&
                (!validNumber(input.completionTargetMs.fast, 1) ||
                    !validNumber(input.completionTargetMs.slow, 1) ||
                    input.completionTargetMs.slow <
                        input.completionTargetMs.fast))
        )
            throw new Error("invalid_activity_score_input");
        const duration = input.events.reduce(
            (sum, event) => sum + event.durationMs,
            0,
        );
        const targets = input.completionTargetMs;
        const completion = targets
            ? duration <= targets.fast
                ? "fast"
                : duration >= targets.slow
                  ? "slow"
                  : "standard"
            : "standard";
        const correct = input.events.filter((event) => event.correct).length;
        const independent = input.events.filter(
            (event) => event.independentCorrect,
        ).length;
        const defaultWeight =
            input.events.reduce(
                (sum, event) =>
                    sum + (this.weights.get(event.activityType) ?? 1),
                0,
            ) / input.events.length;
        const accuracy = correct / input.events.length;
        const independence = independent / input.events.length;
        const averageHints =
            input.events.reduce((sum, event) => sum + event.hints, 0) /
            input.events.length;
        const hintFactor = 1 / (1 + averageHints * 0.1);
        const baseXp = Math.max(
            1,
            Math.round(
                (input.basePoints ?? input.events.length * 10) *
                    (input.activityWeight ?? defaultWeight) *
                    input.difficulty *
                    (0.5 + accuracy * 0.35 + independence * 0.15) *
                    hintFactor *
                    (input.firstCompletion ? 1.25 : 1) *
                    (input.repeated ? 0.5 : 1) *
                    (completion === "fast"
                        ? 1.15
                        : completion === "slow"
                          ? 0.9
                          : 1),
            ),
        );
        const timestamp = Date.parse(now);
        const candidates = [
            ...this.modifiers.values(),
            ...(this.boosters.get(input.participantId)?.values() ?? []),
        ];
        const applied = candidates.filter(
            (modifier, index, all) =>
                all.findIndex((item) => item.id === modifier.id) === index &&
                Date.parse(modifier.startsAt) <= timestamp &&
                Date.parse(modifier.endsAt) >= timestamp &&
                matchesScopes(modifier.scopes, input.scopes),
        );
        const experiencePoints = Math.max(
            1,
            Math.round(
                applied.reduce(
                    (value, modifier) => value * modifier.multiplier,
                    baseXp,
                ),
            ),
        );
        for (const modifier of applied) {
            if (modifier.source === "booster" && modifier.consumable) {
                this.boosters.get(input.participantId)?.delete(modifier.id);
            }
        }
        const result = {
            xp: experiencePoints,
            baseXp,
            completion,
            appliedModifiers: applied.map(({ id, multiplier }) => ({
                id,
                multiplier,
            })),
        } as const;
        const activityType = input.events[0].activityType;
        const key = `${input.participantId}\0${activityType}`;
        if ((this.bests.get(key)?.xp ?? -1) < experiencePoints)
            this.bests.set(key, result);
        return structuredClone(result);
    }

    personalBest(participantId: string, activityType: string) {
        return structuredClone(
            this.bests.get(`${participantId}\0${activityType}`) ?? null,
        );
    }
}

export interface EngagementCapabilities {
    scoring: ScoringCapability;
    achievements: AchievementCapability;
}

/** Registers the public engagement capabilities and their staged orchestration flows. */
export function registerEngagementCapabilities(
    ctx: Ctx,
): EngagementCapabilities {
    const scoring = new ScoringEngine();
    const achievements = new AchievementRegistry();
    ctx.registerFlow({
        id: "engagement:scoreActivity",
        description: "Score a completed collection of learning events.",
        stages: ["validate", "score", "achievements", "publish"],
    });
    ctx.registerFlow({
        id: "engagement:evaluateAchievements",
        description:
            "Evaluate immutable achievement awards for scored activity.",
        stages: ["collect", "evaluate", "award"],
    });
    ctx.flow.extend(
        "engagement:scoreActivity",
        "score",
        { id: "core-engagement:score" },
        ({ input }) => scoring.score(input as ActivityScoreInput),
    );
    ctx.flow.extend(
        "engagement:evaluateAchievements",
        "evaluate",
        { id: "core-engagement:evaluate" },
        ({ input }) => {
            const { activity, score } = input as {
                activity: ActivityScoreInput;
                score: ActivityScore;
            };
            return achievements.evaluate(activity, score);
        },
    );
    ctx.flow.extend(
        "engagement:scoreActivity",
        "achievements",
        { id: "core-engagement:achievements" },
        async ({ input, stageResults }) =>
            ctx.flow.run("engagement:evaluateAchievements", {
                activity: input,
                score: stageResults.score?.[0] as ActivityScore,
            }),
    );
    ctx.contributePublicCapability(ENGAGEMENT_SCORING_CAPABILITY, scoring);
    ctx.contributePublicCapability(
        ENGAGEMENT_ACHIEVEMENTS_CAPABILITY,
        achievements,
    );
    ctx.contributePublicCapability(
        ENGAGEMENT_RECORD_ACTIVITY_CAPABILITY,
        (input: ActivityScoreInput) =>
            ctx.flow.run("engagement:scoreActivity", input),
    );
    return { scoring, achievements };
}

export class AchievementRegistry implements AchievementCapability {
    private readonly definitions = new Map<string, AchievementDefinition>();
    private readonly awards = new Map<string, AchievementAward>();

    register(definition: AchievementDefinition) {
        if (this.definitions.has(definition.id))
            throw new Error("achievement_definition_exists");
        this.definitions.set(definition.id, definition);
    }

    evaluate(input: ActivityScoreInput, score: ActivityScore) {
        const awarded: AchievementAward[] = [];
        for (const definition of this.definitions.values()) {
            const key = `${input.participantId}\0${definition.id}`;
            if (this.awards.has(key) || !definition.evaluate(input, score))
                continue;
            const award: AchievementAward = Object.freeze({
                definitionId: definition.id,
                participantId: input.participantId,
                awardedAt: input.completedAt,
                evidenceEventIds: Object.freeze(
                    input.events.map(({ id }) => id),
                ),
                difficulty: definition.difficulty,
                title: Object.freeze({ ...definition.title }),
                description: Object.freeze({ ...definition.description }),
                icon: definition.icon,
            });
            this.awards.set(key, award);
            awarded.push(award);
        }
        return awarded;
    }

    list(participantId: string) {
        return [...this.awards.values()].filter(
            (award) => award.participantId === participantId,
        );
    }
}

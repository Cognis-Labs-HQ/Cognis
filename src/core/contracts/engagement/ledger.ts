import { isDeepStrictEqual } from "node:util";
import type { Ctx, FlowRunResult } from "../../ctx/types.js";
import type {
    ActivityScoreInput,
    ScoringEngine,
    AchievementRegistry,
    ActivityScore,
    AchievementAward,
    ScoreModifier,
} from "./scoring.js";
import {
    activityKey,
    type EngagementStore,
    type EngagementReceipt,
    type EngagementSnapshot,
} from "./ledger-store.js";

export interface EngagementSummary {
    xp: number;
    activities: number;
    achievements: readonly AchievementAward[];
}

export interface EngagementLedgerCapability {
    redeemBooster(
        participantId: string,
        modifier: ScoreModifier,
    ): Promise<void>;
    summary(participantId: string): Promise<EngagementSummary>;
    invalidate(
        participantId: string,
        providerId: string,
        activityId: string,
    ): Promise<void>;
}

interface LedgerFlowData extends Record<string, unknown> {
    snapshot: EngagementSnapshot;
    store: EngagementStore;
    receipt?: EngagementReceipt;
    score?: ActivityScore;
    awards?: readonly AchievementAward[];
    duplicate?: boolean;
}

function activeReceipts(snapshot: EngagementSnapshot): EngagementReceipt[] {
    const invalid = new Set(snapshot.state.invalid);
    return snapshot.state.receipts.filter(
        ({ activity }) => !invalid.has(activityKey(activity)),
    );
}

/** Durably settle a scored activity before publishing it to downstream consumers. */
export function registerEngagementLedger(
    ctx: Ctx,
    scoring: ScoringEngine,
    achievements: AchievementRegistry,
    resolveStore: () => EngagementStore,
): {
    record: (input: ActivityScoreInput) => Promise<FlowRunResult>;
    ledger: EngagementLedgerCapability;
} {
    const pending = new Map<string, Promise<unknown>>();
    const serialize = async <Result>(
        participantId: string,
        operation: () => Promise<Result>,
    ): Promise<Result> => {
        const previous = pending.get(participantId) ?? Promise.resolve();
        const current = previous.then(operation, operation);
        pending.set(participantId, current);
        try {
            return await current;
        } finally {
            if (pending.get(participantId) === current)
                pending.delete(participantId);
        }
    };
    const hydrate = (participantId: string, snapshot: EngagementSnapshot) => {
        const receipts = activeReceipts(snapshot);
        scoring.restoreParticipant(
            participantId,
            receipts,
            snapshot.state.boosters,
        );
        achievements.restoreParticipant(
            participantId,
            receipts.flatMap(({ awards }) => awards),
        );
    };
    ctx.registerFlow({
        id: "engagement:scoreActivity",
        description:
            "Validate, settle and publish an evidence-backed activity receipt.",
        stages: ["validate", "score", "achievements", "persist", "publish"],
    });
    ctx.registerFlow({
        id: "engagement:evaluateAchievements",
        description:
            "Evaluate achievement definitions against scored evidence.",
        stages: ["collect", "evaluate", "award"],
    });
    ctx.flow.extend(
        "engagement:scoreActivity",
        "validate",
        { id: "core-engagement:validate" },
        async ({ input, data }) => {
            const activity = input as ActivityScoreInput;
            if (
                !activity?.participantId ||
                /[\u0000-\u001f]/.test(activity.participantId)
            )
                throw new Error("invalid_activity_score_input");
            const store = resolveStore();
            const snapshot = await store.read(activity.participantId);
            const previous = snapshot.state.receipts.find(
                ({ activity: existing }) =>
                    activityKey(existing) === activityKey(activity),
            );
            if (
                previous &&
                !isDeepStrictEqual(
                    previous.activity,
                    JSON.parse(JSON.stringify(activity)),
                )
            )
                throw new Error("engagement_activity_conflict");
            if (!previous) {
                const usedEvidence = new Set(
                    snapshot.state.receipts.flatMap(({ activity }) =>
                        activity.events.map(({ id }) => id),
                    ),
                );
                if (activity.events?.some(({ id }) => usedEvidence.has(id)))
                    throw new Error("engagement_evidence_already_scored");
            }
            Object.assign(data, {
                store,
                snapshot,
                receipt: previous,
                duplicate: !!previous,
            });
        },
    );
    ctx.flow.extend(
        "engagement:scoreActivity",
        "score",
        { id: "core-engagement:score" },
        ({ input, data }) => {
            const state = data as LedgerFlowData;
            const activity = input as ActivityScoreInput;
            const repeated = activity.repeatKey
                ? activeReceipts(state.snapshot).some(
                      ({ activity: previous }) =>
                          previous.providerId === activity.providerId &&
                          previous.repeatKey === activity.repeatKey,
                  )
                : undefined;
            const scoredActivity =
                repeated === undefined
                    ? activity
                    : {
                          ...activity,
                          firstCompletion: !repeated,
                          repeated,
                      };
            state.score =
                state.receipt?.score ??
                scoring
                    .forkParticipant(
                        activity.participantId,
                        state.snapshot.state.receipts,
                        state.snapshot.state.boosters,
                    )
                    .score(scoredActivity);
            return state.score;
        },
    );
    ctx.flow.extend(
        "engagement:evaluateAchievements",
        "evaluate",
        { id: "core-engagement:evaluate" },
        ({ input, data }) => {
            const value = input as {
                activity: ActivityScoreInput;
                score: ActivityScore;
            };
            const state = data as { previous?: readonly AchievementAward[] };
            const evaluator = achievements.forkParticipant(
                value.activity.participantId,
                state.previous ?? [],
            );
            return evaluator.evaluate(value.activity, value.score);
        },
    );
    ctx.flow.extend(
        "engagement:scoreActivity",
        "achievements",
        { id: "core-engagement:achievements" },
        async ({ input, data }) => {
            const state = data as LedgerFlowData;
            if (state.receipt) {
                state.awards = state.receipt.awards;
                return state.awards;
            }
            const result = await ctx.flow.run(
                "engagement:evaluateAchievements",
                {
                    activity: input,
                    score: state.score,
                },
                {
                    data: {
                        previous: activeReceipts(state.snapshot).flatMap(
                            ({ awards }) => awards,
                        ),
                    },
                },
            );
            state.awards = result.stageResults
                .evaluate?.[0] as readonly AchievementAward[];
            return state.awards;
        },
    );
    ctx.flow.extend(
        "engagement:scoreActivity",
        "persist",
        { id: "core-engagement:persist" },
        async ({ input, data }) => {
            const state = data as LedgerFlowData;
            if (!state.receipt) {
                state.receipt = structuredClone({
                    activity: JSON.parse(
                        JSON.stringify(input),
                    ) as ActivityScoreInput,
                    score: state.score!,
                    awards: state.awards!,
                });
                state.snapshot.state.receipts.push(state.receipt);
                await state.store.commit(
                    state.receipt.activity.participantId,
                    state.snapshot.revision,
                    state.snapshot.state,
                );
            }
            return state.receipt;
        },
    );
    ctx.flow.extend(
        "engagement:scoreActivity",
        "publish",
        { id: "core-engagement:publish", order: -100 },
        ({ input, data }) => {
            hydrate(
                (input as ActivityScoreInput).participantId,
                (data as LedgerFlowData).snapshot,
            );
        },
    );
    const operations: EngagementLedgerCapability = {
        async redeemBooster(participantId, modifier) {
            await serialize(participantId, async () => {
                const store = resolveStore();
                const snapshot = await store.read(participantId);
                const existing = snapshot.state.boosters.find(
                    ({ id }) => id === modifier.id,
                );
                if (existing) {
                    if (!isDeepStrictEqual(existing, modifier))
                        throw new Error("engagement_booster_conflict");
                    return;
                }
                scoring
                    .forkParticipant(
                        participantId,
                        snapshot.state.receipts,
                        snapshot.state.boosters,
                    )
                    .redeemBooster(participantId, modifier);
                snapshot.state.boosters.push(structuredClone(modifier));
                await store.commit(
                    participantId,
                    snapshot.revision,
                    snapshot.state,
                );
                hydrate(participantId, snapshot);
            });
        },
        async summary(participantId) {
            const store = resolveStore();
            const snapshot = await store.read(participantId);
            hydrate(participantId, snapshot);
            const receipts = activeReceipts(snapshot);
            return structuredClone({
                xp: receipts.reduce((total, { score }) => total + score.xp, 0),
                activities: receipts.length,
                achievements: receipts.flatMap(({ awards }) => awards),
            });
        },
        async invalidate(participantId, providerId, activityId) {
            await serialize(participantId, async () => {
                const store = resolveStore();
                const snapshot = await store.read(participantId);
                const key = activityKey({ providerId, activityId });
                if (
                    !snapshot.state.receipts.some(
                        ({ activity }) => activityKey(activity) === key,
                    ) ||
                    snapshot.state.invalid.includes(key)
                )
                    return;
                snapshot.state.invalid.push(key);
                await store.commit(
                    participantId,
                    snapshot.revision,
                    snapshot.state,
                );
                hydrate(participantId, snapshot);
            });
        },
    };
    const actionIds = ["summary", "redeemBooster", "invalidate"] as const;
    for (const action of actionIds)
        ctx.registerFlow({
            id: `engagement:ledger:${action}`,
            stages: ["validate", "execute"],
        });
    const runAction = async <Result>(
        action: (typeof actionIds)[number],
        input: { participantId: string } & Record<string, unknown>,
        execute: () => Promise<Result>,
    ): Promise<Result> => {
        let result!: Result;
        await ctx.flow.run(`engagement:ledger:${action}`, input, {
            handlers: {
                validate: () => {
                    if (
                        typeof input.participantId !== "string" ||
                        !input.participantId.trim() ||
                        /[\u0000-\u001f]/.test(input.participantId)
                    )
                        throw new Error("invalid_participant_id");
                },
                execute: async () => {
                    result = await execute();
                },
            },
        });
        return result;
    };
    const ledger: EngagementLedgerCapability = {
        summary: (participantId) =>
            runAction("summary", { participantId }, () =>
                operations.summary(participantId),
            ),
        redeemBooster: (participantId, modifier) =>
            runAction("redeemBooster", { participantId, modifier }, () =>
                operations.redeemBooster(participantId, modifier),
            ),
        invalidate: (participantId, providerId, activityId) =>
            runAction(
                "invalidate",
                { participantId, providerId, activityId },
                () =>
                    operations.invalidate(
                        participantId,
                        providerId,
                        activityId,
                    ),
            ),
    };
    return {
        record: (input) =>
            serialize(input.participantId, () =>
                ctx.flow.run("engagement:scoreActivity", input),
            ),
        ledger,
    };
}

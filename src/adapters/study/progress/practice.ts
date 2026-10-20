import type {
    ActivityScore,
    ActivityScoreInput,
    FlowRunResult,
    EngagementLedgerCapability,
} from "@cognis/core";
import type {
    LearningEvent,
    ProgressActor,
} from "../../../gateways/study/reuse/progress.js";
import type { ProgressCapability } from "../../../gateways/study/reuse/progress.js";
import type { StudyAdapterBootstrapCtx } from "../../../gateways/study/gateway.js";

/** Only server-validated practice uses this path; raw event imports never mint rewards. */
export async function publishPractice(
    ctx: StudyAdapterBootstrapCtx,
    actor: ProgressActor,
    event: LearningEvent,
): Promise<void> {
    if (!ctx.isAdapterEnabled()) throw new Error("adapter_disabled");
    if (event.completion !== "completed" || event.attempt === 0) return;
    const history = await ctx.capabilities
        .require<ProgressCapability>("study:progress")
        .listEvents(actor, { actorId: event.actorId });
    if (
        history.some(
            ({ compensatesEventId }) => compensatesEventId === event.id,
        )
    )
        return;
    const activity: ActivityScoreInput = {
        activityId: event.id,
        participantId: event.actorId,
        providerId: "study",
        events: [
            {
                id: event.id,
                activityType: event.activity,
                correct: event.correct,
                independentCorrect: event.independentCorrect,
                hints: event.hints,
                durationMs: event.durationMs,
            },
        ],
        difficulty: 1,
        repeatKey: JSON.stringify([
            event.content.schema,
            event.content.layer,
            event.content.language,
            event.content.contentId,
            event.activity,
        ]),
        completedAt: event.occurredAt,
        scopes: {
            language: event.content.language,
            activity: event.activity,
            ...(event.context.classroomId
                ? { classroomId: event.context.classroomId }
                : {}),
        },
    };
    const record = ctx.capabilities.require<
        (activity: ActivityScoreInput) => Promise<FlowRunResult>
    >("engagement:recordActivity");
    const result = await record(activity);
    const score = result.stageResults.score?.[0] as ActivityScore | undefined;
    if (!score) throw new Error("engagement_score_missing");
    if (ctx.isAdapterEnabled("leaderboard")) {
        const recordStanding = ctx.capabilities.require<
            (input: {
                actor: ProgressActor;
                event: LearningEvent;
                activity: ActivityScoreInput;
                score: ActivityScore;
            }) => Promise<void>
        >("study:leaderboard:recordPractice");
        await recordStanding({ actor, event, activity, score });
    }
    await ctx.log?.("info", "Study practice rewards settled.", {
        component: "study-progress",
        operation: "publishPractice",
        actorId: event.actorId,
        eventId: event.id,
        xp: score.xp,
    });
}

export async function invalidatePractice(
    ctx: StudyAdapterBootstrapCtx,
    event: LearningEvent,
): Promise<void> {
    if (!event.compensatesEventId) return;
    await ctx.capabilities
        .require<EngagementLedgerCapability>("engagement:ledger")
        .invalidate(event.actorId, "study", event.compensatesEventId);
    if (ctx.isAdapterEnabled("leaderboard")) {
        const invalidate = ctx.capabilities.require<
            (input: { actor: ProgressActor; eventId: string }) => Promise<void>
        >("study:leaderboard:invalidateEvidence");
        await invalidate({
            actor: { accountId: event.actorId, role: "user" },
            eventId: event.compensatesEventId,
        });
    }
}

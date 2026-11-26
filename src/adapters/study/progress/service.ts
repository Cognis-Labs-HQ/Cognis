import { projectionKey } from "./reuse/projection-key.js";
import type { FlowApi, EngagementSummary } from "@cognis/core";
import type { StudyClassAccessCapability } from "../../../gateways/study/gateway.js";
import type { ProgressStore } from "./store.js";
import type {
    ProgressCapability,
    LearningEvent,
    LearningEventInput,
    ProgressActor,
    ProgressAggregate,
    ProgressFilters,
    ProgressProjection,
} from "../../../gateways/study/reuse/progress.js";

type Log = (
    level: string,
    message: string,
    metadata?: Record<string, unknown>,
) => void | Promise<void>;

export interface ProgressRecordFlowData extends Record<string, unknown> {
    appendResult?: "inserted" | "duplicate";
}

export async function rebuildProgressProjections(
    store: ProgressStore,
    actorId?: string,
): Promise<void> {
    await store.replaceProjections(
        buildProjections(await store.all(actorId)),
        actorId,
    );
}

const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,199}$/;
const PRIVILEGED_ROLES = new Set(["admin", "owner"]);
const MAX_REVIEW_DELAY_DAYS = 14;
const MAX_REVIEW_DELAY_MS = MAX_REVIEW_DELAY_DAYS * 86_400_000;

function requireIdentifier(value: unknown, code: string): string {
    if (typeof value !== "string" || !IDENTIFIER.test(value))
        throw new Error(code);
    return value;
}

function safeMetadata(value: unknown): Readonly<Record<string, unknown>> {
    if (!value || typeof value !== "object" || Array.isArray(value))
        throw new Error("invalid_metadata");
    let serialized: string;
    try {
        serialized = JSON.stringify(value);
    } catch {
        throw new Error("invalid_metadata");
    }
    if (
        !serialized ||
        serialized.length > 4096 ||
        /"(?:__proto__|constructor|prototype)"\s*:/.test(serialized)
    ) {
        throw new Error("unsafe_metadata");
    }
    return Object.freeze(JSON.parse(serialized) as Record<string, unknown>);
}

function normalizeEvent(
    actor: ProgressActor,
    input: LearningEventInput,
): LearningEvent {
    const occurredAt = new Date(input.occurredAt);
    if (
        !Number.isFinite(occurredAt.valueOf()) ||
        occurredAt.valueOf() > 8_640_000_000_000_000 - MAX_REVIEW_DELAY_MS
    )
        throw new Error("invalid_occurred_at");
    if (!Number.isInteger(input.attempt) || input.attempt < 0)
        throw new Error("invalid_attempt");
    if (!Number.isInteger(input.hints) || input.hints < 0)
        throw new Error("invalid_hints");
    if (!Number.isFinite(input.durationMs) || input.durationMs < 0)
        throw new Error("invalid_duration");
    if (
        typeof input.correct !== "boolean" ||
        typeof input.independentCorrect !== "boolean"
    ) {
        throw new Error("invalid_correctness");
    }
    if (
        !["started", "inProgress", "completed", "abandoned"].includes(
            input.completion,
        )
    ) {
        throw new Error("invalid_completion");
    }
    if (input.independentCorrect && (!input.correct || input.hints > 0)) {
        throw new Error("invalid_independent_correctness");
    }
    return Object.freeze({
        id: requireIdentifier(input.id, "invalid_event_id"),
        actorId: input.actorId ?? actor.accountId,
        occurredAt: occurredAt.toISOString(),
        content: {
            schema: requireIdentifier(input.content?.schema, "invalid_schema"),
            layer: requireIdentifier(input.content?.layer, "invalid_layer"),
            language: requireIdentifier(
                input.content?.language,
                "invalid_language",
            ),
            contentId: requireIdentifier(
                input.content?.contentId,
                "invalid_content_id",
            ),
        },
        contentRevision: requireIdentifier(
            input.contentRevision,
            "invalid_content_revision",
        ),
        activity: requireIdentifier(input.activity, "invalid_activity"),
        attempt: input.attempt,
        correct: input.correct,
        independentCorrect: input.independentCorrect,
        hints: input.hints,
        durationMs: input.durationMs,
        completion: input.completion,
        context: {
            ...(input.context?.interestVein
                ? {
                      interestVein: requireIdentifier(
                          input.context.interestVein,
                          "invalid_interest_vein",
                      ),
                  }
                : {}),
            ...(input.context?.classroomId
                ? {
                      classroomId: requireIdentifier(
                          input.context.classroomId,
                          "invalid_classroom_id",
                      ),
                  }
                : {}),
        },
        metadata: safeMetadata(input.metadata),
        ...(input.compensatesEventId
            ? {
                  compensatesEventId: requireIdentifier(
                      input.compensatesEventId,
                      "invalid_compensated_event_id",
                  ),
              }
            : {}),
    });
}

function applies(event: LearningEvent, filters: ProgressFilters): boolean {
    const occurred = Date.parse(event.occurredAt);
    return (
        (!filters.actorId || event.actorId === filters.actorId) &&
        (!filters.schema || event.content.schema === filters.schema) &&
        (!filters.layer || event.content.layer === filters.layer) &&
        (!filters.language || event.content.language === filters.language) &&
        (!filters.activity || event.activity === filters.activity) &&
        (!filters.interestVein ||
            event.context.interestVein === filters.interestVein) &&
        (!filters.classroomId ||
            event.context.classroomId === filters.classroomId) &&
        (!filters.eventId || event.id === filters.eventId) &&
        (!filters.from || occurred >= Date.parse(filters.from)) &&
        (!filters.until || occurred <= Date.parse(filters.until))
    );
}

function validateFilters(filters: ProgressFilters): void {
    for (const [value, code] of [
        [filters.from, "invalid_from"],
        [filters.until, "invalid_until"],
    ] as const) {
        if (value !== undefined && !Number.isFinite(Date.parse(value))) {
            throw new Error(code);
        }
    }
    if (
        filters.from &&
        filters.until &&
        Date.parse(filters.from) > Date.parse(filters.until)
    ) {
        throw new Error("invalid_time_window");
    }
}

function withoutCompensatedEvents(events: LearningEvent[]): LearningEvent[] {
    const compensated = new Set(
        events.flatMap((event) =>
            event.compensatesEventId ? [event.compensatesEventId] : [],
        ),
    );
    return events.filter((event) => !compensated.has(event.id));
}

function buildProjections(events: LearningEvent[]): ProgressProjection[] {
    const groups = new Map<string, LearningEvent[]>();
    for (const event of withoutCompensatedEvents(events)) {
        const key = projectionKey(event.actorId, event.content);
        const group = groups.get(key) ?? [];
        group.push(event);
        groups.set(key, group);
    }
    return Array.from(groups.values(), (group) => {
        group.sort(
            (left, right) =>
                left.occurredAt.localeCompare(right.occurredAt) ||
                left.id.localeCompare(right.id),
        );
        const latest = group.at(-1)!;
        const attempts = group.filter((event) => event.attempt > 0);
        const correct = attempts.filter((event) => event.correct).length;
        const independent = attempts.filter(
            (event) => event.independentCorrect,
        ).length;
        let streak = 0;
        for (const event of [...attempts].reverse()) {
            if (!event.independentCorrect) break;
            streak += 1;
        }
        const confidence =
            attempts.length === 0 ? 0 : independent / attempts.length;
        const reviewDays = Math.min(
            MAX_REVIEW_DELAY_DAYS,
            Math.max(1, Math.round((1 + streak) * (1 + confidence * 6))),
        );
        return {
            actorId: latest.actorId,
            content: latest.content,
            contentRevision: latest.contentRevision,
            seen: group.length,
            attempted: attempts.length,
            correct,
            mastered: independent >= 3 && confidence >= 0.8,
            dueForReview: new Date(
                Date.parse(latest.occurredAt) + reviewDays * 86_400_000,
            ).toISOString(),
            confidence,
            streak,
            hintDependence:
                attempts.length === 0
                    ? 0
                    : attempts.filter((event) => event.hints > 0).length /
                      attempts.length,
            lastPractice: latest.occurredAt,
            responseDurationMs:
                attempts.length === 0
                    ? 0
                    : Math.round(
                          attempts.reduce(
                              (sum, event) => sum + event.durationMs,
                              0,
                          ) / attempts.length,
                      ),
        };
    });
}

export class ProgressService implements ProgressCapability {
    private pending: Promise<unknown> = Promise.resolve();

    constructor(
        private readonly store: ProgressStore,
        private readonly classAccess?: StudyClassAccessCapability,
        private readonly flow?: FlowApi,
        private readonly log?: Log,
        private readonly isEnabled: () => boolean = () => true,
        private readonly practice?: (
            actor: ProgressActor,
            event: LearningEvent,
        ) => Promise<void>,
        private readonly invalidate?: (event: LearningEvent) => Promise<void>,
        private readonly rewards?: (
            participantId: string,
        ) => Promise<EngagementSummary>,
    ) {}

    async engagement(actor: ProgressActor): Promise<EngagementSummary> {
        this.requireEnabled();
        await this.authorize(actor, actor.accountId);
        if (!this.rewards) throw new Error("practice_rewards_unavailable");
        return this.rewards(actor.accountId);
    }

    private requireEnabled(): void {
        if (!this.isEnabled()) throw new Error("adapter_disabled");
    }

    private async authorize(
        actor: ProgressActor,
        actorId: string,
        classroomId?: string,
    ): Promise<void> {
        if (actor.accountId.startsWith("share:"))
            throw new Error("forbidden_actor");
        if (actor.accountId !== actorId && !PRIVILEGED_ROLES.has(actor.role))
            throw new Error("forbidden_actor");
        if (classroomId && !PRIVILEGED_ROLES.has(actor.role)) {
            const allowed = await this.classAccess?.canRead(
                classroomId,
                actor.accountId,
                actor.role,
            );
            if (!allowed) throw new Error("forbidden_scope");
        }
    }

    async recordEvent(
        actor: ProgressActor,
        input: LearningEventInput,
    ): Promise<{ event: LearningEvent; duplicate: boolean }> {
        this.requireEnabled();
        if (input.compensatesEventId !== undefined) {
            throw new Error("correction_route_required");
        }
        const event = normalizeEvent(actor, input);
        return this.persistEvent(actor, event);
    }

    async recordPractice(
        actor: ProgressActor,
        input: LearningEventInput,
    ): Promise<{ event: LearningEvent; duplicate: boolean }> {
        this.requireEnabled();
        if (!this.practice || !this.flow)
            throw new Error("practice_rewards_unavailable");
        let result: { event: LearningEvent; duplicate: boolean } | undefined;
        await this.flow.run(
            "study:progress:recordPractice",
            { actor, input },
            {
                handlers: {
                    authorize: () =>
                        this.authorize(
                            actor,
                            input.actorId ?? actor.accountId,
                            input.context?.classroomId,
                        ),
                    validate: () => {
                        if (!["drawing", "flashcards"].includes(input.activity))
                            throw new Error("invalid_practice_activity");
                    },
                    record: async () => {
                        result = await this.recordEvent(actor, input);
                    },
                    rewards: async () => {
                        if (!result)
                            throw new Error(
                                "progress_flow_persistence_missing",
                            );
                        await this.practice!(actor, result.event);
                    },
                },
            },
        );
        if (!result) throw new Error("progress_flow_persistence_missing");
        return result;
    }

    private async persistEvent(
        actor: ProgressActor,
        event: LearningEvent,
    ): Promise<{ event: LearningEvent; duplicate: boolean }> {
        const operation = () => this.persistAuthorizedEvent(actor, event);
        const result = this.pending.then(operation, operation);
        this.pending = result;
        return result;
    }

    private async persistAuthorizedEvent(
        actor: ProgressActor,
        event: LearningEvent,
    ): Promise<{ event: LearningEvent; duplicate: boolean }> {
        this.requireEnabled();
        await this.authorize(actor, event.actorId, event.context.classroomId);
        let appendResult: "inserted" | "duplicate";
        if (this.flow) {
            const data: ProgressRecordFlowData = {};
            await this.flow.run("study:progress:recordEvent", event, { data });
            if (!data.appendResult)
                throw new Error("progress_flow_persistence_missing");
            appendResult = data.appendResult;
        } else {
            appendResult = await this.store.append(event);
            await rebuildProgressProjections(this.store, event.actorId);
        }
        await this.log?.("info", "Recorded immutable learning event.", {
            component: "study-progress",
            operation: "recordEvent",
            actorId: event.actorId,
            eventId: event.id,
            duplicate: appendResult === "duplicate",
        });
        return { event, duplicate: appendResult === "duplicate" };
    }

    async correctEvent(
        actor: ProgressActor,
        input: LearningEventInput & { compensatesEventId: string },
    ): Promise<{ event: LearningEvent; duplicate: boolean }> {
        this.requireEnabled();
        const events = await this.store.all();
        const target = events.find(
            (event) => event.id === input.compensatesEventId,
        );
        if (!target) throw new Error("event_not_found");
        if (target.compensatesEventId)
            throw new Error("correction_target_invalid");
        const existingCorrection = events.find(
            (event) => event.compensatesEventId === target.id,
        );
        if (existingCorrection && existingCorrection.id !== input.id) {
            throw new Error("event_already_corrected");
        }
        await this.authorize(actor, target.actorId, target.context.classroomId);
        if (
            JSON.stringify(input.content) !== JSON.stringify(target.content) ||
            input.context?.classroomId !== target.context.classroomId
        ) {
            throw new Error("correction_scope_mismatch");
        }
        const correction = normalizeEvent(actor, {
            ...input,
            actorId: target.actorId,
        });
        const result = await this.persistEvent(actor, correction);
        await this.invalidate?.(result.event);
        return result;
    }

    async listEvents(
        actor: ProgressActor,
        filters: ProgressFilters = {},
    ): Promise<LearningEvent[]> {
        this.requireEnabled();
        validateFilters(filters);
        const actorId = filters.actorId ?? actor.accountId;
        await this.authorize(actor, actorId, filters.classroomId);
        const accessible: LearningEvent[] = [];
        const classroomAccess = new Map<string, boolean>();
        for (const event of (await this.store.all(actorId)).filter(
            (candidate) => candidate.actorId === actorId,
        )) {
            const classroomId = event.context.classroomId;
            if (classroomId && classroomAccess.get(classroomId) === false) {
                continue;
            }
            try {
                if (!classroomId || classroomAccess.get(classroomId) !== true) {
                    await this.authorize(actor, actorId, classroomId);
                    if (classroomId) classroomAccess.set(classroomId, true);
                }
                accessible.push(event);
            } catch (error) {
                if (
                    !(error instanceof Error) ||
                    error.message !== "forbidden_scope"
                )
                    throw error;
                if (classroomId) classroomAccess.set(classroomId, false);
            }
        }
        return accessible.filter((event) =>
            applies(event, { ...filters, actorId }),
        );
    }

    async listProjections(
        actor: ProgressActor,
        filters: ProgressFilters = {},
    ): Promise<ProgressProjection[]> {
        this.requireEnabled();
        validateFilters(filters);
        await this.authorize(
            actor,
            filters.actorId ?? actor.accountId,
            filters.classroomId,
        );
        const events = await this.listEvents(actor, {
            actorId: filters.actorId,
        });
        return buildProjections(
            withoutCompensatedEvents(events).filter((event) =>
                applies(event, {
                    ...filters,
                    actorId: filters.actorId ?? actor.accountId,
                }),
            ),
        );
    }

    async aggregate(
        actor: ProgressActor,
        filters: ProgressFilters = {},
    ): Promise<ProgressAggregate> {
        this.requireEnabled();
        validateFilters(filters);
        await this.authorize(
            actor,
            filters.actorId ?? actor.accountId,
            filters.classroomId,
        );
        const events = await this.listEvents(actor, {
            actorId: filters.actorId,
        });
        const active = withoutCompensatedEvents(events).filter((event) =>
            applies(event, {
                ...filters,
                actorId: filters.actorId ?? actor.accountId,
            }),
        );
        const attempts = active.filter((event) => event.attempt > 0);
        const independentCorrect = attempts.filter(
            (event) => event.independentCorrect,
        ).length;
        return {
            events: active.length,
            seen: active.length,
            attempted: attempts.length,
            correct: attempts.filter((event) => event.correct).length,
            independentCorrect,
            completed: active.filter(
                (event) => event.completion === "completed",
            ).length,
            hints: active.reduce((sum, event) => sum + event.hints, 0),
            durationMs: active.reduce(
                (sum, event) => sum + event.durationMs,
                0,
            ),
            confidence:
                attempts.length === 0
                    ? 0
                    : independentCorrect / attempts.length,
        };
    }

    async rebuild(
        actor: ProgressActor,
        targetActorId = actor.accountId,
    ): Promise<ProgressProjection[]> {
        this.requireEnabled();
        await this.authorize(actor, targetActorId);
        await rebuildProgressProjections(this.store, targetActorId);
        const projections = (await this.store.projections()).filter(
            (projection) => projection.actorId === targetActorId,
        );
        await this.log?.("info", "Rebuilt learning progress projections.", {
            component: "study-progress",
            operation: "rebuild",
            requestedBy: actor.accountId,
            actorId: targetActorId,
            projectionCount: projections.length,
        });
        return projections;
    }
}

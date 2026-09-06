import type { FlowApi } from "@cognis/core";
import type { StudyClassAccessCapability } from "../../../gateways/study/gateway.js";
import type { ProgressStore } from "./store.js";
import type {
    LearningEvent,
    LearningEventInput,
    ProgressActor,
    ProgressAggregate,
    ProgressFilters,
    ProgressProjection,
} from "./types.js";

type Log = (
    level: string,
    message: string,
    metadata?: Record<string, unknown>,
) => void | Promise<void>;

export interface ProgressCapability {
    recordEvent(
        actor: ProgressActor,
        input: LearningEventInput,
    ): Promise<{ event: LearningEvent; duplicate: boolean }>;
    correctEvent(
        actor: ProgressActor,
        input: LearningEventInput & { compensatesEventId: string },
    ): Promise<{ event: LearningEvent; duplicate: boolean }>;
    listEvents(
        actor: ProgressActor,
        filters?: ProgressFilters,
    ): Promise<LearningEvent[]>;
    listProjections(
        actor: ProgressActor,
        filters?: ProgressFilters,
    ): Promise<ProgressProjection[]>;
    aggregate(
        actor: ProgressActor,
        filters?: ProgressFilters,
    ): Promise<ProgressAggregate>;
    rebuild(
        actor: ProgressActor,
        targetActorId?: string,
    ): Promise<ProgressProjection[]>;
}

const IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,199}$/;
const PRIVILEGED_ROLES = new Set(["admin", "owner"]);

function requireIdentifier(value: unknown, code: string): string {
    if (typeof value !== "string" || !IDENTIFIER.test(value))
        throw new Error(code);
    return value;
}

function safeMetadata(value: unknown): Readonly<Record<string, unknown>> {
    if (!value || typeof value !== "object" || Array.isArray(value))
        throw new Error("invalid_metadata");
    const serialized = JSON.stringify(value);
    if (
        serialized.length > 4096 ||
        /"(?:__proto__|constructor|prototype)"\s*:/.test(serialized)
    ) {
        throw new Error("unsafe_metadata");
    }
    return Object.freeze(structuredClone(value as Record<string, unknown>));
}

function normalizeEvent(
    actor: ProgressActor,
    input: LearningEventInput,
): LearningEvent {
    const occurredAt = new Date(input.occurredAt);
    if (!Number.isFinite(occurredAt.valueOf()))
        throw new Error("invalid_occurred_at");
    if (!Number.isInteger(input.attempt) || input.attempt < 0)
        throw new Error("invalid_attempt");
    if (!Number.isInteger(input.hints) || input.hints < 0)
        throw new Error("invalid_hints");
    if (!Number.isFinite(input.durationMs) || input.durationMs < 0)
        throw new Error("invalid_duration");
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
        ...structuredClone(input),
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
        context: {
            interestVein: input.context?.interestVein
                ? requireIdentifier(
                      input.context.interestVein,
                      "invalid_interest_vein",
                  )
                : undefined,
            classroomId: input.context?.classroomId
                ? requireIdentifier(
                      input.context.classroomId,
                      "invalid_classroom_id",
                  )
                : undefined,
        },
        metadata: safeMetadata(input.metadata),
        compensatesEventId: input.compensatesEventId
            ? requireIdentifier(
                  input.compensatesEventId,
                  "invalid_compensated_event_id",
              )
            : undefined,
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

function buildProjections(events: LearningEvent[]): ProgressProjection[] {
    const compensated = new Set(
        events.flatMap((event) =>
            event.compensatesEventId ? [event.compensatesEventId] : [],
        ),
    );
    const groups = new Map<string, LearningEvent[]>();
    for (const event of events) {
        if (event.compensatesEventId || compensated.has(event.id)) continue;
        const key = `${event.actorId}\u0000${event.content.schema}\u0000${event.content.layer}\u0000${event.content.language}\u0000${event.content.contentId}`;
        groups.set(key, [...(groups.get(key) ?? []), event]);
    }
    return Array.from(groups.values(), (group) => {
        group.sort((left, right) =>
            left.occurredAt.localeCompare(right.occurredAt),
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
        const reviewDays = Math.max(
            1,
            Math.round((1 + streak) * (1 + confidence * 6)),
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
    constructor(
        private readonly store: ProgressStore,
        private readonly classAccess?: StudyClassAccessCapability,
        private readonly flow?: FlowApi,
        private readonly log?: Log,
    ) {}

    private async authorize(
        actor: ProgressActor,
        actorId: string,
        classroomId?: string,
        write = false,
    ): Promise<void> {
        if (actor.accountId !== actorId && !PRIVILEGED_ROLES.has(actor.role))
            throw new Error("forbidden_actor");
        if (classroomId && !PRIVILEGED_ROLES.has(actor.role)) {
            const allowed = write
                ? await this.classAccess?.canWrite(
                      classroomId,
                      actor.accountId,
                      actor.role,
                  )
                : await this.classAccess?.canRead(
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
        const event = normalizeEvent(actor, input);
        await this.authorize(
            actor,
            event.actorId,
            event.context.classroomId,
            true,
        );
        await this.flow?.run("study:progress:recordEvent", event);
        const appended = await this.store.append(event);
        if (appended) await this.rebuildInternal();
        await this.log?.("info", "Recorded immutable learning event.", {
            component: "study-progress",
            operation: "recordEvent",
            actorId: event.actorId,
            eventId: event.id,
            duplicate: !appended,
        });
        return { event, duplicate: !appended };
    }

    async correctEvent(
        actor: ProgressActor,
        input: LearningEventInput & { compensatesEventId: string },
    ): Promise<{ event: LearningEvent; duplicate: boolean }> {
        const events = await this.store.all();
        const target = events.find(
            (event) => event.id === input.compensatesEventId,
        );
        if (!target) throw new Error("event_not_found");
        if (target.compensatesEventId)
            throw new Error("correction_target_invalid");
        return this.recordEvent(actor, { ...input, actorId: target.actorId });
    }

    async listEvents(
        actor: ProgressActor,
        filters: ProgressFilters = {},
    ): Promise<LearningEvent[]> {
        const actorId = filters.actorId ?? actor.accountId;
        await this.authorize(actor, actorId, filters.classroomId);
        return (await this.store.all()).filter((event) =>
            applies(event, { ...filters, actorId }),
        );
    }

    async listProjections(
        actor: ProgressActor,
        filters: ProgressFilters = {},
    ): Promise<ProgressProjection[]> {
        const events = await this.listEvents(actor, filters);
        return buildProjections(events);
    }

    async aggregate(
        actor: ProgressActor,
        filters: ProgressFilters = {},
    ): Promise<ProgressAggregate> {
        const events = await this.listEvents(actor, filters);
        const compensated = new Set(
            events.flatMap((event) =>
                event.compensatesEventId ? [event.compensatesEventId] : [],
            ),
        );
        const active = events.filter(
            (event) => !event.compensatesEventId && !compensated.has(event.id),
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
        await this.authorize(actor, targetActorId);
        await this.rebuildInternal();
        return (await this.store.projections()).filter(
            (projection) => projection.actorId === targetActorId,
        );
    }

    private async rebuildInternal(): Promise<void> {
        await this.store.replaceProjections(
            buildProjections(await this.store.all()),
        );
    }
}

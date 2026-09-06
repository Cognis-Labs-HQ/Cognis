import type { AccessRole } from "@cognis/core";

export type CompletionState =
    "started" | "inProgress" | "completed" | "abandoned";

export interface ProgressActor {
    accountId: string;
    role: AccessRole;
}

export interface ContentIdentity {
    schema: string;
    layer: string;
    language: string;
    contentId: string;
}

export interface LearningEvent {
    readonly id: string;
    readonly actorId: string;
    readonly occurredAt: string;
    readonly content: ContentIdentity;
    readonly contentRevision: string;
    readonly activity: string;
    readonly context: {
        interestVein?: string;
        classroomId?: string;
    };
    readonly attempt: number;
    readonly correct: boolean;
    readonly independentCorrect: boolean;
    readonly hints: number;
    readonly durationMs: number;
    readonly completion: CompletionState;
    readonly metadata: Readonly<Record<string, unknown>>;
    readonly compensatesEventId?: string;
}

export type LearningEventInput = Omit<LearningEvent, "actorId"> & {
    actorId?: string;
};

export interface ProgressProjection {
    actorId: string;
    content: ContentIdentity;
    contentRevision: string;
    seen: number;
    attempted: number;
    correct: number;
    mastered: boolean;
    dueForReview: string | null;
    confidence: number;
    streak: number;
    hintDependence: number;
    lastPractice: string;
    responseDurationMs: number;
}

export interface ProgressFilters {
    actorId?: string;
    schema?: string;
    layer?: string;
    language?: string;
    activity?: string;
    interestVein?: string;
    classroomId?: string;
    eventId?: string;
    from?: string;
    until?: string;
}

export interface ProgressAggregate {
    events: number;
    seen: number;
    attempted: number;
    correct: number;
    independentCorrect: number;
    completed: number;
    hints: number;
    durationMs: number;
    confidence: number;
}

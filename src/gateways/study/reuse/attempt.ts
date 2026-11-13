import { randomUUID } from "node:crypto";

export interface StudyAttempt {
    id: string;
    occurredAt: string;
}

/** A caller may retain an attempt identity to retry delivery without regrading. */
export function studyAttempt(input?: unknown): StudyAttempt {
    if (input === undefined)
        return { id: randomUUID(), occurredAt: new Date().toISOString() };
    if (!input || typeof input !== "object")
        throw new Error("invalid_study_attempt");
    const value = input as Partial<StudyAttempt>;
    if (
        typeof value.id !== "string" ||
        !/^[A-Za-z0-9_-]{1,100}$/.test(value.id) ||
        typeof value.occurredAt !== "string" ||
        !Number.isFinite(Date.parse(value.occurredAt))
    )
        throw new Error("invalid_study_attempt");
    return {
        id: value.id,
        occurredAt: new Date(value.occurredAt).toISOString(),
    };
}

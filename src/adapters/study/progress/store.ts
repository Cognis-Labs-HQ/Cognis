import type { LearningEvent, ProgressProjection } from "./types.js";

export interface ProgressStore {
    append(event: LearningEvent): Promise<boolean>;
    all(): Promise<LearningEvent[]>;
    replaceProjections(projections: ProgressProjection[]): Promise<void>;
    projections(): Promise<ProgressProjection[]>;
}

export class MemoryProgressStore implements ProgressStore {
    private readonly events = new Map<string, LearningEvent>();
    private currentProjections: ProgressProjection[] = [];

    async append(event: LearningEvent): Promise<boolean> {
        if (this.events.has(event.id)) return false;
        this.events.set(event.id, structuredClone(event));
        return true;
    }

    async all(): Promise<LearningEvent[]> {
        return Array.from(this.events.values(), (event) =>
            structuredClone(event),
        );
    }

    async replaceProjections(projections: ProgressProjection[]): Promise<void> {
        this.currentProjections = structuredClone(projections);
    }

    async projections(): Promise<ProgressProjection[]> {
        return structuredClone(this.currentProjections);
    }
}

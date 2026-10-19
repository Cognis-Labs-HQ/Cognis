import type {
    ActivityScoreInput,
    ActivityScore,
    AchievementAward,
    ScoreModifier,
} from "./scoring.js";

export interface EngagementReceipt {
    activity: ActivityScoreInput;
    score: ActivityScore;
    awards: readonly AchievementAward[];
}

export interface EngagementState {
    receipts: EngagementReceipt[];
    invalid: string[];
    boosters: ScoreModifier[];
}

export interface EngagementSnapshot {
    revision: number;
    state: EngagementState;
}

/** Hosts supply durable storage with atomic revision checks. */
export interface EngagementStore {
    read(participantId: string): Promise<EngagementSnapshot>;
    commit(
        participantId: string,
        revision: number,
        state: EngagementState,
    ): Promise<void>;
}

export class MemoryEngagementStore implements EngagementStore {
    private readonly participants = new Map<string, EngagementSnapshot>();

    async read(participantId: string): Promise<EngagementSnapshot> {
        return structuredClone(
            this.participants.get(participantId) ?? {
                revision: 0,
                state: { receipts: [], invalid: [], boosters: [] },
            },
        );
    }

    async commit(
        participantId: string,
        revision: number,
        state: EngagementState,
    ): Promise<void> {
        if ((this.participants.get(participantId)?.revision ?? 0) !== revision)
            throw new Error("engagement_state_conflict");
        this.participants.set(
            participantId,
            structuredClone({ revision: revision + 1, state }),
        );
    }
}

export function activityKey(
    activity: Pick<ActivityScoreInput, "providerId" | "activityId">,
): string {
    return JSON.stringify([activity.providerId, activity.activityId]);
}

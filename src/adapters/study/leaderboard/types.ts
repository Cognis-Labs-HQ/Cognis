import type {
    AccessRole,
    ActivityScore,
    ActivityScoreInput,
} from "@cognis/core";

export type RankingDirection = "ascending" | "descending";
export type RankingValueType = "number" | "duration" | "percentage";
export type RankingStrategy = "lexicographic" | "weighted";

export interface LeaderboardCriterion {
    id: string;
    label: Readonly<Record<string, string>>;
    priority: number;
    direction: RankingDirection;
    valueType: RankingValueType;
    minimumEvidence: number;
    tieBreak: "participantId" | "earliestEvidence" | "latestEvidence";
    window:
        | { kind: "allTime" }
        | { kind: "rolling"; durationMs: number }
        | { kind: "season" };
    scope: "participant" | "classroom" | "event";
    weight?: number;
}

export interface LeaderboardDefinition {
    id: string;
    kind: "classroom" | "event";
    strategy?: RankingStrategy;
    criteria: readonly LeaderboardCriterion[];
    classroomId?: string;
    recurring?: boolean;
    optIn?: boolean;
    minimumCohortSize?: number;
    lateJoinPolicy?: "allow" | "nextSeason" | "deny";
    season?: { id: string; startsAt: string; endsAt: string };
    promotion?: { count: number; targetCohortId: string };
    relegation?: { count: number; targetCohortId: string };
}

export interface LeaderboardActor {
    accountId: string;
    role: AccessRole;
}

export interface LeaderboardObservation {
    id: string;
    definitionId: string;
    participantId: string;
    criterionId: string;
    value: number;
    observedAt: string;
    evidenceEventIds: readonly string[];
    cohortId?: string;
    seasonId?: string;
}

export interface StandingRow {
    rank: number;
    participant: { id?: string; alias: string; isViewer: boolean };
    criteria: Readonly<Record<string, number>>;
    score: number | readonly number[];
    tied: boolean;
    movement: number | null;
    updatedAt: string;
    plating?: "gold" | "silver" | "bronze";
}

export interface StandingsQuery {
    definitionId: string;
    viewerId: string;
    cohortId?: string;
    seasonId?: string;
    offset?: number;
    limit?: number;
    now?: string;
}

export interface LeaderboardTableModel {
    caption: string;
    columns: readonly { id: string; label: string }[];
    rows: readonly (StandingRow & {
        rankLabel: string;
        screenReaderLabel: string;
    })[];
    total: number;
}

export interface LeaderboardCapability {
    listDefinitions(actor?: LeaderboardActor): readonly LeaderboardDefinition[];
    canAccessDefinition(
        actor: LeaderboardActor,
        definitionId: string,
        cohortId?: string,
    ): Promise<boolean>;
    resolveCohort(
        actor: LeaderboardActor,
        definitionId: string,
    ): string | undefined;
    registerDefinition(definition: LeaderboardDefinition): void;
    submitObservation(
        actor: LeaderboardActor,
        observation: LeaderboardObservation,
    ): Promise<void>;
    invalidateObservation(
        actor: LeaderboardActor,
        observationId: string,
    ): Promise<void>;
    queryStandings(
        query: StandingsQuery,
    ): Promise<{ rows: StandingRow[]; total: number }>;
    requestTableModel(
        query: StandingsQuery,
        locale: string,
    ): Promise<LeaderboardTableModel>;
    assignCohort(
        participantId: string,
        definitionId: string,
        cohortId: string,
    ): void;
    setParticipation(
        participantId: string,
        definitionId: string,
        options: { optedIn: boolean; alias?: string },
    ): void;
    rollover(
        definitionId: string,
        nextSeason: { id: string; startsAt: string; endsAt: string },
    ): void;
    archivedResults(
        definitionId: string,
    ): readonly { seasonId: string; rows: readonly StandingRow[] }[];
    scoreActivity(
        actor: LeaderboardActor,
        definitionId: string,
        criterionId: string,
        activity: ActivityScoreInput,
        recordedScore?: ActivityScore,
    ): Promise<ActivityScore>;
}

export interface ProgressEvidenceCapability {
    listEvents(
        actor: LeaderboardActor,
        filters?: { eventId?: string },
    ): Promise<readonly { id: string; actorId: string; occurredAt: string }[]>;
}

export interface LeaderboardClassAccessCapability {
    canRead(
        classId: string,
        accountId: string,
        role: AccessRole,
    ): Promise<boolean>;
}

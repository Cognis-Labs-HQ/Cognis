import type {
    LeaderboardCapability,
    LeaderboardDefinition,
    LeaderboardObservation,
    LeaderboardActor,
    StandingsQuery,
    StandingRow,
    LeaderboardTableModel,
    ProgressEvidenceCapability,
} from "./types.js";
import type { ActivityScoreInput, ScoringCapability } from "@cognis/core";

const ID = /^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,199}$/;
const privileged = new Set(["admin", "owner"]);

export class LeaderboardService implements LeaderboardCapability {
    private definitions = new Map<string, LeaderboardDefinition>();
    private observations = new Map<string, LeaderboardObservation>();
    private invalid = new Set<string>();
    private cohorts = new Map<string, string>();
    private participation = new Map<
        string,
        { optedIn: boolean; alias?: string }
    >();
    private archives = new Map<
        string,
        { seasonId: string; rows: StandingRow[] }[]
    >();
    private snapshots = new Map<string, Map<string, number>>();

    constructor(
        private readonly progress:
            | ProgressEvidenceCapability
            | (() => ProgressEvidenceCapability | undefined),
        private readonly enabled = () => true,
        private readonly scoring?: ScoringCapability,
    ) {}

    private progressCapability(): ProgressEvidenceCapability {
        const progress =
            typeof this.progress === "function"
                ? this.progress()
                : this.progress;
        if (!progress) throw new Error("progress_unavailable");
        return progress;
    }

    async scoreActivity(
        actor: LeaderboardActor,
        definitionId: string,
        criterionId: string,
        activity: ActivityScoreInput,
    ) {
        this.requireEnabled();
        if (!this.scoring) throw new Error("scoring_unavailable");
        if (
            actor.accountId !== activity.participantId &&
            !privileged.has(actor.role)
        )
            throw new Error("forbidden_actor");
        const definition = this.definitions.get(definitionId);
        if (!definition?.criteria.some(({ id }) => id === criterionId))
            throw new Error("criterion_not_found");
        const score = this.scoring.score(activity);
        await this.submitObservation(actor, {
            id: `${activity.activityId}:xp`,
            definitionId,
            participantId: activity.participantId,
            criterionId,
            value: score.xp,
            observedAt: activity.completedAt,
            evidenceEventIds: activity.events.map(({ id }) => id),
            seasonId: definition.season?.id,
            cohortId: this.cohorts.get(
                this.key(activity.participantId, definitionId),
            ),
        });
        return score;
    }
    private key(participantId: string, definitionId: string) {
        return `${definitionId}\0${participantId}`;
    }
    private requireEnabled() {
        if (!this.enabled()) throw new Error("adapter_disabled");
    }
    listDefinitions() {
        this.requireEnabled();
        return [...this.definitions.values()].map((definition) =>
            structuredClone(definition),
        );
    }

    registerDefinition(input: LeaderboardDefinition): void {
        this.requireEnabled();
        if (!ID.test(input.id) || !input.criteria.length)
            throw new Error("invalid_definition");
        if (input.kind === "classroom" && !input.classroomId)
            throw new Error("classroom_required");
        if (
            input.kind === "event" &&
            (!input.recurring || input.optIn !== true)
        )
            throw new Error("event_must_be_recurring_and_opt_in");
        const ids = new Set<string>();
        for (const criterion of input.criteria) {
            if (
                !ID.test(criterion.id) ||
                ids.has(criterion.id) ||
                !Object.keys(criterion.label).length ||
                !Number.isInteger(criterion.priority) ||
                criterion.minimumEvidence < 1
            )
                throw new Error("invalid_criterion");
            if (
                input.strategy === "weighted" &&
                !(Number.isFinite(criterion.weight) && criterion.weight! > 0)
            )
                throw new Error("weight_required");
            ids.add(criterion.id);
        }
        this.definitions.set(
            input.id,
            structuredClone({
                ...input,
                strategy: input.strategy ?? "lexicographic",
                minimumCohortSize: input.minimumCohortSize ?? 2,
                lateJoinPolicy: input.lateJoinPolicy ?? "allow",
            }),
        );
    }

    async submitObservation(
        actor: LeaderboardActor,
        observation: LeaderboardObservation,
    ): Promise<void> {
        this.requireEnabled();
        const definition = this.definitions.get(observation.definitionId);
        const criterion = definition?.criteria.find(
            (item) => item.id === observation.criterionId,
        );
        if (
            !definition ||
            !criterion ||
            !ID.test(observation.id) ||
            !Number.isFinite(observation.value) ||
            !Number.isFinite(Date.parse(observation.observedAt)) ||
            !observation.evidenceEventIds.length
        )
            throw new Error("invalid_observation");
        if (
            actor.accountId !== observation.participantId &&
            !privileged.has(actor.role)
        )
            throw new Error("forbidden_actor");
        if (
            definition.kind === "event" &&
            !this.participation.get(
                this.key(observation.participantId, definition.id),
            )?.optedIn
        )
            throw new Error("participant_not_opted_in");
        if (definition.season && observation.seasonId !== definition.season.id)
            throw new Error("wrong_season");
        const expectedCohort = this.cohorts.get(
            this.key(observation.participantId, definition.id),
        );
        if (expectedCohort && observation.cohortId !== expectedCohort)
            throw new Error("wrong_cohort");
        const uniqueEvidence = [...new Set(observation.evidenceEventIds)];
        if (uniqueEvidence.length < criterion.minimumEvidence)
            throw new Error("insufficient_evidence");
        for (const eventId of uniqueEvidence) {
            const events = await this.progressCapability().listEvents(actor, {
                eventId,
            });
            if (
                !events.some(
                    (event) =>
                        event.id === eventId &&
                        event.actorId === observation.participantId,
                )
            )
                throw new Error("evidence_not_found");
        }
        this.observations.set(observation.id, structuredClone(observation));
    }

    async invalidateObservation(
        actor: LeaderboardActor,
        observationId: string,
    ): Promise<void> {
        this.requireEnabled();
        const observation = this.observations.get(observationId);
        if (!observation) throw new Error("observation_not_found");
        if (
            actor.accountId !== observation.participantId &&
            !privileged.has(actor.role)
        )
            throw new Error("forbidden_actor");
        this.invalid.add(observationId);
    }

    assignCohort(
        participantId: string,
        definitionId: string,
        cohortId: string,
    ): void {
        this.cohorts.set(this.key(participantId, definitionId), cohortId);
    }
    setParticipation(
        participantId: string,
        definitionId: string,
        options: { optedIn: boolean; alias?: string },
    ): void {
        this.participation.set(this.key(participantId, definitionId), {
            ...options,
        });
    }

    async queryStandings(
        query: StandingsQuery,
    ): Promise<{ rows: StandingRow[]; total: number }> {
        this.requireEnabled();
        const definition = this.definitions.get(query.definitionId);
        if (!definition) throw new Error("definition_not_found");
        const now = Date.parse(query.now ?? new Date().toISOString());
        const criteria = [...definition.criteria].sort(
            (a, b) => a.priority - b.priority || a.id.localeCompare(b.id),
        );
        const values = new Map<string, Map<string, LeaderboardObservation[]>>();
        for (const observation of this.observations.values()) {
            if (
                this.invalid.has(observation.id) ||
                observation.definitionId !== definition.id ||
                (query.cohortId && observation.cohortId !== query.cohortId) ||
                (query.seasonId && observation.seasonId !== query.seasonId)
            )
                continue;
            const criterion = criteria.find(
                (item) => item.id === observation.criterionId,
            )!;
            if (
                criterion.window.kind === "rolling" &&
                Date.parse(observation.observedAt) <
                    now - criterion.window.durationMs
            )
                continue;
            if (
                criterion.window.kind === "season" &&
                observation.seasonId !== definition.season?.id
            )
                continue;
            const participant =
                values.get(observation.participantId) ?? new Map();
            participant.set(criterion.id, [
                ...(participant.get(criterion.id) ?? []),
                observation,
            ]);
            values.set(observation.participantId, participant);
        }
        const eligible = [...values].filter(
            ([participantId, grouped]) =>
                criteria.every(
                    (c) =>
                        (grouped.get(c.id)?.flatMap((o) => o.evidenceEventIds)
                            .length ?? 0) >= c.minimumEvidence,
                ) &&
                (definition.kind !== "event" ||
                    this.participation.get(
                        this.key(participantId, definition.id),
                    )?.optedIn),
        );
        if (
            new Set(
                eligible.map(
                    ([id]) =>
                        this.cohorts.get(this.key(id, definition.id)) ??
                        "default",
                ),
            ).size &&
            eligible.length < (definition.minimumCohortSize ?? 2)
        )
            return { rows: [], total: 0 };
        const raw = eligible.map(([participantId, grouped]) => {
            const criterionValues = Object.fromEntries(
                criteria.map((c) => [
                    c.id,
                    grouped.get(c.id)!.reduce((sum, o) => sum + o.value, 0),
                ]),
            );
            const vector = criteria.map(
                (c) =>
                    criterionValues[c.id] *
                    (c.direction === "descending" ? -1 : 1),
            );
            const score =
                definition.strategy === "weighted"
                    ? criteria.reduce(
                          (sum, c) =>
                              sum +
                              criterionValues[c.id] *
                                  c.weight! *
                                  (c.direction === "descending" ? 1 : -1),
                          0,
                      )
                    : vector;
            const updatedAt = [...grouped.values()]
                .flat()
                .map((o) => o.observedAt)
                .sort()
                .at(-1)!;
            return { participantId, criterionValues, vector, score, updatedAt };
        });
        raw.sort((a, b) => {
            if (definition.strategy === "weighted")
                return (
                    (b.score as number) - (a.score as number) ||
                    a.participantId.localeCompare(b.participantId)
                );
            for (let index = 0; index < a.vector.length; index += 1)
                if (a.vector[index] !== b.vector[index])
                    return a.vector[index] - b.vector[index];
            return a.participantId.localeCompare(b.participantId);
        });
        const previous = this.snapshots.get(definition.id) ?? new Map();
        const rows = raw.map((item, index) => {
            const previousItem = raw[index - 1];
            const tiedWithPrevious =
                !!previousItem &&
                JSON.stringify(item.score) ===
                    JSON.stringify(previousItem.score);
            const rank = tiedWithPrevious ? index : index + 1;
            const participant = this.participation.get(
                this.key(item.participantId, definition.id),
            );
            const tiedWithNext =
                !!raw[index + 1] &&
                JSON.stringify(item.score) ===
                    JSON.stringify(raw[index + 1].score);
            return {
                rank,
                participant: {
                    ...(item.participantId === query.viewerId
                        ? { id: item.participantId }
                        : {}),
                    alias:
                        participant?.alias ??
                        (item.participantId === query.viewerId
                            ? "You"
                            : `Participant ${index + 1}`),
                    isViewer: item.participantId === query.viewerId,
                },
                criteria: item.criterionValues,
                score: item.score,
                tied: tiedWithPrevious || tiedWithNext,
                movement: previous.has(item.participantId)
                    ? previous.get(item.participantId)! - rank
                    : null,
                updatedAt: item.updatedAt,
                plating:
                    rank === 1
                        ? ("gold" as const)
                        : rank === 2
                          ? ("silver" as const)
                          : rank === 3
                            ? ("bronze" as const)
                            : undefined,
            };
        });
        this.snapshots.set(
            definition.id,
            new Map(
                raw.map((item, index) => [
                    item.participantId,
                    rows[index].rank,
                ]),
            ),
        );
        const offset = query.offset ?? 0;
        if (
            !Number.isInteger(offset) ||
            offset < 0 ||
            (query.limit !== undefined &&
                (!Number.isInteger(query.limit) || query.limit < 1))
        )
            throw new Error("invalid_pagination");
        return {
            rows: rows.slice(
                offset,
                query.limit === undefined ? undefined : offset + query.limit,
            ),
            total: rows.length,
        };
    }

    async requestTableModel(
        query: StandingsQuery,
        locale: string,
    ): Promise<LeaderboardTableModel> {
        const definition = this.definitions.get(query.definitionId);
        if (!definition) throw new Error("definition_not_found");
        const result = await this.queryStandings(query);
        const labels = {
            rank: "Rank",
            participant: "Participant",
            score: "Score",
            ties: "Tied",
            movement: "Movement",
            updatedAt: "Updated",
        };
        return {
            caption: "Leaderboard standings",
            columns: [
                { id: "rank", label: labels.rank },
                { id: "participant", label: labels.participant },
                ...definition.criteria.map((c) => ({
                    id: c.id,
                    label: c.label[locale] ?? c.label.en ?? c.id,
                })),
                { id: "score", label: labels.score },
                { id: "ties", label: labels.ties },
                { id: "movement", label: labels.movement },
                { id: "updatedAt", label: labels.updatedAt },
            ],
            rows: result.rows.map((row) => ({
                ...row,
                rankLabel: `${row.plating ? `${row.plating} medal, ` : ""}Rank ${row.rank}`,
                screenReaderLabel: `${row.participant.alias}, rank ${row.rank}${row.tied ? ", tied" : ""}`,
            })),
            total: result.total,
        };
    }

    rollover(
        definitionId: string,
        nextSeason: { id: string; startsAt: string; endsAt: string },
    ): void {
        const definition = this.definitions.get(definitionId);
        if (!definition?.season || !definition.recurring)
            throw new Error("rollover_not_supported");
        const rows = [...(this.snapshots.get(definitionId) ?? [])].map(
            ([participantId, rank]) => ({
                rank,
                participant: {
                    alias:
                        this.participation.get(
                            this.key(participantId, definitionId),
                        )?.alias ?? "Participant",
                    isViewer: false,
                },
                criteria: {},
                score: 0,
                tied: false,
                movement: null,
                updatedAt: definition.season!.endsAt,
            }),
        );
        this.archives.set(definitionId, [
            ...(this.archives.get(definitionId) ?? []),
            { seasonId: definition.season.id, rows },
        ]);
        this.definitions.set(definitionId, {
            ...definition,
            season: nextSeason,
        });
    }
    archivedResults(definitionId: string) {
        return structuredClone(this.archives.get(definitionId) ?? []);
    }
}

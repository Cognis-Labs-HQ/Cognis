import type {
    LeaderboardCapability,
    LeaderboardDefinition,
    LeaderboardObservation,
    LeaderboardActor,
    StandingsQuery,
    StandingRow,
    LeaderboardTableModel,
    ProgressEvidenceCapability,
    LeaderboardClassAccessCapability,
} from "./types.js";
import type {
    ActivityScore,
    ActivityScoreInput,
    ScoringCapability,
} from "@cognis/core";
import { isDeepStrictEqual } from "node:util";
import type { LeaderboardState } from "./store.js";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,199}$/;
const privileged = new Set(["admin", "owner"]);

async function tableLabels(locale: string): Promise<Record<string, string>> {
    const normalized = locale.toLowerCase().match(/^[a-z]{2,3}/)?.[0] ?? "en";
    const filePath = path.join(
        path.dirname(fileURLToPath(import.meta.url)),
        "ui",
        "languages",
        normalized,
        "strings.xml",
    );
    let xml: string;
    try {
        xml = await readFile(filePath, "utf8");
    } catch {
        return {};
    }
    return Object.fromEntries(
        [
            ...xml.matchAll(
                /<string name="gateway\.study\.leaderboard_([^"]+)">([^<]*)<\/string>/g,
            ),
        ].map(([, key, value]) => [key, value]),
    );
}

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
    private completedStandings = new Map<string, StandingRow[]>();
    private completedParticipants = new Map<
        string,
        { participantId: string; rank: number }[]
    >();
    private persistence = Promise.resolve();

    constructor(
        private readonly progress:
            | ProgressEvidenceCapability
            | (() => ProgressEvidenceCapability | undefined),
        private readonly enabled = () => true,
        private readonly scoring?: ScoringCapability,
        private readonly classAccess?: LeaderboardClassAccessCapability,
        private readonly log?: (
            level: string,
            message: string,
            meta?: Record<string, unknown>,
        ) => void | Promise<void>,
        private readonly persistState?: (
            state: LeaderboardState,
        ) => Promise<void>,
    ) {}

    restoreState(state: LeaderboardState): void {
        this.definitions = new Map(state.definitions);
        this.observations = new Map(state.observations);
        this.invalid = new Set(state.invalid);
        this.cohorts = new Map(state.cohorts);
        this.participation = new Map(state.participation);
        this.archives = new Map(state.archives);
    }

    private state(): LeaderboardState {
        return structuredClone({
            definitions: [...this.definitions],
            observations: [...this.observations],
            invalid: [...this.invalid],
            cohorts: [...this.cohorts],
            participation: [...this.participation],
            archives: [...this.archives],
        });
    }

    private persist(): Promise<void> {
        if (!this.persistState) return Promise.resolve();
        const state = this.state();
        this.persistence = this.persistence.then(() =>
            this.persistState!(state),
        );
        return this.persistence;
    }

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
        recordedScore?: ActivityScore,
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
        const score = recordedScore ?? this.scoring.score(activity);
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

    resolveCohort(
        actor: LeaderboardActor,
        definitionId: string,
    ): string | undefined {
        this.requireEnabled();
        return this.cohorts.get(this.key(actor.accountId, definitionId));
    }

    async canAccessDefinition(
        actor: LeaderboardActor,
        definitionId: string,
        cohortId?: string,
    ): Promise<boolean> {
        this.requireEnabled();
        const definition = this.definitions.get(definitionId);
        if (!definition) return false;
        if (privileged.has(actor.role)) return true;
        if (
            cohortId &&
            this.cohorts.get(this.key(actor.accountId, definitionId)) !==
                cohortId
        )
            return false;
        if (definition.kind === "classroom")
            return (
                !!definition.classroomId &&
                !!this.classAccess &&
                this.classAccess.canRead(
                    definition.classroomId,
                    actor.accountId,
                    actor.role,
                )
            );
        return (
            this.participation.get(this.key(actor.accountId, definitionId))
                ?.optedIn === true
        );
    }

    registerDefinition(input: LeaderboardDefinition): void {
        this.requireEnabled();
        if (!IDENTIFIER_PATTERN.test(input.id) || !input.criteria.length)
            throw new Error("invalid_definition");
        if (this.definitions.has(input.id))
            throw new Error("definition_exists");
        if (
            input.minimumCohortSize !== undefined &&
            (!Number.isInteger(input.minimumCohortSize) ||
                input.minimumCohortSize < 1)
        )
            throw new Error("invalid_minimum_cohort_size");
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
                !IDENTIFIER_PATTERN.test(criterion.id) ||
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
        void this.persist();
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
            !IDENTIFIER_PATTERN.test(observation.id) ||
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
        const evidenceTimes: string[] = [];
        for (const eventId of uniqueEvidence) {
            const events = await this.progressCapability().listEvents(actor, {
                eventId,
            });
            const event = events.find(
                (candidate) =>
                    candidate.id === eventId &&
                    candidate.actorId === observation.participantId,
            );
            if (!event) throw new Error("evidence_not_found");
            const occurredAt = Date.parse(event.occurredAt);
            if (
                !Number.isFinite(occurredAt) ||
                (definition.season &&
                    (occurredAt < Date.parse(definition.season.startsAt) ||
                        occurredAt >= Date.parse(definition.season.endsAt)))
            )
                throw new Error("evidence_outside_window");
            const evidenceKey = [definition.id, criterion.id, eventId].join(
                "\0",
            );
            const duplicate = [...this.observations.values()].find(
                (candidate) =>
                    !this.invalid.has(candidate.id) &&
                    candidate.id !== observation.id &&
                    candidate.definitionId === definition.id &&
                    candidate.criterionId === criterion.id &&
                    candidate.evidenceEventIds.includes(eventId),
            );
            if (duplicate) throw new Error("evidence_already_scored");
            void evidenceKey;
            evidenceTimes.push(event.occurredAt);
        }
        const normalized = {
            ...observation,
            evidenceEventIds: uniqueEvidence,
            observedAt: evidenceTimes.sort().at(-1)!,
        };
        if (
            definition.lateJoinPolicy !== "allow" &&
            definition.season &&
            Date.parse(normalized.observedAt) >
                Date.parse(definition.season.startsAt) &&
            ![...this.observations.values()].some(
                (candidate) =>
                    candidate.definitionId === definition.id &&
                    candidate.participantId === observation.participantId &&
                    candidate.seasonId === observation.seasonId,
            )
        )
            throw new Error(
                definition.lateJoinPolicy === "nextSeason"
                    ? "participant_waiting_for_next_season"
                    : "late_join_denied",
            );
        const existing = this.observations.get(observation.id);
        if (existing) {
            if (!isDeepStrictEqual(existing, normalized))
                throw new Error("observation_id_conflict");
            return;
        }
        this.observations.set(observation.id, structuredClone(normalized));
        await this.persist();
        await this.log?.("info", "Submitted leaderboard observation.", {
            component: "study-leaderboard",
            operation: "submit_observation",
            definitionId: definition.id,
            observationId: observation.id,
            participantId: observation.participantId,
        });
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
        await this.persist();
        await this.log?.("info", "Invalidated leaderboard observation.", {
            component: "study-leaderboard",
            operation: "invalidate_observation",
            observationId,
            accountId: actor.accountId,
        });
    }

    assignCohort(
        participantId: string,
        definitionId: string,
        cohortId: string,
    ): void {
        this.requireEnabled();
        if (!this.definitions.has(definitionId))
            throw new Error("definition_not_found");
        this.cohorts.set(this.key(participantId, definitionId), cohortId);
        void this.persist();
        void this.log?.("info", "Assigned leaderboard cohort.", {
            component: "study-leaderboard",
            operation: "assign_cohort",
            participantId,
            definitionId,
            cohortId,
        });
    }
    setParticipation(
        participantId: string,
        definitionId: string,
        options: { optedIn: boolean; alias?: string },
    ): void {
        this.requireEnabled();
        const definition = this.definitions.get(definitionId);
        if (!definition) throw new Error("definition_not_found");
        if (
            options.optedIn &&
            definition.lateJoinPolicy !== "allow" &&
            definition.season &&
            Date.now() > Date.parse(definition.season.startsAt)
        )
            throw new Error(
                definition.lateJoinPolicy === "nextSeason"
                    ? "participant_waiting_for_next_season"
                    : "late_join_denied",
            );
        this.participation.set(this.key(participantId, definitionId), {
            ...options,
        });
        void this.persist();
        void this.log?.("info", "Changed leaderboard participation.", {
            component: "study-leaderboard",
            operation: "set_participation",
            participantId,
            definitionId,
            optedIn: options.optedIn,
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
            const evidenceTimes = Object.fromEntries(
                criteria.map((criterion) => {
                    const times = grouped
                        .get(criterion.id)!
                        .map((observation) =>
                            Date.parse(observation.observedAt),
                        );
                    return [
                        criterion.id,
                        {
                            earliest: Math.min(...times),
                            latest: Math.max(...times),
                        },
                    ];
                }),
            );
            return {
                participantId,
                criterionValues,
                vector,
                score,
                updatedAt,
                evidenceTimes,
            };
        });
        const compareRank = (
            a: (typeof raw)[number],
            b: (typeof raw)[number],
        ) => {
            if (definition.strategy === "weighted") {
                const scoreDifference =
                    (b.score as number) - (a.score as number);
                if (scoreDifference) return scoreDifference;
            } else {
                for (let index = 0; index < a.vector.length; index += 1)
                    if (a.vector[index] !== b.vector[index])
                        return a.vector[index] - b.vector[index];
            }
            for (const criterion of criteria) {
                const tieBreak = criterion.tieBreak;
                if (tieBreak === "participantId") continue;
                const field =
                    tieBreak === "earliestEvidence" ? "earliest" : "latest";
                const difference =
                    a.evidenceTimes[criterion.id][field] -
                    b.evidenceTimes[criterion.id][field];
                if (difference)
                    return tieBreak === "earliestEvidence"
                        ? difference
                        : -difference;
            }
            return 0;
        };
        raw.sort(
            (a, b) =>
                compareRank(a, b) ||
                a.participantId.localeCompare(b.participantId),
        );
        const snapshotKey = [
            definition.id,
            query.seasonId ?? definition.season?.id ?? "all",
            query.cohortId ?? "all",
        ].join("\0");
        const previous = this.snapshots.get(snapshotKey) ?? new Map();
        let groupRank = 0;
        const rows = raw.map((item, index) => {
            const previousItem = raw[index - 1];
            const tiedWithPrevious =
                !!previousItem && compareRank(item, previousItem) === 0;
            if (!tiedWithPrevious) groupRank = index + 1;
            const rank = groupRank;
            const participant = this.participation.get(
                this.key(item.participantId, definition.id),
            );
            const tiedWithNext =
                !!raw[index + 1] && compareRank(item, raw[index + 1]) === 0;
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
            snapshotKey,
            new Map(
                raw.map((item, index) => [
                    item.participantId,
                    rows[index].rank,
                ]),
            ),
        );
        this.completedStandings.set(snapshotKey, structuredClone(rows));
        this.completedParticipants.set(
            snapshotKey,
            raw.map((item, index) => ({
                participantId: item.participantId,
                rank: rows[index].rank,
            })),
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
        standings?: { rows: StandingRow[]; total: number },
    ): Promise<LeaderboardTableModel> {
        const definition = this.definitions.get(query.definitionId);
        if (!definition) throw new Error("definition_not_found");
        const result = standings ?? (await this.queryStandings(query));
        const localized = await tableLabels(locale);
        const labels = {
            rank: localized.rank ?? "rank",
            participant: localized.participant ?? "participant",
            score: localized.score ?? "score",
            ties: localized.ties ?? "ties",
            movement: localized.movement ?? "movement",
            updatedAt: localized.updated ?? "updatedAt",
        };
        return {
            caption: localized.caption ?? "leaderboard",
            columns: [
                { id: "rank", label: labels.rank },
                { id: "participant", label: labels.participant },
                ...definition.criteria.map((c) => ({
                    id: c.id,
                    label: c.label[locale] ?? c.id,
                })),
                { id: "score", label: labels.score },
                { id: "ties", label: labels.ties },
                { id: "movement", label: labels.movement },
                { id: "updatedAt", label: labels.updatedAt },
            ],
            rows: result.rows.map((row) => ({
                ...row,
                rankLabel: `${row.plating ? `${row.plating} ${localized.medal ?? "medal"}, ` : ""}${localized.rank_word ?? "rank"} ${row.rank}`,
                screenReaderLabel: `${row.participant.alias}, ${localized.rank_word ?? "rank"} ${row.rank}${row.tied ? `, ${localized.tied_word ?? "tied"}` : ""}`,
            })),
            total: result.total,
        };
    }

    rollover(
        definitionId: string,
        nextSeason: { id: string; startsAt: string; endsAt: string },
    ): void {
        this.requireEnabled();
        const definition = this.definitions.get(definitionId);
        if (!definition?.season || !definition.recurring)
            throw new Error("rollover_not_supported");
        const snapshotKey = [definitionId, definition.season.id, "all"].join(
            "\0",
        );
        const cohortRows = [...this.completedStandings.entries()]
            .filter(([key]) =>
                key.startsWith(`${definitionId}\0${definition.season!.id}\0`),
            )
            .flatMap(([, rows]) => rows);
        const rows = structuredClone(
            this.completedStandings.get(snapshotKey) ?? cohortRows,
        );
        const rankedParticipants = [...this.completedParticipants.entries()]
            .filter(([key]) =>
                key.startsWith(`${definitionId}\0${definition.season!.id}\0`),
            )
            .flatMap(([, participants]) => participants)
            .sort((left, right) => left.rank - right.rank);
        for (const item of rankedParticipants.slice(
            0,
            definition.promotion?.count ?? 0,
        )) {
            if (definition.promotion)
                this.cohorts.set(
                    this.key(item.participantId, definitionId),
                    definition.promotion.targetCohortId,
                );
        }
        for (const item of rankedParticipants.slice(
            Math.max(
                0,
                rankedParticipants.length - (definition.relegation?.count ?? 0),
            ),
        )) {
            if (definition.relegation)
                this.cohorts.set(
                    this.key(item.participantId, definitionId),
                    definition.relegation.targetCohortId,
                );
        }
        this.archives.set(definitionId, [
            ...(this.archives.get(definitionId) ?? []),
            { seasonId: definition.season.id, rows },
        ]);
        this.definitions.set(definitionId, {
            ...definition,
            season: nextSeason,
        });
        void this.persist();
        void this.log?.("info", "Rolled over leaderboard season.", {
            component: "study-leaderboard",
            operation: "rollover",
            definitionId,
            previousSeasonId: definition.season.id,
            nextSeasonId: nextSeason.id,
        });
    }
    archivedResults(definitionId: string) {
        this.requireEnabled();
        return structuredClone(this.archives.get(definitionId) ?? []);
    }
}

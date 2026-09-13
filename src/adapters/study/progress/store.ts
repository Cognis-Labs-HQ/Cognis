import type { LearningEvent, ProgressProjection } from "./types.js";
import type { DbExecutor } from "../../../gateways/db/reuse/db-executor.js";

export interface ProgressStore {
    append(event: LearningEvent): Promise<"inserted" | "duplicate">;
    all(): Promise<LearningEvent[]>;
    replaceProjections(projections: ProgressProjection[]): Promise<void>;
    projections(): Promise<ProgressProjection[]>;
}

export class MemoryProgressStore implements ProgressStore {
    private readonly events = new Map<string, LearningEvent>();
    private currentProjections: ProgressProjection[] = [];

    async append(event: LearningEvent): Promise<"inserted" | "duplicate"> {
        const existing = this.events.get(event.id);
        if (existing) {
            if (JSON.stringify(existing) !== JSON.stringify(event)) {
                throw new Error("event_id_conflict");
            }
            return "duplicate";
        }
        if (
            event.compensatesEventId &&
            Array.from(this.events.values()).some(
                (candidate) =>
                    candidate.compensatesEventId === event.compensatesEventId,
            )
        ) {
            throw new Error("event_already_corrected");
        }
        this.events.set(event.id, structuredClone(event));
        return "inserted";
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

function parseJson<Value>(value: unknown): Value {
    return JSON.parse(String(value)) as Value;
}

export class DbProgressStore implements ProgressStore {
    constructor(private readonly db: DbExecutor) {}

    async ensureSchema(): Promise<void> {
        await this.db.ensureTable({
            name: "study_progress_events",
            columns: [
                { name: "event_id", type: "text", primaryKey: true },
                { name: "actor_id", type: "text", notNull: true },
                { name: "occurred_at", type: "timestamp", notNull: true },
                { name: "compensates_event_id", type: "text", unique: true },
                { name: "event_json", type: "text", notNull: true },
            ],
        });
        await this.db.ensureTable({
            name: "study_progress_projections",
            columns: [
                { name: "projection_id", type: "text", primaryKey: true },
                { name: "actor_id", type: "text", notNull: true },
                { name: "projection_json", type: "text", notNull: true },
            ],
        });
    }

    async append(event: LearningEvent): Promise<"inserted" | "duplicate"> {
        return this.db.transaction(async (databaseExecutor) => {
            const insertion = await databaseExecutor.executeCommand({
                option: "INSERT",
                table: "study_progress_events",
                values: {
                    event_id: event.id,
                    actor_id: event.actorId,
                    occurred_at: event.occurredAt,
                    compensates_event_id: event.compensatesEventId ?? null,
                    event_json: JSON.stringify(event),
                },
                conflict: { action: "ignore" },
            });
            if (insertion.rowCount !== 0) return "inserted";
            const existing = await databaseExecutor.executeCommand({
                option: "SELECT",
                table: "study_progress_events",
                where: [{ column: "event_id", value: event.id }],
            });
            const stored = existing.rows?.[0];
            if (!stored && event.compensatesEventId) {
                const correction = await databaseExecutor.executeCommand({
                    option: "SELECT",
                    table: "study_progress_events",
                    columns: ["event_id"],
                    where: [
                        {
                            column: "compensates_event_id",
                            value: event.compensatesEventId,
                        },
                    ],
                });
                if (correction.rows?.length) {
                    throw new Error("event_already_corrected");
                }
            }
            if (
                !stored ||
                JSON.stringify(parseJson<LearningEvent>(stored.event_json)) !==
                    JSON.stringify(event)
            ) {
                throw new Error("event_id_conflict");
            }
            return "duplicate";
        });
    }

    async all(): Promise<LearningEvent[]> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "study_progress_events",
            orderBy: [{ column: "occurred_at", direction: "ASC" }],
        });
        return (result.rows ?? []).map((row) =>
            parseJson<LearningEvent>(row.event_json),
        );
    }

    async replaceProjections(projections: ProgressProjection[]): Promise<void> {
        await this.db.transaction(async (databaseExecutor) => {
            await databaseExecutor.executeCommand({
                option: "DELETE",
                table: "study_progress_projections",
            });
            for (const projection of projections) {
                const content = projection.content;
                await databaseExecutor.executeCommand({
                    option: "INSERT",
                    table: "study_progress_projections",
                    values: {
                        projection_id: [
                            projection.actorId,
                            content.schema,
                            content.layer,
                            content.language,
                            content.contentId,
                        ].join("\u0000"),
                        actor_id: projection.actorId,
                        projection_json: JSON.stringify(projection),
                    },
                });
            }
        });
    }

    async projections(): Promise<ProgressProjection[]> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "study_progress_projections",
        });
        return (result.rows ?? []).map((row) =>
            parseJson<ProgressProjection>(row.projection_json),
        );
    }
}

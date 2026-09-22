import type { DbExecutor } from "../../../gateways/db/reuse/db-executor.js";
import type {
    LeaderboardDefinition,
    LeaderboardObservation,
    StandingRow,
} from "./types.js";

export interface LeaderboardState {
    definitions: [string, LeaderboardDefinition][];
    observations: [string, LeaderboardObservation][];
    invalid: string[];
    cohorts: [string, string][];
    participation: [string, { optedIn: boolean; alias?: string }][];
    archives: [string, { seasonId: string; rows: StandingRow[] }[]][];
}

export interface LeaderboardStore {
    load(): Promise<LeaderboardState | undefined>;
    save(state: LeaderboardState): Promise<void>;
}

export class DbLeaderboardStore implements LeaderboardStore {
    constructor(private readonly db: DbExecutor) {}

    async ensureSchema(): Promise<void> {
        await this.db.ensureTable({
            name: "study_leaderboard_state",
            columns: [
                { name: "state_id", type: "text", primaryKey: true },
                { name: "state_json", type: "text", notNull: true },
            ],
        });
    }

    async load(): Promise<LeaderboardState | undefined> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "study_leaderboard_state",
            where: [{ column: "state_id", value: "current" }],
        });
        const value = result.rows?.[0]?.state_json;
        return value
            ? (JSON.parse(String(value)) as LeaderboardState)
            : undefined;
    }

    async save(state: LeaderboardState): Promise<void> {
        await this.db.transaction(async (db) => {
            await db.executeCommand({
                option: "DELETE",
                table: "study_leaderboard_state",
                where: [{ column: "state_id", value: "current" }],
            });
            await db.executeCommand({
                option: "INSERT",
                table: "study_leaderboard_state",
                values: {
                    state_id: "current",
                    state_json: JSON.stringify(state),
                },
            });
        });
    }
}

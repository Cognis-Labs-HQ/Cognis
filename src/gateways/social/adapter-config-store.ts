import type { DbExecutor } from "../db/reuse/db-executor.js";
import type { SupportedDbType } from "../db/executor.js";

export interface AdapterConfigStore {
    getConfig(adapterId: string): Promise<Record<string, unknown> | null>;
    saveConfig(
        adapterId: string,
        config: Record<string, unknown>,
    ): Promise<void>;
}

export class DbAdapterConfigStore implements AdapterConfigStore {
    constructor(
        private readonly db: DbExecutor,
        private readonly dbType: SupportedDbType,
    ) {}

    private placeholder(index: number): string {
        return this.dbType === "postgresql" ? `$${index}` : "?";
    }

    async ensureSchema(): Promise<void> {
        await this.db
            .execute(`CREATE TABLE IF NOT EXISTS social_adapter_configs (
      adapter_id VARCHAR(191) PRIMARY KEY,
      config_json TEXT NOT NULL
    )`);
    }

    async getConfig(
        adapterId: string,
    ): Promise<Record<string, unknown> | null> {
        const result = await this.db.execute(
            `SELECT config_json FROM social_adapter_configs WHERE adapter_id = ${this.placeholder(1)}`,
            [adapterId],
        );
        const row = result.rows?.[0];
        if (!row) return null;
        return JSON.parse(row.config_json) as Record<string, unknown>;
    }

    async saveConfig(
        adapterId: string,
        config: Record<string, unknown>,
    ): Promise<void> {
        const json = JSON.stringify(config);
        if (this.dbType === "mariadb") {
            await this.db.execute(
                `INSERT INTO social_adapter_configs (adapter_id, config_json)
         VALUES (${this.placeholder(1)}, ${this.placeholder(2)})
         ON DUPLICATE KEY UPDATE config_json = VALUES(config_json)`,
                [adapterId, json],
            );
            return;
        }
        await this.db.execute(
            `INSERT INTO social_adapter_configs (adapter_id, config_json)
       VALUES (${this.placeholder(1)}, ${this.placeholder(2)})
       ON CONFLICT (adapter_id) DO UPDATE SET config_json = EXCLUDED.config_json`,
            [adapterId, json],
        );
    }
}

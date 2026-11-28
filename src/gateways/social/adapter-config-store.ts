import type { DbExecutor } from "../db/reuse/db-executor.js";

export interface AdapterConfigStore {
    getConfig(adapterId: string): Promise<Record<string, unknown> | null>;
    saveConfig(
        adapterId: string,
        config: Record<string, unknown>,
    ): Promise<void>;
}

class DatabaseAdapterConfigStore implements AdapterConfigStore {
    constructor(private readonly database: DbExecutor) {}

    async ensureSchema(): Promise<void> {
        await this.database.ensureTable({
            name: "social_adapter_configs",
            columns: [
                {
                    name: "adapter_id",
                    type: "text",
                    notNull: true,
                    primaryKey: true,
                },
                { name: "config_json", type: "text", notNull: true },
            ],
        });
    }

    async getConfig(
        adapterId: string,
    ): Promise<Record<string, unknown> | null> {
        const result = await this.database.executeCommand({
            option: "SELECT",
            table: "social_adapter_configs",
            columns: ["config_json"],
            where: [{ column: "adapter_id", value: adapterId }],
            limit: 1,
        });
        const row = result.rows?.[0];
        if (!row) return null;
        return JSON.parse(row.config_json) as Record<string, unknown>;
    }

    async saveConfig(
        adapterId: string,
        config: Record<string, unknown>,
    ): Promise<void> {
        const json = JSON.stringify(config);
        await this.database.executeCommand({
            option: "INSERT",
            table: "social_adapter_configs",
            values: {
                adapter_id: adapterId,
                config_json: json,
            },
            conflict: {
                action: "update",
                target: ["adapter_id"],
                update: {
                    config_json: json,
                },
            },
        });
    }
}
export { DatabaseAdapterConfigStore };

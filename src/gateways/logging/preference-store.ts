import type { DbExecutor } from "../db/reuse/db-executor.js";

export type LoggingPreferenceValue = string | number | boolean;

export class LoggingPreferenceStore {
    constructor(private readonly db: DbExecutor) {}

    async ensureSchema(): Promise<void> {
        await this.db.ensureTable({
            name: "logging_adapter_preferences",
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

    async getAll(): Promise<
        Map<string, Record<string, LoggingPreferenceValue>>
    > {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "logging_adapter_preferences",
            columns: ["adapter_id", "config_json"],
        });
        return new Map(
            (result.rows ?? []).map((row) => [
                String(row.adapter_id),
                JSON.parse(String(row.config_json)) as Record<
                    string,
                    LoggingPreferenceValue
                >,
            ]),
        );
    }

    async set(
        adapterId: string,
        config: Record<string, LoggingPreferenceValue>,
    ): Promise<void> {
        const configJson = JSON.stringify(config);
        await this.db.executeCommand({
            option: "INSERT",
            table: "logging_adapter_preferences",
            values: {
                adapter_id: adapterId,
                config_json: configJson,
            },
            conflict: {
                action: "update",
                target: ["adapter_id"],
                update: { config_json: configJson },
            },
        });
    }

    async delete(adapterId: string): Promise<void> {
        await this.db.executeCommand({
            option: "DELETE",
            table: "logging_adapter_preferences",
            where: [{ column: "adapter_id", value: adapterId }],
        });
    }
}

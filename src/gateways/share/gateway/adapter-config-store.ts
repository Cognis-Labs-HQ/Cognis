import type { DbExecutor } from "../../db/reuse/db-executor.js";

export interface ShareAdapterConfigStoreContract {
    list(): Promise<Array<{ adapterId: string; enabled: boolean }>>;
    save(adapterId: string, enabled: boolean): Promise<void>;
}

export class ShareAdapterConfigStore implements ShareAdapterConfigStoreContract {
    constructor(private readonly db: DbExecutor) {}

    async ensureSchema(): Promise<void> {
        await this.db.ensureTable({
            name: "share_adapter_configs",
            columns: [
                { name: "adapter_id", type: "text", primaryKey: true },
                { name: "enabled", type: "integer", notNull: true },
            ],
        });
    }

    async list(): Promise<Array<{ adapterId: string; enabled: boolean }>> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "share_adapter_configs",
            columns: ["adapter_id", "enabled"],
        });
        return (result.rows ?? []).map((row) => ({
            adapterId: String(row.adapter_id ?? ""),
            enabled: row.enabled === true || Number(row.enabled) === 1,
        }));
    }

    async save(adapterId: string, enabled: boolean): Promise<void> {
        await this.db.executeCommand({
            option: "INSERT",
            table: "share_adapter_configs",
            values: { adapter_id: adapterId, enabled: enabled ? 1 : 0 },
            conflict: {
                action: "update",
                target: ["adapter_id"],
                update: { enabled: enabled ? 1 : 0 },
            },
        });
    }
}

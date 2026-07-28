import type { DbExecutor } from "../../../gateways/db/reuse/db-executor.js";

export interface KeyringVaultStore {
    ensureSchema(): Promise<void>;
    get(accountId: string): Promise<string | null>;
    set(accountId: string, vaultJson: string): Promise<void>;
    delete(accountId: string): Promise<void>;
}

export class DbKeyringVaultStore implements KeyringVaultStore {
    constructor(private readonly db: DbExecutor) {}

    async ensureSchema(): Promise<void> {
        await this.db.ensureTable({
            name: "auth_keyring_vaults",
            columns: [
                {
                    name: "account_id",
                    type: "text",
                    notNull: true,
                    primaryKey: true,
                },
                { name: "vault_json", type: "text", notNull: true },
                { name: "updated_at", type: "text", notNull: true },
            ],
        });
    }

    async get(accountId: string): Promise<string | null> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "auth_keyring_vaults",
            columns: ["vault_json"],
            where: [{ column: "account_id", value: accountId }],
            limit: 1,
        });
        const value = result.rows?.[0]?.vault_json;
        return typeof value === "string" ? value : null;
    }

    async set(accountId: string, vaultJson: string): Promise<void> {
        const updatedAt = new Date().toISOString();
        await this.db.executeCommand({
            option: "INSERT",
            table: "auth_keyring_vaults",
            values: {
                account_id: accountId,
                vault_json: vaultJson,
                updated_at: updatedAt,
            },
            conflict: {
                action: "update",
                target: ["account_id"],
                update: { vault_json: vaultJson, updated_at: updatedAt },
            },
        });
    }

    async delete(accountId: string): Promise<void> {
        await this.db.executeCommand({
            option: "DELETE",
            table: "auth_keyring_vaults",
            where: [{ column: "account_id", value: accountId }],
        });
    }
}

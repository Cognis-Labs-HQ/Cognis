import { textChunks } from "../../../gateways/reuse/text-chunks.js";

export interface KeyringDbExecutor {
    transaction<T>(
        operation: (db: KeyringDbExecutor) => Promise<T>,
    ): Promise<T>;
    ensureTable(input: {
        name: string;
        columns: Array<Record<string, unknown>>;
        primaryKey?: string[];
    }): Promise<void>;
    executeCommand(
        input: Record<string, unknown>,
    ): Promise<{ rows?: Array<Record<string, unknown>> }>;
}

export interface KeyringVaultStore {
    ensureSchema(): Promise<void>;
    get(accountId: string): Promise<string | null>;
    set(accountId: string, vaultJson: string): Promise<void>;
    delete(accountId: string): Promise<void>;
}

export class DbKeyringVaultStore implements KeyringVaultStore {
    private readonly db: KeyringDbExecutor;

    constructor(db: unknown) {
        this.db = db as KeyringDbExecutor;
    }

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
        await this.db.ensureTable({
            name: "auth_keyring_vault_parts",
            columns: [
                { name: "account_id", type: "text", notNull: true },
                { name: "position", type: "integer", notNull: true },
                { name: "vault_text", type: "text", notNull: true },
            ],
            primaryKey: ["account_id", "position"],
        });
    }

    async get(accountId: string): Promise<string | null> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "auth_keyring_vaults",
            alias: "vault",
            columns: [
                { col: "vault.vault_json", as: "first_chunk" },
                { col: "parts.vault_text", as: "part" },
            ],
            joins: [
                {
                    type: "LEFT",
                    table: "auth_keyring_vault_parts",
                    alias: "parts",
                    on: {
                        leftColumn: "vault.account_id",
                        rightColumn: "parts.account_id",
                    },
                },
            ],
            where: [{ column: "vault.account_id", value: accountId }],
            orderBy: [{ column: "parts.position", direction: "ASC" }],
        });
        if (!result.rows?.length) return null;
        return (
            String(result.rows[0].first_chunk) +
            result.rows
                .map((row) => (typeof row.part === "string" ? row.part : ""))
                .join("")
        );
    }

    async set(accountId: string, vaultJson: string): Promise<void> {
        const updatedAt = new Date().toISOString();
        await this.db.transaction(async (db) => {
            await db.executeCommand({
                option: "DELETE",
                table: "auth_keyring_vault_parts",
                where: [{ column: "account_id", value: accountId }],
            });
            let index = 0;
            for (const chunk of textChunks(vaultJson, 60_000)) {
                if (index === 0) {
                    const values = {
                        account_id: accountId,
                        vault_json: chunk,
                        updated_at: updatedAt,
                    };
                    await db.executeCommand({
                        option: "INSERT",
                        table: "auth_keyring_vaults",
                        values,
                        conflict: {
                            action: "update",
                            target: ["account_id"],
                            update: {
                                vault_json: chunk,
                                updated_at: updatedAt,
                            },
                        },
                    });
                } else
                    await db.executeCommand({
                        option: "INSERT",
                        table: "auth_keyring_vault_parts",
                        values: {
                            account_id: accountId,
                            position: index,
                            vault_text: chunk,
                        },
                    });
                index++;
            }
        });
    }

    async delete(accountId: string): Promise<void> {
        await this.db.transaction(async (db) => {
            for (const table of [
                "auth_keyring_vault_parts",
                "auth_keyring_vaults",
            ])
                await db.executeCommand({
                    option: "DELETE",
                    table,
                    where: [{ column: "account_id", value: accountId }],
                });
        });
    }
}

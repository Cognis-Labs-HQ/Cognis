import { createHash } from "node:crypto";
import type { DbExecutor } from "../../db/reuse/db-executor.js";

type RawRow = Record<string, unknown>;

function nowIso(): string {
    return new Date().toISOString();
}

function normalizeBoolean(value: unknown): boolean {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    if (typeof value === "string") {
        return value === "1" || value.toLowerCase() === "true";
    }
    return false;
}

function parseJsonObject(value: unknown): Record<string, unknown> {
    if (typeof value !== "string" || !value.trim()) return {};
    try {
        const parsed = JSON.parse(value) as Record<string, unknown>;
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
        return {};
    }
}

function hashRecoveryCode(code: string): string {
    return createHash("sha256").update(code.trim()).digest("hex");
}

export interface StoredTfaMethod {
    accountId: string;
    methodId: string;
    enabled: boolean;
    sortOrder: number;
    configuredAt: string | null;
    updatedAt: string;
    state: Record<string, unknown>;
}

export interface PendingTfaSetup {
    setupId: string;
    accountId: string;
    methodId: string;
    payload: Record<string, unknown>;
    createdAt: string;
    expiresAt: string;
}

export class DbTfaStore {
    constructor(private readonly db: DbExecutor) {}

    async ensureSchema(): Promise<void> {
        await this.db.ensureTable({
            name: "tfa_adapter_configs",
            columns: [
                {
                    name: "adapter_id",
                    type: "text",
                    notNull: true,
                    primaryKey: true,
                },
                { name: "enabled", type: "integer", notNull: true, default: 0 },
                {
                    name: "config_json",
                    type: "text",
                    notNull: true,
                    default: "{}",
                },
            ],
        });

        await this.db.ensureTable({
            name: "tfa_user_methods",
            columns: [
                { name: "account_id", type: "text", notNull: true },
                { name: "method_id", type: "text", notNull: true },
                { name: "enabled", type: "integer", notNull: true, default: 0 },
                {
                    name: "sort_order",
                    type: "integer",
                    notNull: true,
                    default: 0,
                },
                {
                    name: "state_json",
                    type: "text",
                    notNull: true,
                    default: "{}",
                },
                { name: "configured_at", type: "text" },
                {
                    name: "updated_at",
                    type: "text",
                    notNull: true,
                    default: "",
                },
            ],
            primaryKey: ["account_id", "method_id"],
            indexes: [
                { columns: ["account_id"] },
                { columns: ["account_id", "enabled"] },
            ],
        });

        await this.db.ensureTable({
            name: "tfa_pending_setups",
            columns: [
                {
                    name: "setup_id",
                    type: "text",
                    notNull: true,
                    primaryKey: true,
                },
                { name: "account_id", type: "text", notNull: true },
                { name: "method_id", type: "text", notNull: true },
                {
                    name: "payload_json",
                    type: "text",
                    notNull: true,
                    default: "{}",
                },
                {
                    name: "created_at",
                    type: "text",
                    notNull: true,
                    default: "",
                },
                {
                    name: "expires_at",
                    type: "text",
                    notNull: true,
                    default: "",
                },
            ],
            indexes: [{ columns: ["account_id"] }, { columns: ["expires_at"] }],
        });

        await this.db.ensureTable({
            name: "tfa_recovery_codes",
            columns: [
                { name: "account_id", type: "text", notNull: true },
                { name: "code_hash", type: "text", notNull: true },
                {
                    name: "created_at",
                    type: "text",
                    notNull: true,
                    default: "",
                },
                { name: "used_at", type: "text" },
            ],
            primaryKey: ["account_id", "code_hash"],
            indexes: [{ columns: ["account_id"] }],
        });

        await this.db.ensureTable({
            name: "tfa_system_settings",
            columns: [
                {
                    name: "settings_id",
                    type: "text",
                    notNull: true,
                    primaryKey: true,
                },
                {
                    name: "enforce_all_users",
                    type: "integer",
                    notNull: true,
                    default: 0,
                },
                {
                    name: "updated_at",
                    type: "text",
                    notNull: true,
                    default: "",
                },
            ],
        });
    }

    async listAdapterConfigs(): Promise<
        Array<{
            adapterId: string;
            enabled: boolean;
            config: Record<string, unknown>;
        }>
    > {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "tfa_adapter_configs",
            columns: ["adapter_id", "enabled", "config_json"],
        });
        return (result.rows ?? []).map((row) => ({
            adapterId: String(row.adapter_id ?? ""),
            enabled: normalizeBoolean(row.enabled),
            config: parseJsonObject(row.config_json),
        }));
    }

    async saveAdapterConfig(
        adapterId: string,
        enabled: boolean,
        config: Record<string, unknown>,
    ): Promise<void> {
        await this.db.executeCommand({
            option: "INSERT",
            table: "tfa_adapter_configs",
            values: {
                adapter_id: adapterId,
                enabled: enabled ? 1 : 0,
                config_json: JSON.stringify(config),
            },
            conflict: {
                action: "update",
                target: ["adapter_id"],
                update: {
                    enabled: enabled ? 1 : 0,
                    config_json: JSON.stringify(config),
                },
            },
        });
    }

    async listUserMethods(accountId: string): Promise<StoredTfaMethod[]> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "tfa_user_methods",
            columns: [
                "account_id",
                "method_id",
                "enabled",
                "sort_order",
                "state_json",
                "configured_at",
                "updated_at",
            ],
            where: [{ column: "account_id", value: accountId }],
            orderBy: [{ column: "sort_order", direction: "ASC" }],
        });
        return (result.rows ?? []).map((row) => ({
            accountId: String(row.account_id ?? accountId),
            methodId: String(row.method_id ?? ""),
            enabled: normalizeBoolean(row.enabled),
            sortOrder: Number(row.sort_order ?? 0),
            state: parseJsonObject(row.state_json),
            configuredAt: row.configured_at ? String(row.configured_at) : null,
            updatedAt: String(row.updated_at ?? nowIso()),
        }));
    }

    async upsertUserMethod(input: {
        accountId: string;
        methodId: string;
        enabled: boolean;
        sortOrder: number;
        state: Record<string, unknown>;
        configuredAt?: string | null;
    }): Promise<void> {
        const updatedAt = nowIso();
        await this.db.executeCommand({
            option: "INSERT",
            table: "tfa_user_methods",
            values: {
                account_id: input.accountId,
                method_id: input.methodId,
                enabled: input.enabled ? 1 : 0,
                sort_order: input.sortOrder,
                state_json: JSON.stringify(input.state),
                configured_at: input.configuredAt ?? null,
                updated_at: updatedAt,
            },
            conflict: {
                action: "update",
                target: ["account_id", "method_id"],
                update: {
                    enabled: input.enabled ? 1 : 0,
                    sort_order: input.sortOrder,
                    state_json: JSON.stringify(input.state),
                    configured_at: input.configuredAt ?? null,
                    updated_at: updatedAt,
                },
            },
        });
    }

    async getNextSortOrder(accountId: string): Promise<number> {
        const methods = await this.listUserMethods(accountId);
        if (methods.length === 0) return 0;
        return Math.max(...methods.map((method) => method.sortOrder)) + 1;
    }

    async setPreferredOrder(
        accountId: string,
        preferredMethodIds: string[],
    ): Promise<void> {
        const methods = await this.listUserMethods(accountId);
        const methodById = new Map(
            methods.map((method) => [method.methodId, method]),
        );
        const reordered: StoredTfaMethod[] = [];

        for (const methodId of preferredMethodIds) {
            const match = methodById.get(methodId);
            if (!match || !match.enabled) continue;
            reordered.push(match);
            methodById.delete(methodId);
        }

        const remaining = Array.from(methodById.values())
            .filter((method) => method.enabled)
            .sort((left, right) => left.sortOrder - right.sortOrder);

        const merged = [...reordered, ...remaining];

        for (let i = 0; i < merged.length; i += 1) {
            const method = merged[i];
            await this.db.executeCommand({
                option: "UPDATE",
                table: "tfa_user_methods",
                set: {
                    sort_order: i,
                    updated_at: nowIso(),
                },
                where: [
                    { column: "account_id", value: accountId },
                    { column: "method_id", value: method.methodId },
                ],
            });
        }
    }

    async savePendingSetup(input: {
        setupId: string;
        accountId: string;
        methodId: string;
        payload: Record<string, unknown>;
        expiresAt: string;
    }): Promise<void> {
        await this.db.executeCommand({
            option: "INSERT",
            table: "tfa_pending_setups",
            values: {
                setup_id: input.setupId,
                account_id: input.accountId,
                method_id: input.methodId,
                payload_json: JSON.stringify(input.payload),
                created_at: nowIso(),
                expires_at: input.expiresAt,
            },
            conflict: {
                action: "update",
                target: ["setup_id"],
                update: {
                    account_id: input.accountId,
                    method_id: input.methodId,
                    payload_json: JSON.stringify(input.payload),
                    expires_at: input.expiresAt,
                },
            },
        });
    }

    async getPendingSetup(setupId: string): Promise<PendingTfaSetup | null> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "tfa_pending_setups",
            columns: [
                "setup_id",
                "account_id",
                "method_id",
                "payload_json",
                "created_at",
                "expires_at",
            ],
            where: [{ column: "setup_id", value: setupId }],
            limit: 1,
        });

        const row = result.rows?.[0] as RawRow | undefined;
        if (!row) return null;
        return {
            setupId: String(row.setup_id ?? ""),
            accountId: String(row.account_id ?? ""),
            methodId: String(row.method_id ?? ""),
            payload: parseJsonObject(row.payload_json),
            createdAt: String(row.created_at ?? nowIso()),
            expiresAt: String(row.expires_at ?? nowIso()),
        };
    }

    async deletePendingSetup(setupId: string): Promise<void> {
        await this.db.executeCommand({
            option: "DELETE",
            table: "tfa_pending_setups",
            where: [{ column: "setup_id", value: setupId }],
        });
    }

    async pruneExpiredPendingSetups(now = Date.now()): Promise<void> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "tfa_pending_setups",
            columns: ["setup_id", "expires_at"],
        });

        const expiredIds = (result.rows ?? [])
            .filter((row) => {
                const expiresAt = String(row.expires_at ?? "");
                return (
                    Number.isFinite(Date.parse(expiresAt)) &&
                    Date.parse(expiresAt) < now
                );
            })
            .map((row) => String(row.setup_id ?? ""));

        for (const setupId of expiredIds) {
            await this.deletePendingSetup(setupId);
        }
    }

    async replaceRecoveryCodes(
        accountId: string,
        recoveryCodes: string[],
    ): Promise<void> {
        await this.db.transaction(async (executor) => {
            await executor.executeCommand({
                option: "DELETE",
                table: "tfa_recovery_codes",
                where: [{ column: "account_id", value: accountId }],
            });
            for (const recoveryCode of recoveryCodes) {
                await executor.executeCommand({
                    option: "INSERT",
                    table: "tfa_recovery_codes",
                    values: {
                        account_id: accountId,
                        code_hash: hashRecoveryCode(recoveryCode),
                        created_at: nowIso(),
                        used_at: null,
                    },
                });
            }
        });
    }

    async hasUnusedRecoveryCodes(accountId: string): Promise<boolean> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "tfa_recovery_codes",
            columns: ["code_hash"],
            where: [
                { column: "account_id", value: accountId },
                { column: "used_at", operator: "IS NULL" },
            ],
            limit: 1,
        });
        return (result.rows?.length ?? 0) > 0;
    }

    async consumeRecoveryCode(
        accountId: string,
        recoveryCode: string,
    ): Promise<boolean> {
        const codeHash = hashRecoveryCode(recoveryCode);
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "tfa_recovery_codes",
            columns: ["code_hash"],
            where: [
                { column: "account_id", value: accountId },
                { column: "code_hash", value: codeHash },
                { column: "used_at", operator: "IS NULL" },
            ],
            limit: 1,
        });

        if ((result.rows?.length ?? 0) === 0) return false;

        await this.db.executeCommand({
            option: "UPDATE",
            table: "tfa_recovery_codes",
            set: { used_at: nowIso() },
            where: [
                { column: "account_id", value: accountId },
                { column: "code_hash", value: codeHash },
            ],
        });

        return true;
    }

    async clearUserState(accountId: string): Promise<void> {
        await this.db.transaction(async (executor) => {
            await executor.executeCommand({
                option: "DELETE",
                table: "tfa_user_methods",
                where: [{ column: "account_id", value: accountId }],
            });
            await executor.executeCommand({
                option: "DELETE",
                table: "tfa_pending_setups",
                where: [{ column: "account_id", value: accountId }],
            });
            await executor.executeCommand({
                option: "DELETE",
                table: "tfa_recovery_codes",
                where: [{ column: "account_id", value: accountId }],
            });
        });
    }

    async getEnforceAllUsers(): Promise<boolean> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "tfa_system_settings",
            columns: ["enforce_all_users"],
            where: [{ column: "settings_id", value: "__system__" }],
            limit: 1,
        });
        const row = result.rows?.[0];
        if (!row) return false;
        return normalizeBoolean(row.enforce_all_users);
    }

    async setEnforceAllUsers(required: boolean): Promise<void> {
        await this.db.executeCommand({
            option: "INSERT",
            table: "tfa_system_settings",
            values: {
                settings_id: "__system__",
                enforce_all_users: required ? 1 : 0,
                updated_at: nowIso(),
            },
            conflict: {
                action: "update",
                target: ["settings_id"],
                update: {
                    enforce_all_users: required ? 1 : 0,
                    updated_at: nowIso(),
                },
            },
        });
    }
}

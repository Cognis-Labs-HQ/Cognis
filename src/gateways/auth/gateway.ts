import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { AuthContext, AuthGateway, FlowApi } from "@cognis/core";
import type { DbExecutor } from "../../gateways/db/reuse/db-executor.js";
import type { LocalAccountStore } from "./reuse/local-account-store.js";

export type { AuthContext, AuthGateway };

export interface AuthConfigField {
    key: string;
    label: string;
    type: "text" | "password" | "number" | "boolean";
    required: boolean;
    envVar?: string;
}

export interface AuthProviderAdapter {
    readonly id: string;
    readonly name: string;
    readonly version?: string;
    authenticate(
        credentials: Record<string, unknown>,
    ): Promise<AuthContext | null>;
    getConfigSchema(): AuthConfigField[];
    configure(config: Record<string, unknown>): void;
    getPasswordResetSupport?(): { supported: boolean; reason?: string };
    registerFlowHooks?(
        flow: FlowApi,
        options?: {
            enabled?: boolean;
        },
    ): void;
    resetPassword?(
        accountId: string,
        currentPasswordOrNextPassword: string,
        nextPassword?: string,
    ): Promise<{ updated: boolean; message?: string }>;
}

export interface AdapterInfo {
    id: string;
    name: string;
    version?: string;
    enabled: boolean;
    locked?: boolean;
    config: Record<string, unknown>;
    schema: AuthConfigField[];
    requires?: string[];
}

export class CoreAuthGateway {
    private readonly adapters = new Map<string, AuthProviderAdapter>();
    private readonly enabledAdapters = new Set<string>();
    private readonly adapterRequires = new Map<string, string[]>();
    private localAdapter:
        | (AuthProviderAdapter & {
              register(
                  username: string,
                  password: string,
                  role?: "user" | "teacher" | "moderator" | "admin",
              ): Promise<{
                  username: string;
                  role?: string;
                  enabled: boolean;
              }>;
              updateLastLogin(username: string): Promise<void>;
              store: LocalAccountStore;
          })
        | null = null;

    constructor(private readonly db: DbExecutor) {}

    async ensureSchema(): Promise<void> {
        await this.db.ensureTable({
            name: "auth_adapter_configs",
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
    }

    registerAdapter(adapter: AuthProviderAdapter, requires?: string[]): void {
        this.adapters.set(adapter.id, adapter);
        if (requires && requires.length > 0) {
            this.adapterRequires.set(adapter.id, requires);
        }
    }

    setLocalAdapter(
        adapter: AuthProviderAdapter & {
            register(
                username: string,
                password: string,
                role?: "user" | "teacher" | "moderator" | "admin",
            ): Promise<{
                username: string;
                role?: string;
                enabled: boolean;
            }>;
            updateLastLogin(username: string): Promise<void>;
            store: LocalAccountStore;
        },
    ): void {
        this.localAdapter = adapter;
        this.adapters.set(adapter.id, adapter);
        this.enabledAdapters.add(adapter.id);
    }

    async loadPersistedConfigs(): Promise<void> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "auth_adapter_configs",
            columns: ["adapter_id", "enabled", "config_json"],
        });
        for (const row of result.rows ?? []) {
            const adapterId = String(row.adapter_id);
            const adapter = this.adapters.get(adapterId);
            if (!adapter) continue;
            if (Boolean(row.enabled)) {
                this.enabledAdapters.add(adapterId);
            } else if (adapterId !== "local") {
                this.enabledAdapters.delete(adapterId);
            }
            try {
                const config = JSON.parse(String(row.config_json)) as Record<
                    string,
                    unknown
                >;
                adapter.configure(config);
            } catch {
                // Malformed JSON — skip silently
            }
        }
    }

    async saveAdapterConfig(
        adapterId: string,
        config: Record<string, unknown>,
    ): Promise<void> {
        const adapter = this.adapters.get(adapterId);
        if (!adapter) return;
        const { enabled: enabledValue, ...adapterConfig } = config;
        if (
            enabledValue === false ||
            enabledValue === "false" ||
            enabledValue === 0
        ) {
            if (adapterId !== "local") {
                this.enabledAdapters.delete(adapterId);
            }
        } else if (
            enabledValue === true ||
            enabledValue === "true" ||
            enabledValue === 1
        ) {
            this.enabledAdapters.add(adapterId);
        }
        adapter.configure(adapterConfig);
        const json = JSON.stringify(adapterConfig);
        const enabled = this.enabledAdapters.has(adapterId) ? 1 : 0;
        await this.db.executeCommand({
            option: "INSERT",
            table: "auth_adapter_configs",
            values: {
                adapter_id: adapterId,
                enabled,
                config_json: json,
            },
            conflict: {
                action: "update",
                target: ["adapter_id"],
                update: {
                    config_json: json,
                    enabled,
                },
            },
        });
    }

    async enableAdapter(adapterId: string): Promise<void> {
        this.enabledAdapters.add(adapterId);
        const adapter = this.adapters.get(adapterId);
        if (!adapter) return;
        const existing = await this.getPersistedConfig(adapterId);
        await this.persistAdapterState(adapterId, true, existing);
    }

    async disableAdapter(adapterId: string): Promise<void> {
        if (adapterId === "local") return;
        this.enabledAdapters.delete(adapterId);
        const existing = await this.getPersistedConfig(adapterId);
        await this.persistAdapterState(adapterId, false, existing);
    }

    async getPersistedConfig(
        adapterId: string,
    ): Promise<Record<string, unknown>> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "auth_adapter_configs",
            columns: ["config_json"],
            where: [{ column: "adapter_id", value: adapterId }],
            limit: 1,
        });
        const row = result.rows?.[0];
        if (!row) return {};
        try {
            return JSON.parse(String(row.config_json)) as Record<
                string,
                unknown
            >;
        } catch {
            return {};
        }
    }

    private async persistAdapterState(
        adapterId: string,
        enabled: boolean,
        config: Record<string, unknown>,
    ): Promise<void> {
        const json = JSON.stringify(config);
        const enabledInt = enabled ? 1 : 0;
        await this.db.executeCommand({
            option: "INSERT",
            table: "auth_adapter_configs",
            values: {
                adapter_id: adapterId,
                enabled: enabledInt,
                config_json: json,
            },
            conflict: {
                action: "update",
                target: ["adapter_id"],
                update: {
                    enabled: enabledInt,
                },
            },
        });
    }

    getAdapter(adapterId: string): AuthProviderAdapter | null {
        return this.adapters.get(adapterId) ?? null;
    }

    getEnabledAdapter(adapterId: string): AuthProviderAdapter | null {
        if (!this.enabledAdapters.has(adapterId)) return null;
        return this.adapters.get(adapterId) ?? null;
    }

    listAdapters(): AdapterInfo[] {
        return Array.from(this.adapters.values()).map((adapter) => {
            const requires = this.adapterRequires.get(adapter.id);
            return {
                id: adapter.id,
                name: adapter.name,
                version: adapter.version,
                enabled: this.enabledAdapters.has(adapter.id),
                locked: adapter.id === "local" || undefined,
                config: {},
                schema: adapter.getConfigSchema(),
                ...(requires && requires.length > 0 ? { requires } : {}),
            };
        });
    }

    getEnabledAdapters(): AuthProviderAdapter[] {
        return Array.from(this.adapters.values()).filter((a) =>
            this.enabledAdapters.has(a.id),
        );
    }

    getPasswordResetSupport(adapterId: string): {
        adapterId: string;
        adapterName: string;
        supported: boolean;
        reason?: string;
    } {
        const adapter = this.adapters.get(adapterId);
        if (!adapter) {
            return {
                adapterId,
                adapterName: adapterId,
                supported: false,
                reason: "Auth provider not found",
            };
        }
        if (typeof adapter.getPasswordResetSupport === "function") {
            const support = adapter.getPasswordResetSupport();
            return {
                adapterId: adapter.id,
                adapterName: adapter.name,
                supported: support.supported,
                reason: support.reason,
            };
        }
        if (typeof adapter.resetPassword === "function") {
            return {
                adapterId: adapter.id,
                adapterName: adapter.name,
                supported: true,
            };
        }
        return {
            adapterId: adapter.id,
            adapterName: adapter.name,
            supported: false,
            reason: "This auth provider does not support password reset.",
        };
    }

    async resetPasswordForAccount(
        adapterId: string,
        accountId: string,
        currentPassword: string,
        nextPassword: string,
    ): Promise<void> {
        const adapter = this.adapters.get(adapterId);
        if (!adapter) {
            throw new Error("password_reset_unsupported");
        }
        const support = this.getPasswordResetSupport(adapterId);
        if (!support.supported) {
            throw new Error(support.reason || "password_reset_unsupported");
        }
        if (typeof adapter.resetPassword !== "function") {
            throw new Error("password_reset_unsupported");
        }
        const result =
            adapter.resetPassword.length >= 3
                ? await adapter.resetPassword(
                      accountId,
                      currentPassword,
                      nextPassword,
                  )
                : await adapter.resetPassword(accountId, nextPassword);
        if (result.updated !== true) {
            throw new Error(result.message || "password_reset_failed");
        }
    }

    getLocalAdapter() {
        return this.localAdapter;
    }

    async discoverAdapters(authAdaptersRoot: string): Promise<void> {
        let entries: string[];
        try {
            entries = await readdir(authAdaptersRoot);
        } catch {
            return;
        }

        for (const entry of entries) {
            const pkgPath = path.join(authAdaptersRoot, entry, "package.json");
            try {
                const raw = await readFile(pkgPath, "utf8");
                const pkg = JSON.parse(raw) as {
                    main?: string;
                    version?: string;
                };
                if (!pkg.main) continue;

                let requires: string[] | undefined;
                try {
                    const manifestRaw = await readFile(
                        path.join(authAdaptersRoot, entry, "manifest.json"),
                        "utf8",
                    );
                    const manifest = JSON.parse(manifestRaw) as {
                        requires?: string[];
                    };
                    if (Array.isArray(manifest.requires)) {
                        requires = manifest.requires;
                    }
                } catch {
                    // No manifest — adapter has no declared dependencies
                }

                const entryPath = path.resolve(
                    authAdaptersRoot,
                    entry,
                    pkg.main,
                );
                const mod = await import(`${entryPath}?t=${Date.now()}`);
                if (typeof mod.createAdapter === "function") {
                    const adapter = mod.createAdapter() as AuthProviderAdapter;
                    if (pkg.version) {
                        Object.assign(adapter, { version: pkg.version });
                    }
                    if (adapter.id !== "local") {
                        this.registerAdapter(adapter, requires);
                    }
                }
            } catch {
                // Adapter could not be loaded — skip silently
            }
        }
    }
}

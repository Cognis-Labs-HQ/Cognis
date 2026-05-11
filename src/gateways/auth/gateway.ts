import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { DbExecutor } from "../../gateways/db/reuse/db-executor.js";
import type { DbProviderId } from "../../gateways/db/reuse/provider-id.js";
import type { LocalAccountStore } from "./reuse/local-account-store.js";

export interface AuthContext {
    accountId: string;
    provider: string;
    externalUserId: string;
    email?: string;
    isAdmin?: boolean;
    role?: string;
}

export interface AuthGateway {
    authenticate(token: string): Promise<AuthContext | null>;
    createLocalAdmin(username: string, password: string): Promise<AuthContext>;
}

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
    authenticate(
        credentials: Record<string, unknown>,
    ): Promise<AuthContext | null>;
    getConfigSchema(): AuthConfigField[];
    configure(config: Record<string, unknown>): void;
}

export interface AdapterInfo {
    id: string;
    name: string;
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
                  isAdmin?: boolean,
              ): Promise<{
                  username: string;
                  isAdmin: boolean;
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
                isAdmin?: boolean,
            ): Promise<{
                username: string;
                isAdmin: boolean;
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
                const pkg = JSON.parse(raw) as { main?: string };
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

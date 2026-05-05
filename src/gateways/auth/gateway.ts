import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type {
    DbExecutor,
    SupportedDbType,
} from "../../adapters/db/shared/account-store.js";
import type { LocalAccountStore } from "../../adapters/auth/local/auth-adapter.js";

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
    config: Record<string, unknown>;
    schema: AuthConfigField[];
}

export class CoreAuthGateway {
    private readonly adapters = new Map<string, AuthProviderAdapter>();
    private readonly enabledAdapters = new Set<string>();
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

    constructor(
        private readonly db: DbExecutor,
        private readonly dbType: SupportedDbType,
    ) {}

    private placeholder(index: number): string {
        return this.dbType === "postgresql" ? `$${index}` : "?";
    }

    async ensureSchema(): Promise<void> {
        await this.db.execute(`CREATE TABLE IF NOT EXISTS auth_adapter_configs (
      adapter_id ${this.dbType === "mariadb" ? "VARCHAR(191)" : "TEXT"} PRIMARY KEY,
      enabled INTEGER NOT NULL DEFAULT 0,
      config_json TEXT NOT NULL DEFAULT '{}'
    )`);
    }

    registerAdapter(adapter: AuthProviderAdapter): void {
        this.adapters.set(adapter.id, adapter);
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
        const result = await this.db.execute(
            "SELECT adapter_id, enabled, config_json FROM auth_adapter_configs",
        );
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
        adapter.configure(config);
        const json = JSON.stringify(config);
        const enabled = this.enabledAdapters.has(adapterId) ? 1 : 0;
        if (this.dbType === "postgresql") {
            await this.db.execute(
                "INSERT INTO auth_adapter_configs (adapter_id, enabled, config_json) VALUES ($1, $2, $3) ON CONFLICT (adapter_id) DO UPDATE SET config_json = EXCLUDED.config_json, enabled = EXCLUDED.enabled",
                [adapterId, enabled, json],
            );
        } else if (this.dbType === "sqlite") {
            await this.db.execute(
                "INSERT INTO auth_adapter_configs (adapter_id, enabled, config_json) VALUES (?, ?, ?) ON CONFLICT(adapter_id) DO UPDATE SET config_json = excluded.config_json, enabled = excluded.enabled",
                [adapterId, enabled, json],
            );
        } else {
            await this.db.execute(
                "INSERT INTO auth_adapter_configs (adapter_id, enabled, config_json) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE config_json = VALUES(config_json), enabled = VALUES(enabled)",
                [adapterId, enabled, json],
            );
        }
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

    private async getPersistedConfig(
        adapterId: string,
    ): Promise<Record<string, unknown>> {
        const result = await this.db.execute(
            `SELECT config_json FROM auth_adapter_configs WHERE adapter_id = ${this.placeholder(1)}`,
            [adapterId],
        );
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
        if (this.dbType === "postgresql") {
            await this.db.execute(
                "INSERT INTO auth_adapter_configs (adapter_id, enabled, config_json) VALUES ($1, $2, $3) ON CONFLICT (adapter_id) DO UPDATE SET enabled = EXCLUDED.enabled",
                [adapterId, enabledInt, json],
            );
        } else if (this.dbType === "sqlite") {
            await this.db.execute(
                "INSERT INTO auth_adapter_configs (adapter_id, enabled, config_json) VALUES (?, ?, ?) ON CONFLICT(adapter_id) DO UPDATE SET enabled = excluded.enabled",
                [adapterId, enabledInt, json],
            );
        } else {
            await this.db.execute(
                "INSERT INTO auth_adapter_configs (adapter_id, enabled, config_json) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE enabled = VALUES(enabled)",
                [adapterId, enabledInt, json],
            );
        }
    }

    getAdapter(adapterId: string): AuthProviderAdapter | null {
        return this.adapters.get(adapterId) ?? null;
    }

    listAdapters(): AdapterInfo[] {
        return Array.from(this.adapters.values()).map((adapter) => ({
            id: adapter.id,
            name: adapter.name,
            enabled: this.enabledAdapters.has(adapter.id),
            config: {},
            schema: adapter.getConfigSchema(),
        }));
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
                const entryPath = path.resolve(
                    authAdaptersRoot,
                    entry,
                    pkg.main,
                );
                const mod = await import(`${entryPath}?t=${Date.now()}`);
                if (typeof mod.createAdapter === "function") {
                    const adapter = mod.createAdapter() as AuthProviderAdapter;
                    if (adapter.id !== "local") {
                        this.registerAdapter(adapter);
                    }
                }
            } catch {
                // Adapter could not be loaded — skip silently
            }
        }
    }
}

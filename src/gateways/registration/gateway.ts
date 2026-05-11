import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { DbExecutor } from "../db/reuse/db-executor.js";

export interface InviteRecord {
    id: string;
    inviterAccountId: string;
    inviterDisplayName: string;
    inviteeEmail: string;
    expiresAt: string;
    createdAt?: string;
    status?: "pending" | "expired" | "revoked" | "redeemed";
    redeemedAccountId?: string | null;
}

export interface RegistrationInviteAdapter {
    issueInvite(input: {
        inviterAccountId: string;
        inviterDisplayName: string;
        inviteeEmail: string;
        inviterIsFounder: boolean;
        inviteBaseUrl: string;
    }): Promise<{ tokenId: string; inviteUrl: string; expiresAt: string }>;
    listInvites(filter?: {
        inviterAccountId?: string;
        includeClosed?: boolean;
    }): Promise<InviteRecord[]>;
    revokeInvite(input: {
        tokenId: string;
        revokedByAccountId: string;
    }): Promise<boolean>;
    resolveInvite(token: string): Promise<InviteRecord | null>;
    redeemInvite(input: {
        token: string;
        username: string;
        password: string;
        displayName?: string;
    }): Promise<{
        createdAccountId: string;
        inviterAccountId: string;
    }>;
}

export interface RegistrationPublicAdapter {
    register(input: {
        username: string;
        password: string;
        email?: string;
        displayName?: string;
    }): Promise<{
        username: string;
        isAdmin: boolean;
        enabled: boolean;
    }>;
}

export interface RegistrationGatewayAdapter {
    id: string;
    name: string;
    defaultEnabled?: boolean;
    invite?: RegistrationInviteAdapter;
    public?: RegistrationPublicAdapter;
}

export interface RegistrationAdapterInfo {
    id: string;
    name: string;
    enabled: boolean;
}

export interface RegistrationAdapterDeps {
    dbExecutor: DbExecutor;
    [key: string]: unknown;
}

export class CoreRegistrationGateway {
    private readonly adapters = new Map<string, RegistrationGatewayAdapter>();
    private readonly enabledAdapters = new Set<string>();
    private inviteAdapterId: string | null = null;
    private publicAdapterId: string | null = null;

    constructor(private readonly db: DbExecutor) {}

    async ensureSchema(): Promise<void> {
        await this.db
            .execute(`CREATE TABLE IF NOT EXISTS registration_adapter_configs (
      adapter_id VARCHAR(191) PRIMARY KEY,
      enabled INTEGER NOT NULL DEFAULT 0
    )`);
    }

    private registerAdapter(adapter: RegistrationGatewayAdapter): void {
        this.adapters.set(adapter.id, adapter);
        if (adapter.defaultEnabled !== false) {
            this.enabledAdapters.add(adapter.id);
        }
        if (adapter.invite) this.inviteAdapterId = adapter.id;
        if (adapter.public) this.publicAdapterId = adapter.id;
    }

    async discoverAdapters(
        adaptersRoot: string,
        deps: RegistrationAdapterDeps,
    ): Promise<void> {
        let entries: string[];
        try {
            entries = await readdir(adaptersRoot);
        } catch {
            return;
        }

        for (const entry of entries) {
            const pkgPath = path.join(adaptersRoot, entry, "package.json");
            try {
                const raw = await readFile(pkgPath, "utf8");
                const pkg = JSON.parse(raw) as { main?: string };
                if (!pkg.main) continue;
                const entryPath = path.resolve(adaptersRoot, entry, pkg.main);
                const mod = await import(`${entryPath}?t=${Date.now()}`);
                if (typeof mod.createAdapter !== "function") continue;
                const adapter = mod.createAdapter(
                    deps,
                ) as RegistrationGatewayAdapter | null;
                if (!adapter || !adapter.id || !adapter.name) continue;
                this.registerAdapter(adapter);
            } catch {
                // Adapter load failures are non-fatal.
            }
        }
    }

    async loadPersistedConfigs(): Promise<void> {
        const result = await this.db.execute(
            "SELECT adapter_id, enabled FROM registration_adapter_configs",
        );
        for (const row of result.rows ?? []) {
            const adapterId = String(row.adapter_id ?? "");
            if (!adapterId || !this.adapters.has(adapterId)) continue;
            const enabledRaw = row.enabled;
            const enabled =
                enabledRaw === true ||
                enabledRaw === 1 ||
                enabledRaw === "1" ||
                enabledRaw === "true";
            if (enabled) this.enabledAdapters.add(adapterId);
            else this.enabledAdapters.delete(adapterId);
        }
    }

    listAdapters(): RegistrationAdapterInfo[] {
        return Array.from(this.adapters.values()).map((adapter) => ({
            id: adapter.id,
            name: adapter.name,
            enabled: this.enabledAdapters.has(adapter.id),
        }));
    }

    async enableAdapter(adapterId: string): Promise<void> {
        if (!this.adapters.has(adapterId)) throw new Error("not_found");
        this.enabledAdapters.add(adapterId);
        await this.saveAdapterEnabled(adapterId, true);
    }

    async disableAdapter(adapterId: string): Promise<void> {
        if (!this.adapters.has(adapterId)) throw new Error("not_found");
        this.enabledAdapters.delete(adapterId);
        await this.saveAdapterEnabled(adapterId, false);
    }

    isAdapterEnabled(adapterId: string): boolean {
        return this.enabledAdapters.has(adapterId);
    }

    isInviteEnabled(): boolean {
        return Boolean(
            this.inviteAdapterId &&
            this.enabledAdapters.has(this.inviteAdapterId) &&
            this.adapters.get(this.inviteAdapterId)?.invite,
        );
    }

    isPublicEnabled(): boolean {
        return Boolean(
            this.publicAdapterId &&
            this.enabledAdapters.has(this.publicAdapterId) &&
            this.adapters.get(this.publicAdapterId)?.public,
        );
    }

    async issueInvite(input: {
        inviterAccountId: string;
        inviterDisplayName: string;
        inviteeEmail: string;
        inviterIsFounder: boolean;
        inviteBaseUrl: string;
    }) {
        const adapter = this.getInviteAdapter();
        if (!adapter) throw new Error("invite_disabled");
        return adapter.issueInvite(input);
    }

    async listInvites(filter?: {
        inviterAccountId?: string;
        includeClosed?: boolean;
    }) {
        const adapter = this.getInviteAdapter();
        if (!adapter) return [];
        return adapter.listInvites(filter);
    }

    async revokeInvite(input: { tokenId: string; revokedByAccountId: string }) {
        const adapter = this.getInviteAdapter();
        if (!adapter) throw new Error("invite_disabled");
        return adapter.revokeInvite(input);
    }

    async resolveInvite(token: string) {
        const adapter = this.getInviteAdapter();
        if (!adapter) return null;
        return adapter.resolveInvite(token);
    }

    async redeemInvite(input: {
        token: string;
        username: string;
        password: string;
        displayName?: string;
    }) {
        const adapter = this.getInviteAdapter();
        if (!adapter) throw new Error("invite_disabled");
        return adapter.redeemInvite(input);
    }

    async registerPublic(input: {
        username: string;
        password: string;
        email?: string;
        displayName?: string;
    }) {
        const adapter = this.getPublicAdapter();
        if (!adapter) throw new Error("public_disabled");
        return adapter.register(input);
    }

    private getInviteAdapter(): RegistrationInviteAdapter | null {
        if (!this.inviteAdapterId) return null;
        if (!this.enabledAdapters.has(this.inviteAdapterId)) return null;
        return this.adapters.get(this.inviteAdapterId)?.invite ?? null;
    }

    private getPublicAdapter(): RegistrationPublicAdapter | null {
        if (!this.publicAdapterId) return null;
        if (!this.enabledAdapters.has(this.publicAdapterId)) return null;
        return this.adapters.get(this.publicAdapterId)?.public ?? null;
    }

    private async saveAdapterEnabled(
        adapterId: string,
        enabled: boolean,
    ): Promise<void> {
        await this.db.executeCommand({
            option: "INSERT",
            table: "registration_adapter_configs",
            values: {
                adapter_id: adapterId,
                enabled: enabled ? 1 : 0,
            },
            conflict: {
                action: "update",
                target: ["adapter_id"],
                update: {
                    enabled: enabled ? 1 : 0,
                },
            },
        });
    }
}

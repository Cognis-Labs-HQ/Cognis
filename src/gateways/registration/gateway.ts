import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { resolveComponentEnabledState } from "@cognis/core";
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
        inviteeEmail?: string;
        inviterIsFounder: boolean;
        inviteBaseUrl: string;
        deliverEmail?: boolean;
    }): Promise<{
        tokenId: string;
        registrationToken: string;
        inviteUrl: string;
        expiresAt: string;
    }>;
    listInvites(filter?: {
        inviterAccountId?: string;
        includeClosed?: boolean;
    }): Promise<InviteRecord[]>;
    revokeInvite(input: {
        tokenId: string;
        revokedByAccountId: string;
    }): Promise<boolean>;
    resolveInvite(token: string): Promise<InviteRecord | null>;
    consumeExternalAccountToken(input: {
        token: string;
        accountId: string;
        email: string;
        emailVerified?: boolean;
    }): Promise<boolean>;
    redeemInvite(input: {
        token: string;
        username: string;
        password: string;
        email?: string;
        displayName?: string;
    }): Promise<{
        createdAccountId: string;
        inviterAccountId: string;
    }>;
    resetFounderInviteLimit(accountId: string): Promise<void>;
}

export interface RegistrationPublicAdapter {
    register(input: {
        username: string;
        password: string;
        email?: string;
        displayName?: string;
    }): Promise<{
        username: string;
        role?: string;
        enabled: boolean;
    }>;
}

export interface RegistrationGatewayAdapter {
    id: string;
    name: string;
    version?: string;
    publisher?: string;
    defaultEnabled?: boolean;
    locked?: boolean;
    invite?: RegistrationInviteAdapter;
    public?: RegistrationPublicAdapter;
}

export interface RegistrationAdapterInfo {
    id: string;
    name: string;
    version?: string;
    publisher?: string;
    enabled: boolean;
    locked?: boolean;
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
        await this.db.ensureTable({
            name: "registration_adapter_configs",
            columns: [
                {
                    name: "adapter_id",
                    type: "text",
                    notNull: true,
                    primaryKey: true,
                },
                { name: "enabled", type: "integer", notNull: true, default: 0 },
            ],
        });
        await this.db.ensureTable({
            name: "registration_policy",
            columns: [
                { name: "id", type: "text", primaryKey: true },
                {
                    name: "founder_invites_enabled",
                    type: "boolean",
                    notNull: true,
                    default: "true",
                },
                {
                    name: "admin_invites_enabled",
                    type: "boolean",
                    notNull: true,
                    default: "true",
                },
            ],
        });
    }

    async getInvitationPolicy(): Promise<{
        founderInvitesEnabled: boolean;
        adminInvitesEnabled: boolean;
    }> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "registration_policy",
            columns: ["founder_invites_enabled", "admin_invites_enabled"],
            where: [{ column: "id", value: "default" }],
        });
        const row = result.rows?.[0];
        return {
            founderInvitesEnabled:
                row?.founder_invites_enabled === undefined
                    ? true
                    : row.founder_invites_enabled === true ||
                      Number(row.founder_invites_enabled) === 1,
            adminInvitesEnabled:
                row?.admin_invites_enabled === undefined
                    ? true
                    : row.admin_invites_enabled === true ||
                      Number(row.admin_invites_enabled) === 1,
        };
    }

    async setInvitationPolicy(input: {
        founderInvitesEnabled: boolean;
        adminInvitesEnabled: boolean;
    }): Promise<void> {
        await this.db.executeCommand({
            option: "INSERT",
            table: "registration_policy",
            values: {
                id: "default",
                founder_invites_enabled: input.founderInvitesEnabled,
                admin_invites_enabled: input.adminInvitesEnabled,
            },
            conflict: {
                action: "update",
                target: ["id"],
                update: {
                    founder_invites_enabled: input.founderInvitesEnabled,
                    admin_invites_enabled: input.adminInvitesEnabled,
                },
            },
        });
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
                const pkg = JSON.parse(raw) as {
                    main?: string;
                    version?: string;
                };
                if (!pkg.main) continue;
                const entryPath = path.resolve(adaptersRoot, entry, pkg.main);
                const mod = await import(`${entryPath}?t=${Date.now()}`);
                if (typeof mod.createAdapter !== "function") continue;
                const adapter = mod.createAdapter(
                    deps,
                ) as RegistrationGatewayAdapter | null;
                if (!adapter || !adapter.id || !adapter.name) continue;
                if (pkg.version) {
                    Object.assign(adapter, { version: pkg.version });
                }
                const manifestRaw = await readFile(
                    path.join(adaptersRoot, entry, "manifest.json"),
                    "utf8",
                );
                const manifest = JSON.parse(manifestRaw) as {
                    publisher?: string;
                };
                if (manifest.publisher) {
                    Object.assign(adapter, { publisher: manifest.publisher });
                }
                this.registerAdapter(adapter);
            } catch {
                // Adapter load failures are non-fatal.
            }
        }
    }

    async loadPersistedConfigs(): Promise<void> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "registration_adapter_configs",
            columns: ["adapter_id", "enabled"],
        });
        for (const row of result.rows ?? []) {
            const adapterId = String(row.adapter_id ?? "");
            if (!adapterId || !this.adapters.has(adapterId)) continue;
            const adapter = this.adapters.get(adapterId)!;
            const enabled = resolveComponentEnabledState({
                persistedEnabled: row.enabled,
                locked: adapter.locked === true,
                defaultEnabled: adapter.defaultEnabled === true,
            });
            if (enabled) this.enabledAdapters.add(adapterId);
            else this.enabledAdapters.delete(adapterId);
        }
    }

    listAdapters(): RegistrationAdapterInfo[] {
        return Array.from(this.adapters.values()).map((adapter) => ({
            id: adapter.id,
            name: adapter.name,
            ...(adapter.version ? { version: adapter.version } : {}),
            ...(adapter.publisher ? { publisher: adapter.publisher } : {}),
            enabled: this.enabledAdapters.has(adapter.id),
            ...(adapter.locked ? { locked: true } : {}),
        }));
    }

    async enableAdapter(adapterId: string): Promise<void> {
        if (!this.adapters.has(adapterId)) throw new Error("not_found");
        this.enabledAdapters.add(adapterId);
        await this.saveAdapterEnabled(adapterId, true);
    }

    async disableAdapter(adapterId: string): Promise<void> {
        const adapter = this.adapters.get(adapterId);
        if (!adapter) throw new Error("not_found");
        if (adapter.locked) throw new Error("adapter_locked");
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
        deliverEmail?: boolean;
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

    async consumeExternalAccountToken(input: {
        token: string;
        accountId: string;
        email: string;
        emailVerified?: boolean;
    }) {
        const adapter = this.getInviteAdapter();
        if (!adapter) throw new Error("invite_disabled");
        return adapter.consumeExternalAccountToken(input);
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

    async resetFounderInviteLimit(accountId: string): Promise<void> {
        const adapter = this.getInviteAdapter();
        if (!adapter) throw new Error("invite_disabled");
        await adapter.resetFounderInviteLimit(accountId);
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

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

export interface RegistrationRequestRecord {
    id: string;
    provider: string;
    externalUserId: string;
    requestedAccountId: string;
    requestedDisplayName: string;
    requestedEmail?: string;
    requestedProfileImageUrl?: string;
    status: "pending" | "approved" | "rejected";
    createdAt: string;
    reviewedAt?: string | null;
    reviewedByAccountId?: string | null;
}

export interface RegistrationRequestAdapter {
    submitRequest(input: {
        provider: string;
        externalUserId: string;
        requestedAccountId: string;
        requestedDisplayName: string;
        requestedEmail?: string;
        requestedProfileImageUrl?: string;
    }): Promise<RegistrationRequestRecord>;
    listRequests(filter?: {
        status?: "pending" | "approved" | "rejected";
    }): Promise<RegistrationRequestRecord[]>;
    reviewRequest(input: {
        requestId: string;
        status: "approved" | "rejected";
        reviewedByAccountId: string;
    }): Promise<RegistrationRequestRecord | null>;
    getRequestByIdentity(input: {
        provider: string;
        externalUserId: string;
    }): Promise<RegistrationRequestRecord | null>;
}

export interface RegistrationGatewayAdapter {
    id: string;
    name: string;
    defaultEnabled?: boolean;
    invite?: RegistrationInviteAdapter;
    public?: RegistrationPublicAdapter;
    request?: RegistrationRequestAdapter;
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
    private requestAdapterId: string | null = null;

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
    }

    private registerAdapter(adapter: RegistrationGatewayAdapter): void {
        this.adapters.set(adapter.id, adapter);
        if (adapter.defaultEnabled !== false) {
            this.enabledAdapters.add(adapter.id);
        }
        if (adapter.invite) this.inviteAdapterId = adapter.id;
        if (adapter.public) this.publicAdapterId = adapter.id;
        if (adapter.request) this.requestAdapterId = adapter.id;
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
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "registration_adapter_configs",
            columns: ["adapter_id", "enabled"],
        });
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

    isRequestEnabled(): boolean {
        return Boolean(
            this.requestAdapterId &&
            this.enabledAdapters.has(this.requestAdapterId) &&
            this.adapters.get(this.requestAdapterId)?.request,
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

    async submitRequest(input: {
        provider: string;
        externalUserId: string;
        requestedAccountId: string;
        requestedDisplayName: string;
        requestedEmail?: string;
        requestedProfileImageUrl?: string;
    }) {
        const adapter = this.getRequestAdapter();
        if (!adapter) throw new Error("request_disabled");
        return adapter.submitRequest(input);
    }

    async listRequests(filter?: {
        status?: "pending" | "approved" | "rejected";
    }) {
        const adapter = this.getRequestAdapter();
        if (!adapter) return [];
        return adapter.listRequests(filter);
    }

    async reviewRequest(input: {
        requestId: string;
        status: "approved" | "rejected";
        reviewedByAccountId: string;
    }) {
        const adapter = this.getRequestAdapter();
        if (!adapter) throw new Error("request_disabled");
        return adapter.reviewRequest(input);
    }

    async getRequestByIdentity(input: {
        provider: string;
        externalUserId: string;
    }) {
        const adapter = this.getRequestAdapter();
        if (!adapter) return null;
        return adapter.getRequestByIdentity(input);
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

    private getRequestAdapter(): RegistrationRequestAdapter | null {
        if (!this.requestAdapterId) return null;
        if (!this.enabledAdapters.has(this.requestAdapterId)) return null;
        return this.adapters.get(this.requestAdapterId)?.request ?? null;
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

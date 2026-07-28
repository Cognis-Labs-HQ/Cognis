import { resolveExternalBaseUrl } from "../../../api/reuse/url-parts.js";
import {
    ShareTokenStore,
    generateSharePassword,
    isExpired,
    type ShareAccessControls,
    type ShareTokenRecord,
} from "./store.js";
import {
    GuestProfileStore,
    type GuestProfileRecord,
} from "./guest-profile-store.js";
import {
    ShareApprovalRequestStore,
    type ShareApprovalRequestRecord,
} from "./approval-request-store.js";
import { resolveQuickShareActions } from "./quick-share-actions.js";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export interface ShareMethodAdapter {
    id: string;
    name: string;
    description: string;
    pageModuleUrl: string;
    order?: number;
    version?: string;
    publisher?: string;
    prepare(input: {
        recipients?: unknown;
        accessControls?: Record<string, unknown>;
    }): { accessControls: Record<string, unknown> };
    owns?(accessControls: Partial<ShareAccessControls>): boolean;
    validateUnique?(input: {
        accessControls: Partial<ShareAccessControls>;
        existingAccessControls: ShareAccessControls[];
    }): void;
}

export interface ShareVariant {
    id: string;
    label: string;
    url: string;
    contentType?: string;
    access?: "read" | "write";
}

export class CoreShareGateway {
    private readonly adapters = new Map<string, ShareMethodAdapter>();
    constructor(
        private readonly store: ShareTokenStore,
        private readonly guestProfileStore: GuestProfileStore,
        private readonly approvalRequestStore: ShareApprovalRequestStore,
        private readonly externalBaseUrl: string = resolveExternalBaseUrl(),
        private readonly resolveCapability: <T>(
            name: string,
        ) => T | undefined = () => undefined,
    ) {}

    getCapability<T>(name: string): T | undefined {
        return this.resolveCapability<T>(name);
    }

    async discoverAdapters(adaptersRoot: string): Promise<void> {
        let entries: string[];
        try {
            entries = await readdir(adaptersRoot);
        } catch {
            return;
        }
        for (const entry of entries.sort()) {
            try {
                const packageRoot = path.join(adaptersRoot, entry);
                const pkg = JSON.parse(
                    await readFile(
                        path.join(packageRoot, "package.json"),
                        "utf8",
                    ),
                ) as { main?: string; version?: string };
                if (!pkg.main) continue;
                const module = await import(
                    path.resolve(packageRoot, pkg.main)
                );
                if (typeof module.createShareAdapter !== "function") continue;
                const adapter =
                    module.createShareAdapter() as ShareMethodAdapter;
                if (!adapter?.id || !adapter.name || !adapter.pageModuleUrl)
                    continue;
                this.adapters.set(adapter.id, {
                    ...adapter,
                    version: pkg.version,
                });
            } catch {
                // One unavailable sharing method must not disable the gateway.
            }
        }
    }

    listAdapters(): ShareMethodAdapter[] {
        return Array.from(this.adapters.values()).sort(
            (left, right) =>
                (left.order ?? 100) - (right.order ?? 100) ||
                left.name.localeCompare(right.name),
        );
    }

    prepareAdapterShare(
        adapterId: string,
        input: {
            recipients?: unknown;
            accessControls?: Record<string, unknown>;
        },
    ): { accessControls: Record<string, unknown> } {
        const adapter = this.adapters.get(adapterId);
        if (!adapter) throw new Error("share_method_not_found");
        return adapter.prepare(input);
    }

    async ensureSchema(): Promise<void> {
        await this.store.ensureSchema();
        await this.guestProfileStore.ensureSchema();
        await this.approvalRequestStore.ensureSchema();
    }

    buildAbsoluteUrl(pathOrUrl: string): string {
        const normalizedPath = String(pathOrUrl ?? "").trim();
        if (!normalizedPath || /^[a-z][a-z0-9+.-]*:/i.test(normalizedPath)) {
            return normalizedPath;
        }
        return this.externalBaseUrl
            ? `${this.externalBaseUrl}${normalizedPath.startsWith("/") ? normalizedPath : `/${normalizedPath}`}`
            : normalizedPath;
    }

    buildShareUrl(tokenValue: string): string {
        const encodedToken = encodeURIComponent(tokenValue);
        return this.buildAbsoluteUrl(`/share/${encodedToken}`);
    }

    isTokenExpired(record: Pick<ShareTokenRecord, "expiresAt">): boolean {
        return isExpired(record.expiresAt);
    }

    async serializeRecord(
        record: ShareTokenRecord,
    ): Promise<Record<string, unknown>> {
        const shareUrl = this.buildShareUrl(record.tokenValue);
        const resolveVariants = this.resolveCapability<
            (input: {
                resourceType: string;
                resourceId: string;
                token: string;
                shareUrl: string;
                grantedCapabilities: string[];
                metadata: Record<string, string> | null;
            }) => Promise<ShareVariant[]> | ShareVariant[]
        >("share:resolveVariants");
        const resolvedVariants = resolveVariants
            ? await resolveVariants({
                  resourceType: record.resourceType,
                  resourceId: record.resourceId,
                  token: record.tokenValue,
                  shareUrl,
                  grantedCapabilities: record.grantedCapabilities,
                  metadata: record.metadata,
              })
            : [];
        const variants = resolvedVariants.map((variant) => ({
            ...variant,
            url: this.buildAbsoluteUrl(variant.url),
        }));
        return {
            id: record.id,
            ownerAccountId: record.ownerAccountId,
            resourceType: record.resourceType,
            resourceId: record.resourceId,
            label: record.label,
            metadata: record.metadata,
            grantedCapabilities: record.grantedCapabilities,
            accessControls: record.accessControls,
            passwordProtected: Boolean(record.passwordHash),
            readonlyWatermark: record.accessControls.watermarkReadonly,
            expiresAt: record.expiresAt,
            status: this.isTokenExpired(record) ? "expired" : "active",
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
            shareUrl,
            variants,
            emailSupported: Boolean(this.resolveCapability("notify:sendEmail")),
            quickShareActions: await resolveQuickShareActions(
                this.resolveCapability,
                {
                    shareUrl,
                    label: record.label,
                },
            ),
        };
    }

    async issueToken(input: {
        ownerAccountId: string;
        resourceType: string;
        resourceId: string;
        metadata?: Record<string, string> | null;
        label?: string | null;
        grantedCapabilities?: string[];
        accessControls?: Partial<ShareAccessControls>;
        password?: string | null;
        generatePassword?: boolean;
        expiresAt?: string;
    }): Promise<Record<string, unknown>> {
        await this.validateAdapterUniqueness({
            ownerAccountId: input.ownerAccountId,
            resourceType: input.resourceType,
            resourceId: input.resourceId,
            accessControls: input.accessControls,
        });
        const generatedPassword = input.generatePassword
            ? generateSharePassword()
            : null;
        const record = await this.store.issue({
            ...input,
            password: input.password ?? generatedPassword,
        });
        return {
            ...(await this.serializeRecord(record)),
            generatedPassword,
        };
    }

    async updateToken(input: {
        shareId: string;
        ownerAccountId: string;
        label?: string | null;
        grantedCapabilities?: string[];
        accessControls?: Partial<ShareAccessControls>;
        password?: string | null;
        generatePassword?: boolean;
        clearPassword?: boolean;
        expiresAt?: string;
    }): Promise<Record<string, unknown> | null> {
        const existingRecord = await this.store.getById(input.shareId);
        if (
            !existingRecord ||
            existingRecord.ownerAccountId !== input.ownerAccountId
        ) {
            return null;
        }
        await this.validateAdapterUniqueness({
            ownerAccountId: input.ownerAccountId,
            resourceType: existingRecord.resourceType,
            resourceId: existingRecord.resourceId,
            accessControls:
                input.accessControls ?? existingRecord.accessControls,
            excludeShareId: existingRecord.id,
        });
        const generatedPassword = input.generatePassword
            ? generateSharePassword()
            : null;
        const record = await this.store.updateById({
            ...input,
            password: input.password ?? generatedPassword,
        });
        return record
            ? {
                  ...(await this.serializeRecord(record)),
                  generatedPassword,
              }
            : null;
    }

    async listTokens(filter: {
        ownerAccountId: string;
        resourceType?: string;
        resourceId?: string;
    }): Promise<Record<string, unknown>[]> {
        const records = await this.store.listByOwner(filter);
        return await Promise.all(
            records.map((record) => this.serializeRecord(record)),
        );
    }

    async removeUserRecipient(input: {
        shareId: string;
        recipientAccountId: string;
    }): Promise<"updated" | "deleted" | "not_found"> {
        const record = await this.store.getById(input.shareId);
        if (!record) return "not_found";
        const recipients = record.accessControls.recipients;
        const nextRecipients = recipients.filter(
            (recipient) =>
                !(
                    recipient.type === "user" &&
                    recipient.id === input.recipientAccountId
                ),
        );
        if (nextRecipients.length === recipients.length) return "not_found";
        if (nextRecipients.length === 0) {
            await this.store.deleteById({ shareId: record.id });
            return "deleted";
        }
        await this.store.updateById({
            shareId: record.id,
            ownerAccountId: record.ownerAccountId,
            accessControls: {
                ...record.accessControls,
                recipients: nextRecipients,
            },
        });
        return "updated";
    }

    async deleteResourceShares(input: {
        ownerAccountId: string;
        resourceType: string;
        resourceId: string;
    }): Promise<number> {
        const records = await this.store.listByOwner(input);
        await Promise.all(
            records.map((record) =>
                this.store.deleteById({ shareId: record.id }),
            ),
        );
        return records.length;
    }

    private async validateAdapterUniqueness(input: {
        ownerAccountId: string;
        resourceType: string;
        resourceId: string;
        accessControls?: Partial<ShareAccessControls>;
        excludeShareId?: string;
    }): Promise<void> {
        const existingRecords = await this.store.listByOwner({
            ownerAccountId: input.ownerAccountId,
            resourceType: input.resourceType,
            resourceId: input.resourceId,
        });
        const existingAccessControls = existingRecords
            .filter((record) => record.id !== input.excludeShareId)
            .filter((record) => !this.isTokenExpired(record))
            .map((record) => record.accessControls);
        for (const adapter of this.adapters.values()) {
            if (
                !adapter.validateUnique ||
                !adapter.owns?.(input.accessControls ?? {})
            ) {
                continue;
            }
            adapter.validateUnique({
                accessControls: input.accessControls ?? {},
                existingAccessControls,
            });
        }
    }

    async listByResource(filter: {
        resourceType: string;
        resourceId: string;
    }): Promise<Record<string, unknown>[]> {
        const records = await this.store.listByResource(filter);
        return await Promise.all(
            records.map((record) => this.serializeRecord(record)),
        );
    }

    async deleteToken(input: {
        shareId: string;
        ownerAccountId?: string;
        resourceType?: string;
        resourceId?: string;
    }): Promise<boolean> {
        return this.store.deleteById(input);
    }

    async getTokenById(shareId: string): Promise<ShareTokenRecord | null> {
        return this.store.getById(shareId);
    }

    async resolveToken(
        tokenValue: string,
        password?: string | null,
    ): Promise<ShareTokenRecord | null> {
        return this.store.resolve(tokenValue, password);
    }

    async inspectToken(tokenValue: string): Promise<ShareTokenRecord | null> {
        return this.store.inspect(tokenValue);
    }

    async createGuestProfile(input: {
        shareId: string;
        displayName?: string;
        ttlSeconds: number;
    }): Promise<GuestProfileRecord> {
        return this.guestProfileStore.create(input);
    }

    async getGuestProfile(guestId: string): Promise<GuestProfileRecord | null> {
        return this.guestProfileStore.getById(guestId);
    }

    async purgeExpiredShareTokens(): Promise<void> {
        await this.store.purgeExpired();
    }

    async purgeExpiredGuestProfiles(): Promise<void> {
        await this.guestProfileStore.purgeExpired();
    }

    async createApprovalRequestBatch(input: {
        resourceType: string;
        resourceId: string;
        requesterAccountId: string;
        requesterDisplayName: string;
        targetAccountIds: string[];
        ttlSeconds: number;
    }): Promise<{ mintRequestId: string }> {
        const result = await this.approvalRequestStore.createBatch(input);
        return { mintRequestId: result.mintRequestId };
    }

    async resolveApprovalStatus(mintRequestId: string): Promise<{
        allResponded: boolean;
        anyDeclined: boolean;
    }> {
        return this.approvalRequestStore.resolveExpiredAndSummarize(
            mintRequestId,
        );
    }

    async listPendingApprovalsForAccount(
        accountId: string,
    ): Promise<ShareApprovalRequestRecord[]> {
        return this.approvalRequestStore.listPendingForTarget(accountId);
    }

    async respondToApprovalRequest(input: {
        approvalId: string;
        targetAccountId: string;
        decision: "approved" | "declined";
    }): Promise<boolean> {
        return this.approvalRequestStore.respond(input);
    }

    async purgeExpiredApprovalRequests(): Promise<void> {
        await this.approvalRequestStore.purgeExpired();
    }
}

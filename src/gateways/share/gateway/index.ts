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

export class CoreShareGateway {
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

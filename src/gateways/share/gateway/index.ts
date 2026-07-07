import { resolveExternalBaseUrl } from "../../../api/reuse/url-parts.js";
import { ShareTokenStore, type ShareTokenRecord } from "./store.js";

export class CoreShareGateway {
    constructor(
        private readonly store: ShareTokenStore,
        private readonly externalBaseUrl: string = resolveExternalBaseUrl(),
    ) {}

    async ensureSchema(): Promise<void> {
        await this.store.ensureSchema();
    }

    buildShareUrl(tokenValue: string): string {
        const encodedToken = encodeURIComponent(tokenValue);
        const sharePath = `/share/${encodedToken}`;
        return this.externalBaseUrl
            ? `${this.externalBaseUrl}${sharePath}`
            : sharePath;
    }

    serializeRecord(record: ShareTokenRecord): Record<string, unknown> {
        return {
            id: record.id,
            ownerAccountId: record.ownerAccountId,
            resourceType: record.resourceType,
            resourceId: record.resourceId,
            label: record.label,
            grantedCapabilities: record.grantedCapabilities,
            expiresAt: record.expiresAt,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
            shareUrl: this.buildShareUrl(record.tokenValue),
        };
    }

    async issueToken(input: {
        ownerAccountId: string;
        resourceType: string;
        resourceId: string;
        label?: string | null;
        grantedCapabilities?: string[];
        expiresAt?: string;
    }): Promise<Record<string, unknown>> {
        const record = await this.store.issue(input);
        return this.serializeRecord(record);
    }

    async listTokens(filter: {
        ownerAccountId: string;
        resourceType?: string;
        resourceId?: string;
    }): Promise<Record<string, unknown>[]> {
        const records = await this.store.listByOwner(filter);
        return records.map((record) => this.serializeRecord(record));
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

    async resolveToken(tokenValue: string): Promise<ShareTokenRecord | null> {
        return this.store.resolve(tokenValue);
    }
}

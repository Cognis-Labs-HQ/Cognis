import type { DbExecutor } from "../../db/reuse/db-executor.js";
import {
    issueShareTokenValue,
    parseShareToken,
} from "../reuse/token-format.js";

export interface ShareTokenRecord {
    id: string;
    ownerAccountId: string;
    resourceType: string;
    resourceId: string;
    tokenValue: string;
    tokenHash: string;
    label: string | null;
    grantedCapabilities: string[];
    expiresAt: string;
    createdAt: string;
    updatedAt: string;
}

function normalizeOptionalString(value: unknown): string | null {
    if (typeof value !== "string") {
        return null;
    }
    const normalized = value.trim();
    return normalized ? normalized : null;
}

function normalizeCapabilities(value: unknown): string[] {
    if (!Array.isArray(value)) {
        return [];
    }
    return Array.from(
        new Set(
            value.map((entry) => String(entry ?? "").trim()).filter(Boolean),
        ),
    ).sort();
}

function isExpired(expiresAt: string): boolean {
    return Boolean(expiresAt) && new Date(expiresAt).getTime() <= Date.now();
}

function parseRecord(row: Record<string, unknown>): ShareTokenRecord | null {
    const id = String(row.id ?? "").trim();
    const ownerAccountId = String(row.owner_account_id ?? "").trim();
    const resourceType = String(row.resource_type ?? "").trim();
    const resourceId = String(row.resource_id ?? "").trim();
    const tokenValue = String(row.token_value ?? "").trim();
    const tokenHash = String(row.token_hash ?? "").trim();
    const createdAt = String(row.created_at ?? "").trim();
    const updatedAt = String(row.updated_at ?? "").trim();
    const expiresAt = String(row.expires_at ?? "");
    if (
        !id ||
        !ownerAccountId ||
        !resourceType ||
        !resourceId ||
        !tokenValue ||
        !tokenHash ||
        !createdAt ||
        !updatedAt
    ) {
        return null;
    }
    return {
        id,
        ownerAccountId,
        resourceType,
        resourceId,
        tokenValue,
        tokenHash,
        label: normalizeOptionalString(row.label),
        grantedCapabilities: normalizeCapabilities(
            (() => {
                try {
                    return JSON.parse(String(row.granted_capabilities ?? "[]"));
                } catch {
                    return [];
                }
            })(),
        ),
        expiresAt,
        createdAt,
        updatedAt,
    };
}

export class ShareTokenStore {
    constructor(
        private readonly db: DbExecutor,
        private readonly log?: (
            level: string,
            message: string,
            meta?: Record<string, unknown>,
        ) => void,
    ) {}

    async ensureSchema(): Promise<void> {
        await this.db.ensureTable({
            name: "share_tokens",
            columns: [
                { name: "id", type: "text", primaryKey: true },
                { name: "owner_account_id", type: "text", notNull: true },
                { name: "resource_type", type: "text", notNull: true },
                { name: "resource_id", type: "text", notNull: true },
                { name: "token_value", type: "text", notNull: true },
                { name: "token_hash", type: "text", notNull: true },
                { name: "label", type: "text" },
                { name: "granted_capabilities", type: "text", notNull: true },
                { name: "expires_at", type: "text", notNull: true },
                { name: "created_at", type: "text", notNull: true },
                { name: "updated_at", type: "text", notNull: true },
            ],
        });
    }

    async issue(input: {
        ownerAccountId: string;
        resourceType: string;
        resourceId: string;
        label?: string | null;
        grantedCapabilities?: string[];
        expiresAt?: string;
    }): Promise<ShareTokenRecord> {
        const token = issueShareTokenValue();
        const createdAt = new Date().toISOString();
        const record: ShareTokenRecord = {
            id: token.tokenId,
            ownerAccountId: String(input.ownerAccountId ?? "").trim(),
            resourceType: String(input.resourceType ?? "").trim(),
            resourceId: String(input.resourceId ?? "").trim(),
            tokenValue: token.tokenValue,
            tokenHash: token.tokenHash,
            label: normalizeOptionalString(input.label),
            grantedCapabilities: normalizeCapabilities(
                input.grantedCapabilities ?? [],
            ),
            expiresAt: String(input.expiresAt ?? ""),
            createdAt,
            updatedAt: createdAt,
        };
        await this.db.executeCommand({
            option: "INSERT",
            table: "share_tokens",
            values: {
                id: record.id,
                owner_account_id: record.ownerAccountId,
                resource_type: record.resourceType,
                resource_id: record.resourceId,
                token_value: record.tokenValue,
                token_hash: record.tokenHash,
                label: record.label,
                granted_capabilities: JSON.stringify(
                    record.grantedCapabilities,
                ),
                expires_at: record.expiresAt,
                created_at: record.createdAt,
                updated_at: record.updatedAt,
            },
        });
        return record;
    }

    async listByOwner(filter: {
        ownerAccountId: string;
        resourceType?: string;
        resourceId?: string;
    }): Promise<ShareTokenRecord[]> {
        const where = [
            { column: "owner_account_id", value: filter.ownerAccountId },
        ];
        if (filter.resourceType) {
            where.push({ column: "resource_type", value: filter.resourceType });
        }
        if (filter.resourceId) {
            where.push({ column: "resource_id", value: filter.resourceId });
        }
        await this.purgeExpired({
            ownerAccountId: filter.ownerAccountId,
            resourceType: filter.resourceType,
            resourceId: filter.resourceId,
        });
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "share_tokens",
            where,
            orderBy: [{ column: "created_at", direction: "DESC" }],
        });
        const records = (result.rows ?? [])
            .map((row) => {
                try {
                    return parseRecord(row);
                } catch (error) {
                    this.log?.("error", "Failed to parse share token record.", {
                        component: "share-gateway",
                        operation: "parse_share_token_record",
                        error:
                            error instanceof Error
                                ? error.message
                                : String(error),
                    });
                    return null;
                }
            })
            .filter((record): record is ShareTokenRecord => Boolean(record));
        return records.filter((record) => !isExpired(record.expiresAt));
    }

    async purgeExpired(filter?: {
        ownerAccountId?: string;
        resourceType?: string;
        resourceId?: string;
    }): Promise<void> {
        const nowIso = new Date().toISOString();
        const where = [
            { column: "expires_at", operator: "!=", value: "" as const },
            { column: "expires_at", operator: "<", value: nowIso },
        ];
        if (filter?.ownerAccountId) {
            where.push({
                column: "owner_account_id",
                value: filter.ownerAccountId,
            });
        }
        if (filter?.resourceType) {
            where.push({ column: "resource_type", value: filter.resourceType });
        }
        if (filter?.resourceId) {
            where.push({ column: "resource_id", value: filter.resourceId });
        }
        await this.db.executeCommand({
            option: "DELETE",
            table: "share_tokens",
            where,
        });
    }

    async deleteById(input: {
        shareId: string;
        ownerAccountId?: string;
        resourceType?: string;
        resourceId?: string;
    }): Promise<boolean> {
        const record = await this.getById(input.shareId);
        if (!record) {
            return false;
        }
        if (
            input.ownerAccountId &&
            record.ownerAccountId !== String(input.ownerAccountId).trim()
        ) {
            return false;
        }
        if (
            input.resourceType &&
            record.resourceType !== String(input.resourceType).trim()
        ) {
            return false;
        }
        if (
            input.resourceId &&
            record.resourceId !== String(input.resourceId).trim()
        ) {
            return false;
        }
        await this.db.executeCommand({
            option: "DELETE",
            table: "share_tokens",
            where: [{ column: "id", value: record.id }],
        });
        return true;
    }

    async getById(shareId: string): Promise<ShareTokenRecord | null> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "share_tokens",
            where: [{ column: "id", value: String(shareId ?? "").trim() }],
            limit: 1,
        });
        const row = result.rows?.[0];
        if (!row) {
            return null;
        }
        try {
            const record = parseRecord(row);
            if (!record) {
                return null;
            }
            if (isExpired(record.expiresAt)) {
                await this.deleteById({ shareId: record.id });
                return null;
            }
            return record;
        } catch (error) {
            this.log?.("error", "Failed to parse share token record.", {
                component: "share-gateway",
                operation: "get_share_token_by_id",
                shareId,
                error: error instanceof Error ? error.message : String(error),
            });
            return null;
        }
    }

    async resolve(rawToken: string): Promise<ShareTokenRecord | null> {
        const parsedToken = parseShareToken(rawToken);
        if (!parsedToken) {
            return null;
        }
        const record = await this.getById(parsedToken.tokenId);
        if (!record) {
            return null;
        }
        if (record.tokenHash !== parsedToken.tokenHash) {
            return null;
        }
        return record;
    }
}

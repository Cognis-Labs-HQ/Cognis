import { createHash, randomBytes } from "node:crypto";
import type { DbExecutor } from "../../db/reuse/db-executor.js";
import {
    issueShareTokenValue,
    parseShareToken,
} from "../reuse/token-format.js";

export type {
    ShareAccessControls,
    ShareActivityEvent,
    SharePermission,
    ShareRecipient,
    ShareRecipientType,
    ShareTokenRecord,
} from "./types.js";
import type {
    ShareAccessControls,
    ShareActivityEvent,
    SharePermission,
    ShareRecipient,
    ShareTokenRecord,
} from "./types.js";

function normalizeOptionalString(value: unknown): string | null {
    if (typeof value !== "string") {
        return null;
    }
    const normalized = value.trim();
    return normalized ? normalized : null;
}

function normalizePermissions(value: unknown): SharePermission[] {
    const entries = Array.isArray(value) ? value : ["read"];
    const permissions = new Set<SharePermission>();
    for (const entry of entries) {
        const normalized = String(entry ?? "").trim();
        if (normalized === "read" || normalized === "write") {
            permissions.add(normalized);
        }
    }
    if (permissions.size === 0) {
        permissions.add("read");
    }
    if (permissions.has("write")) {
        permissions.add("read");
    }
    return Array.from(permissions).sort();
}

function normalizeRecipients(value: unknown): ShareRecipient[] {
    if (!Array.isArray(value)) {
        return [];
    }
    return value.flatMap((entry) => {
        if (!entry || typeof entry !== "object") {
            return [];
        }
        const candidate = entry as Record<string, unknown>;
        const type = String(candidate.type ?? "").trim();
        const id = String(candidate.id ?? "").trim();
        if ((type !== "user" && type !== "group" && type !== "email") || !id) {
            return [];
        }
        return [
            {
                type,
                id,
                label: normalizeOptionalString(candidate.label),
                handle: normalizeOptionalString(candidate.handle),
                avatarKey: normalizeOptionalString(candidate.avatarKey),
                permissions: normalizePermissions(candidate.permissions),
            },
        ];
    });
}

function normalizeAccessControls(value: unknown): ShareAccessControls {
    const candidate =
        value && typeof value === "object" && !Array.isArray(value)
            ? (value as Record<string, unknown>)
            : {};
    const permissions = normalizePermissions(candidate.permissions);
    return {
        permissions,
        recipients: normalizeRecipients(candidate.recipients),
        passwordProtected: candidate.passwordProtected === true,
        watermarkReadonly:
            candidate.watermarkReadonly === true ||
            (permissions.includes("read") && !permissions.includes("write")),
    };
}

function parseJsonObject(value: unknown): Record<string, unknown> | null {
    try {
        const parsed = value ? JSON.parse(String(value)) : null;
        return parsed && typeof parsed === "object" && !Array.isArray(parsed)
            ? (parsed as Record<string, unknown>)
            : null;
    } catch {
        return null;
    }
}

export {
    generateSharePassword,
    hashSharePassword,
    verifySharePassword,
} from "./password.js";
import { hashSharePassword, verifySharePassword } from "./password.js";

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

function normalizeMetadata(value: unknown): Record<string, string> | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return null;
    }
    const entries = Object.entries(value).flatMap(([key, entryValue]) => {
        const normalizedKey = String(key ?? "").trim();
        const normalizedValue = String(entryValue ?? "").trim();
        return normalizedKey && normalizedValue
            ? [[normalizedKey, normalizedValue] as const]
            : [];
    });
    return entries.length > 0 ? Object.fromEntries(entries) : null;
}

export function isExpired(expiresAt: string): boolean {
    return Boolean(expiresAt) && new Date(expiresAt).getTime() <= Date.now();
}

// Expired share tokens are kept around for this long after expiry so their
// owner can still see them listed with an "Expired" status and the time
// they expired, instead of the record vanishing the instant it lapses.
// purgeExpired() only removes tokens older than this retention window.
const EXPIRED_TOKEN_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

function parseRecord(
    row: Record<string, unknown>,
    log?: (
        level: string,
        message: string,
        meta?: Record<string, unknown>,
    ) => void,
): ShareTokenRecord | null {
    const id = String(row.id ?? "").trim();
    const ownerAccountId = String(row.owner_account_id ?? "").trim();
    const resourceKey = String(row.resource_key ?? "").trim();
    const resourceType = String(row.resource_type ?? "").trim();
    const resourceId = String(row.resource_id ?? "").trim();
    const tokenValue = String(row.token_value ?? "").trim();
    const tokenHash = String(row.token_hash ?? "").trim();
    const createdAt = String(row.created_at ?? "").trim();
    const updatedAt = String(row.updated_at ?? "").trim();
    const expiresAt = String(row.expires_at ?? "");
    const expirationNotifiedAt = String(row.expiration_notified_at ?? "");
    const lastAccessedAt = String(row.last_accessed_at ?? "");
    if (
        !id ||
        !ownerAccountId ||
        !resourceKey ||
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
        resourceKey,
        ownerAccountId,
        resourceType,
        resourceId,
        metadata: normalizeMetadata(
            (() => {
                try {
                    return row.metadata
                        ? JSON.parse(String(row.metadata))
                        : null;
                } catch (error) {
                    log?.("error", "Failed to parse share token metadata.", {
                        component: "share-gateway",
                        operation: "parse_share_token_metadata",
                        error:
                            error instanceof Error
                                ? error.message
                                : String(error),
                    });
                    return null;
                }
            })(),
        ),
        tokenValue,
        tokenHash,
        passwordHash: normalizeOptionalString(row.password_hash),
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
        accessControls: normalizeAccessControls(
            parseJsonObject(row.access_controls),
        ),
        expiresAt,
        expirationNotifiedAt,
        lastAccessedAt,
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
            name: "share_resources",
            columns: [
                { name: "resource_key", type: "text", primaryKey: true },
                { name: "resource_type", type: "text", notNull: true },
                { name: "resource_id", type: "text", notNull: true },
                { name: "content_url", type: "text", notNull: true },
                { name: "created_at", type: "text", notNull: true },
            ],
            uniqueKeys: [["resource_type", "resource_id", "content_url"]],
        });
        await this.db.ensureTable({
            name: "share_tokens",
            columns: [
                { name: "id", type: "text", primaryKey: true },
                {
                    name: "resource_key",
                    type: "text",
                    notNull: true,
                    references: {
                        table: "share_resources",
                        column: "resource_key",
                        onDelete: "CASCADE",
                    },
                },
                { name: "owner_account_id", type: "text", notNull: true },
                { name: "resource_type", type: "text", notNull: true },
                { name: "resource_id", type: "text", notNull: true },
                { name: "metadata", type: "text" },
                { name: "token_value", type: "text", notNull: true },
                { name: "token_hash", type: "text", notNull: true },
                { name: "password_hash", type: "text" },
                { name: "label", type: "text" },
                { name: "granted_capabilities", type: "text", notNull: true },
                { name: "access_controls", type: "text", notNull: true },
                { name: "expires_at", type: "text", notNull: true },
                { name: "expiration_notified_at", type: "text" },
                { name: "last_accessed_at", type: "text" },
                { name: "created_at", type: "text", notNull: true },
                { name: "updated_at", type: "text", notNull: true },
            ],
        });
        await this.backfillResourceKeys();
        await this.db.ensureTable({
            name: "share_account_unlocks",
            columns: [
                { name: "id", type: "text", primaryKey: true },
                {
                    name: "share_id",
                    type: "text",
                    notNull: true,
                    references: {
                        table: "share_tokens",
                        column: "id",
                        onDelete: "CASCADE",
                    },
                },
                { name: "account_id", type: "text", notNull: true },
                { name: "created_at", type: "text", notNull: true },
            ],
            uniqueKeys: [["share_id", "account_id"]],
        });
        await this.db.ensureTable({
            name: "share_activity_events",
            columns: [
                { name: "id", type: "text", primaryKey: true },
                {
                    name: "share_id",
                    type: "text",
                    notNull: true,
                    references: {
                        table: "share_tokens",
                        column: "id",
                        onDelete: "CASCADE",
                    },
                },
                { name: "event_type", type: "text", notNull: true },
                { name: "occurred_at", type: "text", notNull: true },
            ],
        });
        await this.backfillActivityEvents();
    }

    private async recordActivity(
        shareId: string,
        type: ShareActivityEvent["type"],
        occurredAt: string,
    ): Promise<void> {
        await this.db.executeCommand({
            option: "INSERT",
            table: "share_activity_events",
            values: {
                id: randomBytes(16).toString("hex"),
                share_id: shareId,
                event_type: type,
                occurred_at: occurredAt,
            },
        });
    }

    async listActivity(shareId: string): Promise<ShareActivityEvent[]> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "share_activity_events",
            where: [{ column: "share_id", value: shareId }],
            orderBy: [{ column: "occurred_at", direction: "ASC" }],
        });
        return (result.rows ?? []).flatMap((row) => {
            const type = String(row.event_type ?? "");
            const occurredAt = String(row.occurred_at ?? "");
            if (
                (type !== "created" &&
                    type !== "updated" &&
                    type !== "accessed") ||
                !occurredAt
            ) {
                return [];
            }
            return [
                {
                    id: String(row.id ?? ""),
                    shareId: String(row.share_id ?? shareId),
                    type,
                    occurredAt,
                },
            ];
        });
    }

    private async backfillActivityEvents(): Promise<void> {
        const tokenResult = await this.db.executeCommand({
            option: "SELECT",
            table: "share_tokens",
        });
        for (const row of tokenResult.rows ?? []) {
            const shareId = String(row.id ?? "").trim();
            if (!shareId) continue;
            const existingTypes = new Set(
                (await this.listActivity(shareId)).map((event) => event.type),
            );
            const createdAt = String(row.created_at ?? "").trim();
            const updatedAt = String(row.updated_at ?? "").trim();
            const lastAccessedAt = String(row.last_accessed_at ?? "").trim();
            if (createdAt && !existingTypes.has("created")) {
                await this.recordActivity(shareId, "created", createdAt);
            }
            if (
                updatedAt &&
                updatedAt !== createdAt &&
                !existingTypes.has("updated")
            ) {
                await this.recordActivity(shareId, "updated", updatedAt);
            }
            if (lastAccessedAt && !existingTypes.has("accessed")) {
                await this.recordActivity(shareId, "accessed", lastAccessedAt);
            }
        }
    }

    private async backfillResourceKeys(): Promise<void> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "share_tokens",
        });
        for (const row of result.rows ?? []) {
            if (String(row.resource_key ?? "").trim()) continue;
            const resourceType = String(row.resource_type ?? "").trim();
            const resourceId = String(row.resource_id ?? "").trim();
            if (!resourceType || !resourceId) continue;
            const metadata = parseJsonObject(row.metadata);
            const contentUrl = String(metadata?.contentUrl ?? "").trim();
            const resourceKey = createHash("sha256")
                .update(`${resourceType}\u0000${resourceId}\u0000${contentUrl}`)
                .digest("hex");
            const existing = await this.db.executeCommand({
                option: "SELECT",
                table: "share_resources",
                where: [{ column: "resource_key", value: resourceKey }],
            });
            if ((existing.rows ?? []).length === 0) {
                await this.db.executeCommand({
                    option: "INSERT",
                    table: "share_resources",
                    values: {
                        resource_key: resourceKey,
                        resource_type: resourceType,
                        resource_id: resourceId,
                        content_url: contentUrl,
                        created_at: String(
                            row.created_at ?? new Date().toISOString(),
                        ),
                    },
                });
            }
            await this.db.executeCommand({
                option: "UPDATE",
                table: "share_tokens",
                set: { resource_key: resourceKey },
                where: [{ column: "id", value: row.id }],
            });
        }
    }

    async grantAccountUnlock(
        shareId: string,
        accountId: string,
    ): Promise<void> {
        const id = createHash("sha256")
            .update(`${shareId}\u0000${accountId}`)
            .digest("hex");
        const existing = await this.db.executeCommand({
            option: "SELECT",
            table: "share_account_unlocks",
            where: [{ column: "id", value: id }],
        });
        if ((existing.rows ?? []).length > 0) return;
        await this.db.executeCommand({
            option: "INSERT",
            table: "share_account_unlocks",
            values: {
                id,
                share_id: shareId,
                account_id: accountId,
                created_at: new Date().toISOString(),
            },
        });
    }

    async hasAccountUnlock(
        shareId: string,
        accountId: string,
    ): Promise<boolean> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "share_account_unlocks",
            where: [
                { column: "share_id", value: shareId },
                { column: "account_id", value: accountId },
            ],
            limit: 1,
        });
        return (result.rows ?? []).length > 0;
    }

    async clearAccountUnlocks(shareId: string): Promise<void> {
        await this.db.executeCommand({
            option: "DELETE",
            table: "share_account_unlocks",
            where: [{ column: "share_id", value: shareId }],
        });
    }

    async issue(input: {
        ownerAccountId: string;
        resourceType: string;
        resourceId: string;
        metadata?: Record<string, string> | null;
        label?: string | null;
        grantedCapabilities?: string[];
        accessControls?: Partial<ShareAccessControls>;
        password?: string | null;
        expiresAt?: string;
    }): Promise<ShareTokenRecord> {
        const token = issueShareTokenValue();
        const createdAt = new Date().toISOString();
        const resourceType = String(input.resourceType ?? "").trim();
        const resourceId = String(input.resourceId ?? "").trim();
        const metadata = normalizeMetadata(input.metadata);
        const contentUrl = String(metadata?.contentUrl ?? "").trim();
        const resourceKey = createHash("sha256")
            .update(`${resourceType}\u0000${resourceId}\u0000${contentUrl}`)
            .digest("hex");
        const existingResource = await this.db.executeCommand({
            option: "SELECT",
            table: "share_resources",
            where: [{ column: "resource_key", value: resourceKey }],
        });
        if ((existingResource.rows ?? []).length === 0) {
            await this.db.executeCommand({
                option: "INSERT",
                table: "share_resources",
                values: {
                    resource_key: resourceKey,
                    resource_type: resourceType,
                    resource_id: resourceId,
                    content_url: contentUrl,
                    created_at: createdAt,
                },
            });
        }
        const record: ShareTokenRecord = {
            id: token.tokenId,
            resourceKey,
            ownerAccountId: String(input.ownerAccountId ?? "").trim(),
            resourceType,
            resourceId,
            metadata,
            tokenValue: token.tokenValue,
            tokenHash: token.tokenHash,
            passwordHash: input.password
                ? hashSharePassword(input.password)
                : null,
            label: normalizeOptionalString(input.label),
            grantedCapabilities: normalizeCapabilities(
                input.grantedCapabilities ?? [],
            ),
            accessControls: normalizeAccessControls({
                ...(input.accessControls ?? {}),
                passwordProtected: Boolean(input.password),
            }),
            expiresAt: String(input.expiresAt ?? ""),
            expirationNotifiedAt: "",
            lastAccessedAt: "",
            createdAt,
            updatedAt: createdAt,
        };
        await this.db.executeCommand({
            option: "INSERT",
            table: "share_tokens",
            values: {
                id: record.id,
                resource_key: record.resourceKey,
                owner_account_id: record.ownerAccountId,
                resource_type: record.resourceType,
                resource_id: record.resourceId,
                metadata: record.metadata
                    ? JSON.stringify(record.metadata)
                    : null,
                token_value: record.tokenValue,
                token_hash: record.tokenHash,
                password_hash: record.passwordHash,
                label: record.label,
                granted_capabilities: JSON.stringify(
                    record.grantedCapabilities,
                ),
                access_controls: JSON.stringify(record.accessControls),
                expires_at: record.expiresAt,
                expiration_notified_at: null,
                last_accessed_at: null,
                created_at: record.createdAt,
                updated_at: record.updatedAt,
            },
        });
        try {
            await this.recordActivity(record.id, "created", record.createdAt);
        } catch (error) {
            this.log?.("error", "Failed to record share creation activity.", {
                component: "share-gateway",
                operation: "record_share_creation_activity",
                shareId: record.id,
                error: error instanceof Error ? error.message : String(error),
            });
        }
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
                    return parseRecord(row, this.log);
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
        return records;
    }

    async listByResource(filter: {
        resourceType: string;
        resourceId: string;
    }): Promise<ShareTokenRecord[]> {
        await this.purgeExpired(filter);
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "share_tokens",
            where: [
                { column: "resource_type", value: filter.resourceType },
                { column: "resource_id", value: filter.resourceId },
            ],
            orderBy: [{ column: "created_at", direction: "DESC" }],
        });
        const records = (result.rows ?? [])
            .map((row) => {
                try {
                    return parseRecord(row, this.log);
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
        return records;
    }

    async listByRecipient(
        recipientAccountId: string,
    ): Promise<ShareTokenRecord[]> {
        await this.purgeExpired();
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "share_tokens",
            orderBy: [{ column: "created_at", direction: "DESC" }],
        });
        return (result.rows ?? [])
            .map((row) => {
                try {
                    return parseRecord(row, this.log);
                } catch (error) {
                    this.log?.(
                        "error",
                        "Failed to parse received share token.",
                        {
                            component: "share-gateway",
                            operation: "list_received_shares",
                            recipientAccountId,
                            error:
                                error instanceof Error
                                    ? error.message
                                    : String(error),
                        },
                    );
                    return null;
                }
            })
            .filter((record): record is ShareTokenRecord =>
                Boolean(
                    record?.accessControls.recipients.some(
                        (recipient) =>
                            recipient.type === "user" &&
                            recipient.id === recipientAccountId,
                    ),
                ),
            );
    }

    async claimExpiredNotifications(): Promise<ShareTokenRecord[]> {
        const now = new Date().toISOString();
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "share_tokens",
            where: [
                { column: "expires_at", operator: "!=", value: "" },
                { column: "expires_at", operator: "<", value: now },
            ],
        });
        const records = (result.rows ?? [])
            .map((row) => {
                try {
                    return parseRecord(row, this.log);
                } catch {
                    return null;
                }
            })
            .filter((record): record is ShareTokenRecord =>
                Boolean(record && !record.expirationNotifiedAt),
            );
        return records;
    }

    async markExpirationNotificationSent(shareId: string): Promise<void> {
        await this.db.executeCommand({
            option: "UPDATE",
            table: "share_tokens",
            set: { expiration_notified_at: new Date().toISOString() },
            where: [{ column: "id", value: shareId }],
        });
    }

    async purgeExpired(filter?: {
        ownerAccountId?: string;
        resourceType?: string;
        resourceId?: string;
    }): Promise<void> {
        const retentionCutoffIso = new Date(
            Date.now() - EXPIRED_TOKEN_RETENTION_MS,
        ).toISOString();
        // We persist "never expires" tokens with an empty expires_at value, so
        // expiry deletion must first exclude empty rows before applying the
        // timestamp comparison. Tokens that expired within the retention
        // window are kept so their owner can still see them as "Expired".
        const where = [
            { column: "expires_at", operator: "!=", value: "" as const },
            { column: "expires_at", operator: "<", value: retentionCutoffIso },
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
            // Expired tokens are intentionally not deleted here so their
            // owner can still see them listed with an "Expired" status
            // until purgeExpired() removes them after the retention window.
            return parseRecord(row, this.log);
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

    async updateById(input: {
        shareId: string;
        ownerAccountId: string;
        label?: string | null;
        grantedCapabilities?: string[];
        accessControls?: Partial<ShareAccessControls>;
        password?: string | null;
        clearPassword?: boolean;
        expiresAt?: string;
    }): Promise<ShareTokenRecord | null> {
        const record = await this.getById(input.shareId);
        if (
            !record ||
            record.ownerAccountId !== String(input.ownerAccountId ?? "").trim()
        ) {
            return null;
        }
        const accessControlsInput = input.accessControls ?? {};
        const keepExistingWatermark =
            !Object.prototype.hasOwnProperty.call(
                accessControlsInput,
                "permissions",
            ) ||
            Object.prototype.hasOwnProperty.call(
                accessControlsInput,
                "watermarkReadonly",
            );
        const updatedControls = normalizeAccessControls({
            ...record.accessControls,
            ...(keepExistingWatermark ? {} : { watermarkReadonly: undefined }),
            ...accessControlsInput,
            passwordProtected: input.clearPassword
                ? false
                : Boolean(input.password) ||
                  record.accessControls.passwordProtected,
        });
        const updatedAt = new Date().toISOString();
        await this.db.executeCommand({
            option: "UPDATE",
            table: "share_tokens",
            set: {
                label:
                    input.label === undefined
                        ? record.label
                        : normalizeOptionalString(input.label),
                granted_capabilities: JSON.stringify(
                    input.grantedCapabilities === undefined
                        ? record.grantedCapabilities
                        : normalizeCapabilities(input.grantedCapabilities),
                ),
                access_controls: JSON.stringify(updatedControls),
                password_hash: input.clearPassword
                    ? null
                    : input.password
                      ? hashSharePassword(input.password)
                      : record.passwordHash,
                expires_at:
                    input.expiresAt === undefined
                        ? record.expiresAt
                        : String(input.expiresAt ?? ""),
                updated_at: updatedAt,
            },
            where: [{ column: "id", value: record.id }],
        });
        if (input.password !== undefined || input.clearPassword) {
            await this.clearAccountUnlocks(record.id);
        }
        await this.recordActivity(record.id, "updated", updatedAt);
        return this.getById(record.id);
    }

    async resolve(
        rawToken: string,
        password?: string | null,
    ): Promise<ShareTokenRecord | null> {
        const record = await this.inspect(rawToken);
        if (!record) {
            return null;
        }
        if (record.passwordHash) {
            const candidate = password ? String(password) : "";
            if (!verifySharePassword(candidate, record.passwordHash)) {
                return null;
            }
        }
        const lastAccessedAt = new Date().toISOString();
        await this.recordActivity(record.id, "accessed", lastAccessedAt);
        const accessRecorded = await this.db
            .executeCommand({
                option: "UPDATE",
                table: "share_tokens",
                set: { last_accessed_at: lastAccessedAt },
                where: [{ column: "id", value: record.id }],
            })
            .then(() => true)
            .catch((error) => {
                this.log?.("warn", "Could not record share access time.", {
                    component: "share-gateway",
                    operation: "record_share_access",
                    shareId: record.id,
                    error:
                        error instanceof Error ? error.message : String(error),
                });
                return false;
            });
        return {
            ...record,
            lastAccessedAt: accessRecorded
                ? lastAccessedAt
                : record.lastAccessedAt,
        };
    }

    async inspect(rawToken: string): Promise<ShareTokenRecord | null> {
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
        if (isExpired(record.expiresAt)) {
            return null;
        }
        return record;
    }
}

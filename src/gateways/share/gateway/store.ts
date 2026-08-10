import {
    createHash,
    pbkdf2Sync,
    randomBytes,
    timingSafeEqual,
} from "node:crypto";
import type { DbExecutor } from "../../db/reuse/db-executor.js";
import {
    issueShareTokenValue,
    parseShareToken,
} from "../reuse/token-format.js";

export type SharePermission = "read" | "write";

export type ShareRecipientType = "user" | "group" | "email";

export interface ShareRecipient {
    type: ShareRecipientType;
    id: string;
    label?: string | null;
    handle?: string | null;
    avatarKey?: string | null;
    permissions: SharePermission[];
}

export interface ShareAccessControls {
    permissions: SharePermission[];
    recipients: ShareRecipient[];
    passwordProtected: boolean;
    watermarkReadonly: boolean;
}

export interface ShareTokenRecord {
    id: string;
    resourceKey: string;
    ownerAccountId: string;
    resourceType: string;
    resourceId: string;
    metadata: Record<string, string> | null;
    tokenValue: string;
    tokenHash: string;
    passwordHash: string | null;
    label: string | null;
    grantedCapabilities: string[];
    accessControls: ShareAccessControls;
    expiresAt: string;
    expirationNotifiedAt: string;
    lastAccessedAt: string;
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

export function generateSharePassword(): string {
    return randomBytes(9).toString("base64url");
}

const SHARE_PASSWORD_KDF_ALGO = "pbkdf2_sha512";
const SHARE_PASSWORD_KDF_DIGEST = "sha512";
const SHARE_PASSWORD_KDF_ITERATIONS = 210000;
const SHARE_PASSWORD_KDF_KEYLEN = 32;

export function hashSharePassword(password: string): string {
    const normalized = String(password ?? "");
    const salt = randomBytes(16);
    const derived = pbkdf2Sync(
        normalized,
        salt,
        SHARE_PASSWORD_KDF_ITERATIONS,
        SHARE_PASSWORD_KDF_KEYLEN,
        SHARE_PASSWORD_KDF_DIGEST,
    );
    return `${SHARE_PASSWORD_KDF_ALGO}$${SHARE_PASSWORD_KDF_ITERATIONS}$${salt.toString("hex")}$${derived.toString("hex")}`;
}

function verifySharePassword(password: string, storedHash: string): boolean {
    const normalized = String(password ?? "");
    const encoded = String(storedHash ?? "");
    const parts = encoded.split("$");
    if (parts.length === 4 && parts[0] === SHARE_PASSWORD_KDF_ALGO) {
        const iterations = Number(parts[1]);
        const saltHex = parts[2];
        const expectedHex = parts[3];
        if (!Number.isFinite(iterations) || iterations <= 0) {
            return false;
        }
        const salt = Buffer.from(saltHex, "hex");
        const expected = Buffer.from(expectedHex, "hex");
        const actual = pbkdf2Sync(
            normalized,
            salt,
            iterations,
            expected.length || SHARE_PASSWORD_KDF_KEYLEN,
            SHARE_PASSWORD_KDF_DIGEST,
        );
        return (
            expected.length === actual.length &&
            timingSafeEqual(expected, actual)
        );
    }
    return false;
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

function parseRecord(row: Record<string, unknown>): ShareTokenRecord | null {
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
                    this.log?.(
                        "error",
                        "Failed to parse expired share token.",
                        {
                            component: "share-gateway",
                            operation: "claim_expired_share_notifications",
                            error:
                                error instanceof Error
                                    ? error.message
                                    : String(error),
                        },
                    );
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
                    return parseRecord(row);
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
                    return parseRecord(row);
                } catch {
                    return null;
                }
            })
            .filter((record): record is ShareTokenRecord =>
                Boolean(record && !record.expirationNotifiedAt),
            );
        for (const record of records) {
            await this.db.executeCommand({
                option: "UPDATE",
                table: "share_tokens",
                values: { expiration_notified_at: now },
                where: [{ column: "id", value: record.id }],
            });
        }
        return records;
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
            return parseRecord(row);
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
            values: {
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
        await this.db.executeCommand({
            option: "UPDATE",
            table: "share_tokens",
            values: { last_accessed_at: lastAccessedAt },
            where: [{ column: "id", value: record.id }],
        });
        return { ...record, lastAccessedAt };
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

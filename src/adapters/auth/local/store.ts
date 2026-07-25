/**
 * DB-backed implementation of LocalAccountStore for the local auth adapter.
 *
 * This class is the sole concrete persistence layer for local user accounts.
 * It is instantiated by the auth gateway bootstrap and passed to the local
 * auth adapter. Nothing outside the auth gateway bootstrap should hold a
 * direct reference to this class.
 *
 * All persistence goes through the structured DbExecutor DSL — no raw SQL.
 */
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { AuthContext, BootstrapLog } from "@cognis/core";
import type { LocalAccountStore } from "../../../api/reuse/account-store.js";
import {
    normalizeUsername,
    validateUsername,
} from "../../../api/reuse/account-store.js";
import type { DbExecutor } from "../../../gateways/db/reuse/db-executor.js";

const scryptAsync = promisify(scrypt);
const PASSWORD_HISTORY_LIMIT = 10;

async function hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString("hex");
    const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
    return `scrypt:${salt}:${derivedKey.toString("hex")}`;
}

async function verifyPassword(
    stored: string,
    candidate: string,
): Promise<boolean> {
    if (!stored.startsWith("scrypt:")) {
        return false;
    }
    const [, salt, keyHex] = stored.split(":");
    const candidateKey = (await scryptAsync(candidate, salt, 64)) as Buffer;
    const storedKey = Buffer.from(keyHex, "hex");
    return (
        candidateKey.length === storedKey.length &&
        timingSafeEqual(candidateKey, storedKey)
    );
}

export class DbLocalAccountStore implements LocalAccountStore {
    constructor(
        private readonly db: DbExecutor,
        private readonly log?: BootstrapLog,
    ) {}

    private writeLog(
        level: "debug" | "info" | "warn" | "error",
        message: string,
        meta?: Record<string, unknown>,
    ): void {
        this.log?.(level, message, meta);
    }

    async ensureExternalAccount(identity: {
        accountId: string;
        provider: string;
        externalUserId: string;
        email?: string;
        displayName?: string;
        role?: string;
    }): Promise<void> {
        const now = new Date().toISOString();
        const role =
            identity.role === "teacher" ||
            identity.role === "moderator" ||
            identity.role === "admin"
                ? identity.role
                : "user";
        await this.db.transaction(async (txDb) => {
            await txDb.executeCommand({
                option: "INSERT",
                table: "accounts",
                values: {
                    id: identity.accountId,
                    email: identity.email ?? null,
                    display_name:
                        identity.displayName?.trim() || identity.accountId,
                    is_admin: role === "admin",
                    role,
                    enabled: true,
                    created_at: now,
                    updated_at: now,
                },
                conflict: { action: "ignore" },
            });
            await txDb.executeCommand({
                option: "INSERT",
                table: "auth_identities",
                values: {
                    id: `${identity.provider}:${identity.externalUserId}`,
                    account_id: identity.accountId,
                    provider: identity.provider,
                    external_user_id: identity.externalUserId,
                    created_at: now,
                    updated_at: now,
                },
                conflict: { action: "ignore" },
            });
        });
        this.writeLog("info", "Ensured external account identity.", {
            component: "auth-local-store",
            accountId: identity.accountId,
            provider: identity.provider,
        });
    }

    async ensureSchema() {
        await this.db.ensureTable({
            name: "auth_identities",
            columns: [
                { name: "id", type: "text", primaryKey: true },
                {
                    name: "account_id",
                    type: "text",
                    notNull: true,
                    references: {
                        table: "accounts",
                        column: "id",
                        onDelete: "CASCADE",
                    },
                },
                { name: "provider", type: "text", notNull: true },
                { name: "external_user_id", type: "text", notNull: true },
                {
                    name: "created_at",
                    type: "timestamp",
                    notNull: true,
                    default: "now",
                },
                {
                    name: "updated_at",
                    type: "timestamp",
                    notNull: true,
                    default: "now",
                },
            ],
            uniqueKeys: [["provider", "external_user_id"]],
            indexes: [{ columns: ["account_id"] }],
        });
        await this.db.ensureTable({
            name: "local_auth_password_history",
            columns: [
                { name: "account_id", type: "text", notNull: true },
                { name: "password_hash", type: "text", notNull: true },
                { name: "created_at", type: "timestamp", notNull: true },
            ],
            indexes: [{ columns: ["account_id"] }],
        });
    }

    async register(
        username: string,
        password: string,
        role: "user" | "teacher" | "moderator" | "admin" = "user",
        displayName?: string,
    ) {
        const validationError = validateUsername(username);
        if (validationError) throw new Error(validationError);
        if (await this.has(username)) throw new Error("username_taken");
        const passwordHash = await hashPassword(password);
        const accountDisplayName = displayName?.trim() || username;
        try {
            await this.db.transaction(async (txDb) => {
                await txDb.executeCommand({
                    option: "INSERT",
                    table: "accounts",
                    values: {
                        id: username,
                        display_name: accountDisplayName,
                        is_admin: role === "admin",
                        role,
                        enabled: true,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    },
                });
                await txDb.executeCommand({
                    option: "INSERT",
                    table: "local_auth_credentials",
                    values: {
                        account_id: username,
                        username,
                        password_hash: passwordHash,
                        password_algorithm: "scrypt",
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    },
                });
                await txDb.executeCommand({
                    option: "INSERT",
                    table: "local_auth_password_history",
                    values: {
                        account_id: username,
                        password_hash: passwordHash,
                        created_at: new Date().toISOString(),
                    },
                });
            });
        } catch (error) {
            this.writeLog("warn", "Account registration transaction failed.", {
                component: "auth-local-store",
                accountId: username,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
        this.writeLog("info", "Registered local account.", {
            component: "auth-local-store",
            accountId: username,
            role,
        });
        return { username, enabled: true, role };
    }

    async verify(
        username: string,
        password: string,
    ): Promise<AuthContext | null> {
        const lowercaseUsername = normalizeUsername(username);
        const credResult = await this.db.executeCommand({
            option: "SELECT",
            table: "local_auth_credentials",
            alias: "c",
            columns: [
                "c.username",
                "c.password_hash",
                { col: "a.is_admin", as: "is_admin" },
                { col: "a.role", as: "role" },
                { col: "a.enabled", as: "enabled" },
                { col: "p.role", as: "profile_role" },
            ],
            joins: [
                {
                    type: "INNER",
                    table: "accounts",
                    alias: "a",
                    on: { leftColumn: "c.account_id", rightColumn: "a.id" },
                },
                {
                    type: "LEFT",
                    table: "account_profiles",
                    alias: "p",
                    on: { leftColumn: "a.id", rightColumn: "p.account_id" },
                },
            ],
            where: [{ column: "c.username", value: lowercaseUsername }],
        });
        const account = credResult.rows?.[0];
        if (!account) return null;
        if (!Boolean(account.enabled)) return null;
        const passwordOk = await verifyPassword(
            String(account.password_hash),
            password,
        );
        if (!passwordOk) return null;
        const derivedRole =
            account.role ??
            account.profile_role ??
            (Boolean(account.is_admin) ? "admin" : "user");
        return {
            accountId: lowercaseUsername,
            provider: "local",
            externalUserId: lowercaseUsername,
            role: derivedRole,
        };
    }

    async has(username: string) {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "local_auth_credentials",
            columns: ["username"],
            where: [{ column: "username", value: normalizeUsername(username) }],
            limit: 1,
        });
        return Boolean(result.rows && result.rows.length > 0);
    }

    async list() {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "accounts",
            alias: "a",
            columns: [
                { col: "a.id", as: "username" },
                { col: "a.is_admin", as: "is_admin" },
                { col: "a.role", as: "role" },
                { col: "a.enabled", as: "enabled" },
                { col: "a.is_founder", as: "is_founder" },
                { col: "p.role", as: "profile_role" },
                { col: "i.provider", as: "provider" },
            ],
            joins: [
                {
                    type: "LEFT",
                    table: "auth_identities",
                    alias: "i",
                    on: { leftColumn: "a.id", rightColumn: "i.account_id" },
                },
                {
                    type: "LEFT",
                    table: "account_profiles",
                    alias: "p",
                    on: { leftColumn: "a.id", rightColumn: "p.account_id" },
                },
            ],
            orderBy: [{ column: "a.id", direction: "ASC" }],
        });
        return (result.rows ?? []).map((row) => ({
            username: String(row.username),
            enabled: Boolean(row.enabled),
            isFounder: Boolean(row.is_founder),
            role:
                (row.role as string | undefined) ??
                (row.profile_role as string | undefined) ??
                (Boolean(row.is_admin) ? "admin" : "user"),
            provider: row.provider ? String(row.provider) : "local",
        }));
    }

    async setRole(
        username: string,
        role: "user" | "teacher" | "moderator" | "admin",
    ) {
        const lowercaseUsername = normalizeUsername(username);
        const lookupResult = await this.db.executeCommand({
            option: "SELECT",
            table: "local_auth_credentials",
            columns: ["account_id"],
            where: [{ column: "username", value: lowercaseUsername }],
            limit: 1,
        });
        const accountId = lookupResult.rows?.[0]?.account_id;
        if (!accountId) return;
        await this.db.executeCommand({
            option: "UPDATE",
            table: "accounts",
            set: {
                is_admin: role === "admin",
                role,
                updated_at: new Date().toISOString(),
            },
            where: [{ column: "id", value: accountId }],
        });
        this.writeLog("info", "Updated local account role.", {
            component: "auth-local-store",
            accountId: lowercaseUsername,
            role,
        });
    }

    async setPassword(username: string, password: string) {
        const lowercaseUsername = normalizeUsername(username);
        const credentialResult = await this.db.executeCommand({
            option: "SELECT",
            table: "local_auth_credentials",
            columns: ["account_id", "password_hash"],
            where: [{ column: "username", value: lowercaseUsername }],
            limit: 1,
        });
        const accountId = credentialResult.rows?.[0]?.account_id;
        const currentPasswordHash = String(
            credentialResult.rows?.[0]?.password_hash ?? "",
        );
        if (!accountId) {
            throw new Error("not_found");
        }

        const passwordHistoryResult = await this.db.executeCommand({
            option: "SELECT",
            table: "local_auth_password_history",
            columns: ["password_hash", "created_at"],
            where: [{ column: "account_id", value: accountId }],
            orderBy: [
                { column: "created_at", direction: "DESC" },
                { column: "password_hash", direction: "DESC" },
            ],
            limit: PASSWORD_HISTORY_LIMIT,
        });
        for (const row of passwordHistoryResult.rows ?? []) {
            const passwordMatch = await verifyPassword(
                String(row.password_hash ?? ""),
                password,
            );
            if (passwordMatch) {
                throw new Error("Password was used previously.");
            }
        }
        const currentPasswordReused = await verifyPassword(
            currentPasswordHash,
            password,
        );
        if (currentPasswordReused) {
            throw new Error("Password was used previously.");
        }

        const passwordHash = await hashPassword(password);
        await this.db.transaction(async (txDb) => {
            const currentPasswordHistoryResult = await txDb.executeCommand({
                option: "SELECT",
                table: "local_auth_password_history",
                columns: ["password_hash"],
                where: [{ column: "account_id", value: accountId }],
            });
            const hasCurrentPasswordHash = (
                currentPasswordHistoryResult.rows ?? []
            ).some(
                (row) =>
                    String(row.password_hash ?? "") === currentPasswordHash,
            );
            if (currentPasswordHash && !hasCurrentPasswordHash) {
                await txDb.executeCommand({
                    option: "INSERT",
                    table: "local_auth_password_history",
                    values: {
                        account_id: accountId,
                        password_hash: currentPasswordHash,
                        created_at: new Date().toISOString(),
                    },
                });
            }
            await txDb.executeCommand({
                option: "UPDATE",
                table: "local_auth_credentials",
                set: {
                    password_hash: passwordHash,
                    password_algorithm: "scrypt",
                    updated_at: new Date().toISOString(),
                },
                where: [{ column: "username", value: lowercaseUsername }],
            });
            await txDb.executeCommand({
                option: "INSERT",
                table: "local_auth_password_history",
                values: {
                    account_id: accountId,
                    password_hash: passwordHash,
                    created_at: new Date().toISOString(),
                },
            });
            const trimmedHistoryResult = await txDb.executeCommand({
                option: "SELECT",
                table: "local_auth_password_history",
                columns: ["password_hash", "created_at"],
                where: [{ column: "account_id", value: accountId }],
                orderBy: [
                    { column: "created_at", direction: "DESC" },
                    { column: "password_hash", direction: "DESC" },
                ],
            });
            const rowsToDelete = (trimmedHistoryResult.rows ?? []).slice(
                PASSWORD_HISTORY_LIMIT,
            );
            for (const historyRow of rowsToDelete) {
                await txDb.executeCommand({
                    option: "DELETE",
                    table: "local_auth_password_history",
                    where: [
                        { column: "account_id", value: accountId },
                        {
                            column: "password_hash",
                            value: String(historyRow.password_hash ?? ""),
                        },
                        {
                            column: "created_at",
                            value: String(historyRow.created_at ?? ""),
                        },
                    ],
                });
            }
        });
        this.writeLog("info", "Updated local account password.", {
            component: "auth-local-store",
            accountId: lowercaseUsername,
        });
    }

    async setFounder(username: string, isFounder: boolean) {
        const lowercaseUsername = normalizeUsername(username);
        const lookupResult = await this.db.executeCommand({
            option: "SELECT",
            table: "local_auth_credentials",
            columns: ["account_id"],
            where: [{ column: "username", value: lowercaseUsername }],
            limit: 1,
        });
        const accountId = lookupResult.rows?.[0]?.account_id;
        if (!accountId) return;
        await this.db.executeCommand({
            option: "UPDATE",
            table: "accounts",
            set: {
                is_founder: isFounder,
                updated_at: new Date().toISOString(),
            },
            where: [{ column: "id", value: accountId }],
        });
        this.writeLog("info", "Updated local account founder status.", {
            component: "auth-local-store",
            accountId: lowercaseUsername,
            isFounder,
        });
    }

    async isFounder(username: string): Promise<boolean> {
        const lowercaseUsername = normalizeUsername(username);
        const lookupResult = await this.db.executeCommand({
            option: "SELECT",
            table: "local_auth_credentials",
            columns: ["account_id"],
            where: [{ column: "username", value: lowercaseUsername }],
            limit: 1,
        });
        const accountId = lookupResult.rows?.[0]?.account_id;
        if (!accountId) return false;
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "accounts",
            columns: ["is_founder"],
            where: [{ column: "id", value: accountId }],
            limit: 1,
        });
        return Boolean(result.rows?.[0]?.is_founder);
    }

    async exists(username: string): Promise<boolean> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "accounts",
            columns: ["id"],
            where: [{ column: "id", value: normalizeUsername(username) }],
            limit: 1,
        });
        return (result.rows?.length ?? 0) > 0;
    }

    async getDisplayName(username: string): Promise<string | null> {
        const lowercaseUsername = normalizeUsername(username);
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "accounts",
            columns: ["display_name"],
            where: [{ column: "id", value: lowercaseUsername }],
            limit: 1,
        });
        const value = result.rows?.[0]?.display_name;
        if (!value) return lowercaseUsername;
        return String(value);
    }

    async setEnabled(username: string, enabled: boolean) {
        const lowercaseUsername = normalizeUsername(username);
        const lookupResult = await this.db.executeCommand({
            option: "SELECT",
            table: "local_auth_credentials",
            columns: ["account_id"],
            where: [{ column: "username", value: lowercaseUsername }],
            limit: 1,
        });
        const accountId = lookupResult.rows?.[0]?.account_id;
        if (!accountId) return;
        await this.db.executeCommand({
            option: "UPDATE",
            table: "accounts",
            set: { enabled, updated_at: new Date().toISOString() },
            where: [{ column: "id", value: accountId }],
        });
        this.writeLog("info", "Updated local account enabled state.", {
            component: "auth-local-store",
            accountId: lowercaseUsername,
            enabled,
        });
    }

    async delete(username: string) {
        const lowercaseUsername = normalizeUsername(username);
        const lookupResult = await this.db.executeCommand({
            option: "SELECT",
            table: "local_auth_credentials",
            columns: ["account_id"],
            where: [{ column: "username", value: lowercaseUsername }],
            limit: 1,
        });
        const accountId = lookupResult.rows?.[0]?.account_id;
        if (!accountId) return;
        try {
            await this.db.transaction(async (txDb) => {
                await txDb.executeCommand({
                    option: "DELETE",
                    table: "local_auth_credentials",
                    where: [{ column: "username", value: lowercaseUsername }],
                });
                await txDb.executeCommand({
                    option: "DELETE",
                    table: "local_auth_password_history",
                    where: [{ column: "account_id", value: accountId }],
                });
                await txDb.executeCommand({
                    option: "DELETE",
                    table: "accounts",
                    where: [{ column: "id", value: accountId }],
                });
            });
        } catch (error) {
            this.writeLog(
                "warn",
                "Local account deletion transaction failed.",
                {
                    component: "auth-local-store",
                    accountId: lowercaseUsername,
                    error:
                        error instanceof Error ? error.message : String(error),
                },
            );
            throw error;
        }
        this.writeLog("info", "Deleted local account.", {
            component: "auth-local-store",
            accountId: lowercaseUsername,
        });
    }

    async getInfo(username: string): Promise<{
        username: string;
        createdAt: string | null;
        lastLogin: string | null;
        enabled: boolean;
        isFounder: boolean;
    } | null> {
        const lowercaseUsername = normalizeUsername(username);
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "accounts",
            alias: "a",
            columns: [
                { col: "a.id", as: "id" },
                { col: "a.created_at", as: "created_at" },
                { col: "a.last_login", as: "last_login" },
                { col: "a.enabled", as: "enabled" },
                { col: "a.is_admin", as: "is_admin" },
                { col: "a.is_founder", as: "is_founder" },
                { col: "a.role", as: "role" },
                { col: "i.provider", as: "provider" },
            ],
            joins: [
                {
                    type: "LEFT",
                    table: "auth_identities",
                    alias: "i",
                    on: {
                        leftColumn: "a.id",
                        rightColumn: "i.account_id",
                    },
                },
            ],
            where: [{ column: "a.id", value: lowercaseUsername }],
            limit: 1,
        });
        const row = result.rows?.[0];
        if (!row) return null;
        return {
            username: String(row.id),
            createdAt: row.created_at ? String(row.created_at) : null,
            lastLogin: row.last_login ? String(row.last_login) : null,
            enabled: Boolean(row.enabled),
            isFounder: Boolean(row.is_founder),
            role:
                (row.role as string | undefined) ??
                (Boolean(row.is_admin) ? "admin" : "user"),
            provider: row.provider ? String(row.provider) : "local",
        };
    }

    async updateLastLogin(username: string): Promise<void> {
        const lowercaseUsername = normalizeUsername(username);
        const lookupResult = await this.db.executeCommand({
            option: "SELECT",
            table: "local_auth_credentials",
            columns: ["account_id"],
            where: [{ column: "username", value: lowercaseUsername }],
            limit: 1,
        });
        const accountId = lookupResult.rows?.[0]?.account_id;
        if (!accountId) return;
        await this.db.executeCommand({
            option: "UPDATE",
            table: "accounts",
            set: {
                last_login: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            },
            where: [{ column: "id", value: accountId }],
        });
        this.writeLog(
            "debug",
            "Updated last-login timestamp for local account.",
            {
                component: "auth-local-store",
                accountId: lowercaseUsername,
            },
        );
    }
}

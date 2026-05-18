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
import type { DbExecutor } from "../../../gateways/db/reuse/db-executor.js";

const scryptAsync = promisify(scrypt);

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

    async ensureSchema() {
        // Schema is created by provider init scripts; this is a no-op safety net.
    }

    async register(
        username: string,
        password: string,
        role: "user" | "teacher" | "moderator" | "admin" = "user",
        displayName?: string,
    ) {
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
            where: [{ column: "c.username", value: username }],
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
            accountId: username,
            provider: "local",
            externalUserId: username,
            role: derivedRole,
        };
    }

    async has(username: string) {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "local_auth_credentials",
            columns: ["username"],
            where: [{ column: "username", value: username }],
            limit: 1,
        });
        return Boolean(result.rows && result.rows.length > 0);
    }

    async list() {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "local_auth_credentials",
            alias: "c",
            columns: [
                "c.username",
                { col: "a.is_admin", as: "is_admin" },
                { col: "a.role", as: "role" },
                { col: "a.enabled", as: "enabled" },
                { col: "a.is_founder", as: "is_founder" },
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
            orderBy: [{ column: "c.username", direction: "ASC" }],
        });
        return (result.rows ?? []).map((row) => ({
            username: String(row.username),
            enabled: Boolean(row.enabled),
            isFounder: Boolean(row.is_founder),
            role:
                (row.role as string | undefined) ??
                (row.profile_role as string | undefined) ??
                (Boolean(row.is_admin) ? "admin" : "user"),
        }));
    }

    async setRole(
        username: string,
        role: "user" | "teacher" | "moderator" | "admin",
    ) {
        const lookupResult = await this.db.executeCommand({
            option: "SELECT",
            table: "local_auth_credentials",
            columns: ["account_id"],
            where: [{ column: "username", value: username }],
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
            accountId: username,
            role,
        });
    }

    async setPassword(username: string, password: string) {
        const passwordHash = await hashPassword(password);
        await this.db.executeCommand({
            option: "UPDATE",
            table: "local_auth_credentials",
            set: {
                password_hash: passwordHash,
                password_algorithm: "scrypt",
                updated_at: new Date().toISOString(),
            },
            where: [{ column: "username", value: username }],
        });
        this.writeLog("info", "Updated local account password.", {
            component: "auth-local-store",
            accountId: username,
        });
    }

    async setFounder(username: string, isFounder: boolean) {
        const lookupResult = await this.db.executeCommand({
            option: "SELECT",
            table: "local_auth_credentials",
            columns: ["account_id"],
            where: [{ column: "username", value: username }],
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
            accountId: username,
            isFounder,
        });
    }

    async isFounder(username: string): Promise<boolean> {
        const lookupResult = await this.db.executeCommand({
            option: "SELECT",
            table: "local_auth_credentials",
            columns: ["account_id"],
            where: [{ column: "username", value: username }],
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
            where: [{ column: "id", value: username }],
            limit: 1,
        });
        return (result.rows?.length ?? 0) > 0;
    }

    async getDisplayName(username: string): Promise<string | null> {
        const lookupResult = await this.db.executeCommand({
            option: "SELECT",
            table: "local_auth_credentials",
            columns: ["account_id"],
            where: [{ column: "username", value: username }],
            limit: 1,
        });
        const accountId = lookupResult.rows?.[0]?.account_id;
        if (!accountId) return username;
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "accounts",
            columns: ["display_name"],
            where: [{ column: "id", value: accountId }],
            limit: 1,
        });
        const value = result.rows?.[0]?.display_name;
        if (!value) return username;
        return String(value);
    }

    async setEnabled(username: string, enabled: boolean) {
        const lookupResult = await this.db.executeCommand({
            option: "SELECT",
            table: "local_auth_credentials",
            columns: ["account_id"],
            where: [{ column: "username", value: username }],
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
            accountId: username,
            enabled,
        });
    }

    async delete(username: string) {
        const lookupResult = await this.db.executeCommand({
            option: "SELECT",
            table: "local_auth_credentials",
            columns: ["account_id"],
            where: [{ column: "username", value: username }],
            limit: 1,
        });
        const accountId = lookupResult.rows?.[0]?.account_id;
        if (!accountId) return;
        try {
            await this.db.transaction(async (txDb) => {
                await txDb.executeCommand({
                    option: "DELETE",
                    table: "local_auth_credentials",
                    where: [{ column: "username", value: username }],
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
                    accountId: username,
                    error:
                        error instanceof Error ? error.message : String(error),
                },
            );
            throw error;
        }
        this.writeLog("info", "Deleted local account.", {
            component: "auth-local-store",
            accountId: username,
        });
    }

    async getInfo(username: string): Promise<{
        username: string;
        createdAt: string | null;
        lastLogin: string | null;
        enabled: boolean;
        isFounder: boolean;
    } | null> {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "local_auth_credentials",
            alias: "c",
            columns: [
                "c.username",
                { col: "a.created_at", as: "created_at" },
                { col: "a.last_login", as: "last_login" },
                { col: "a.enabled", as: "enabled" },
                { col: "a.is_admin", as: "is_admin" },
                { col: "a.is_founder", as: "is_founder" },
                { col: "a.role", as: "role" },
            ],
            joins: [
                {
                    type: "INNER",
                    table: "accounts",
                    alias: "a",
                    on: { leftColumn: "c.account_id", rightColumn: "a.id" },
                },
            ],
            where: [{ column: "c.username", value: username }],
            limit: 1,
        });
        const row = result.rows?.[0];
        if (!row) return null;
        return {
            username: String(row.username),
            createdAt: row.created_at ? String(row.created_at) : null,
            lastLogin: row.last_login ? String(row.last_login) : null,
            enabled: Boolean(row.enabled),
            isFounder: Boolean(row.is_founder),
            role:
                (row.role as string | undefined) ??
                (Boolean(row.is_admin) ? "admin" : "user"),
        };
    }

    async updateLastLogin(username: string): Promise<void> {
        const lookupResult = await this.db.executeCommand({
            option: "SELECT",
            table: "local_auth_credentials",
            columns: ["account_id"],
            where: [{ column: "username", value: username }],
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
                accountId: username,
            },
        );
    }
}

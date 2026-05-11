/**
 * DB-backed implementation of LocalAccountStore for the local auth adapter.
 *
 * This class is the sole concrete persistence layer for local user accounts.
 * It is instantiated by the auth gateway bootstrap and passed to the local
 * auth adapter. Nothing outside the auth gateway bootstrap should hold a
 * direct reference to this class.
 *
 * The actual database schema is initialised by the SQL init scripts under
 * src/adapters/db/<provider>/sql/init/. The ensureSchema() method is a
 * no-op safety net only.
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

    async register(username: string, password: string, isAdmin = false) {
        if (await this.has(username)) throw new Error("username_taken");
        const role = isAdmin ? "admin" : "user";
        const passwordHash = await hashPassword(password);
        await this.db.execute("BEGIN");
        try {
            await this.db.execute(
                `INSERT INTO accounts (id, display_name, is_admin, role, created_at, updated_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                [username, username, role === "admin", role],
            );
            await this.db.execute(
                `INSERT INTO local_auth_credentials (account_id, username, password_hash, password_algorithm, created_at, updated_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                [username, username, passwordHash, "scrypt"],
            );
            await this.db.execute("COMMIT");
        } catch (error) {
            await this.db.execute("ROLLBACK");
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
            isAdmin,
        });
        return { username, isAdmin, enabled: true, role };
    }

    async verify(
        username: string,
        password: string,
    ): Promise<AuthContext | null> {
        const result = await this.db.execute(
            `SELECT c.username, c.password_hash, a.is_admin, a.role, a.enabled, p.role AS profile_role
       FROM local_auth_credentials c
       JOIN accounts a ON a.id = c.account_id
       LEFT JOIN account_profiles p ON p.account_id = a.id
       WHERE c.username = ?`,
            [username],
        );
        const account = result.rows?.[0];
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
            isAdmin: Boolean(account.is_admin),
            role: derivedRole,
        };
    }

    async has(username: string) {
        const result = await this.db.execute(
            `SELECT username FROM local_auth_credentials WHERE username = ?`,
            [username],
        );
        return Boolean(result.rows && result.rows.length > 0);
    }

    async list() {
        const result = await this.db.execute(
            `SELECT c.username, a.is_admin, a.role, a.enabled, a.is_founder, p.role AS profile_role
             FROM local_auth_credentials c
             JOIN accounts a ON a.id = c.account_id
             LEFT JOIN account_profiles p ON p.account_id = a.id
             ORDER BY c.username`,
        );
        return (result.rows ?? []).map((row) => ({
            username: row.username,
            isAdmin: Boolean(row.is_admin),
            enabled: Boolean(row.enabled),
            isFounder: Boolean(row.is_founder),
            role:
                row.role ??
                row.profile_role ??
                (Boolean(row.is_admin) ? "admin" : "user"),
        }));
    }

    async setRole(
        username: string,
        role: "user" | "teacher" | "moderator" | "admin",
    ) {
        await this.db.execute(
            `UPDATE accounts SET is_admin = ?, role = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = (SELECT account_id FROM local_auth_credentials WHERE username = ?)`,
            [role === "admin", role, username],
        );
        this.writeLog("info", "Updated local account role.", {
            component: "auth-local-store",
            accountId: username,
            role,
        });
    }

    async setPassword(username: string, password: string) {
        const passwordHash = await hashPassword(password);
        await this.db.execute(
            `UPDATE local_auth_credentials
       SET password_hash = ?, password_algorithm = ?, updated_at = CURRENT_TIMESTAMP
       WHERE username = ?`,
            [passwordHash, "scrypt", username],
        );
        this.writeLog("info", "Updated local account password.", {
            component: "auth-local-store",
            accountId: username,
        });
    }

    async setFounder(username: string, isFounder: boolean) {
        await this.db.execute(
            `UPDATE accounts SET is_founder = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = (SELECT account_id FROM local_auth_credentials WHERE username = ?)`,
            [isFounder, username],
        );
        this.writeLog("info", "Updated local account founder status.", {
            component: "auth-local-store",
            accountId: username,
            isFounder,
        });
    }

    async isFounder(username: string): Promise<boolean> {
        const result = await this.db.execute(
            `SELECT a.is_founder FROM accounts a
       JOIN local_auth_credentials c ON c.account_id = a.id
       WHERE c.username = ?`,
            [username],
        );
        return Boolean(result.rows?.[0]?.is_founder);
    }

    async exists(username: string): Promise<boolean> {
        const result = await this.db.execute(
            `SELECT id FROM accounts WHERE id = ?`,
            [username],
        );
        return (result.rows?.length ?? 0) > 0;
    }

    async getDisplayName(username: string): Promise<string | null> {
        const result = await this.db.execute(
            `SELECT a.display_name FROM accounts a
       JOIN local_auth_credentials c ON c.account_id = a.id
       WHERE c.username = ?`,
            [username],
        );
        const value = result.rows?.[0]?.display_name;
        if (!value) return username;
        return String(value);
    }

    async setEnabled(username: string, enabled: boolean) {
        await this.db.execute(
            `UPDATE accounts SET enabled = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = (SELECT account_id FROM local_auth_credentials WHERE username = ?)`,
            [enabled, username],
        );
        this.writeLog("info", "Updated local account enabled state.", {
            component: "auth-local-store",
            accountId: username,
            enabled,
        });
    }

    async delete(username: string) {
        const lookupResult = await this.db.execute(
            `SELECT account_id FROM local_auth_credentials WHERE username = ?`,
            [username],
        );
        const accountId = lookupResult.rows?.[0]?.account_id;
        if (!accountId) return;
        await this.db.execute("BEGIN");
        try {
            await this.db.execute(
                `DELETE FROM local_auth_credentials WHERE username = ?`,
                [username],
            );
            await this.db.execute(`DELETE FROM accounts WHERE id = ?`, [
                accountId,
            ]);
            await this.db.execute("COMMIT");
        } catch (error) {
            await this.db.execute("ROLLBACK");
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
        isAdmin: boolean;
        isFounder: boolean;
    } | null> {
        const result = await this.db.execute(
            `SELECT c.username, a.created_at, a.last_login, a.enabled, a.is_admin, a.is_founder, a.role
             FROM local_auth_credentials c
             JOIN accounts a ON a.id = c.account_id
             WHERE c.username = ?`,
            [username],
        );
        const row = result.rows?.[0];
        if (!row) return null;
        return {
            username: String(row.username),
            createdAt: row.created_at ? String(row.created_at) : null,
            lastLogin: row.last_login ? String(row.last_login) : null,
            enabled: Boolean(row.enabled),
            isAdmin: Boolean(row.is_admin),
            isFounder: Boolean(row.is_founder),
            role:
                (row.role as string | undefined) ??
                (Boolean(row.is_admin) ? "admin" : "user"),
        };
    }

    async updateLastLogin(username: string): Promise<void> {
        await this.db.execute(
            `UPDATE accounts SET last_login = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = (SELECT account_id FROM local_auth_credentials WHERE username = ?)`,
            [username],
        );
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

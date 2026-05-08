import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { DbExecutor } from "../../../gateways/db/reuse/db-executor.js";
import type { SupportedDbType } from "../../../gateways/db/executor.js";
import type { LocalAccountStore } from "../../../api/reuse/account-store.js";

interface RegistrationInviteRecord {
    id: string;
    inviterAccountId: string;
    inviterDisplayName: string;
    inviteeEmail: string;
    expiresAt: string;
    createdAt?: string;
    status?: "pending" | "expired" | "revoked" | "redeemed";
}

const FOUNDER_PENDING_INVITE_LIMIT = 20;
const INVITE_EXPIRY_MS = 24 * 60 * 60 * 1000;

export interface RegistrationTokenAdapter {
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
    }): Promise<RegistrationInviteRecord[]>;
    revokeInvite(input: {
        tokenId: string;
        revokedByAccountId: string;
    }): Promise<boolean>;
    resolveInvite(token: string): Promise<RegistrationInviteRecord | null>;
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

function normalizeEmail(input: string): string {
    return input.trim().toLowerCase();
}

function sha256(content: string): string {
    return createHash("sha256").update(content, "utf8").digest("hex");
}

function buildInviteUrl(baseUrl: string, token: string): string {
    let parsedBase: URL;
    try {
        parsedBase = new URL(baseUrl);
    } catch {
        throw new Error("invalid_invite_base_url");
    }
    if (parsedBase.protocol !== "http:" && parsedBase.protocol !== "https:") {
        throw new Error("invalid_invite_base_url");
    }
    parsedBase.pathname = "/register";
    parsedBase.search = `token=${encodeURIComponent(token)}`;
    return parsedBase.toString();
}

function parseToken(rawToken: string): { tokenId: string; tokenHash: string } {
    const token = rawToken.trim();
    const dotIndex = token.indexOf(".");
    if (dotIndex <= 0 || dotIndex === token.length - 1) {
        throw new Error("invalid_token");
    }
    return {
        tokenId: token.slice(0, dotIndex),
        tokenHash: sha256(token),
    };
}

export function createAdapter(deps: {
    dbExecutor: DbExecutor;
    dbType: SupportedDbType;
    accountStore: LocalAccountStore;
    canSendInviteEmail: () => boolean;
    sendInviteEmail: (
        to: string,
        inviterDisplayName: string,
        inviteUrl: string,
    ) => Promise<void>;
    createProfile?: (
        accountId: string,
        handle: string,
        role?: string,
        displayName?: string,
    ) => Promise<void>;
    isEmailRegistered: (email: string) => Promise<boolean>;
    upsertVerifiedPrimaryEmail: (
        accountId: string,
        email: string,
    ) => Promise<void>;
}): RegistrationTokenAdapter {
    const {
        dbExecutor,
        dbType,
        accountStore,
        canSendInviteEmail,
        sendInviteEmail,
        createProfile,
        isEmailRegistered,
        upsertVerifiedPrimaryEmail,
    } = deps;
    const placeholder = (index: number) =>
        dbType === "postgresql" ? `$${index}` : "?";

    async function readInviteByTokenHash(tokenHash: string) {
        const result = await dbExecutor.execute(
            `SELECT t.id, t.inviter_account_id, t.invitee_email, t.expires_at, a.display_name
         FROM registration_tokens t
         JOIN accounts a ON a.id = t.inviter_account_id
         WHERE t.token_hash = ${placeholder(1)}
           AND t.revoked_at IS NULL
           AND t.redeemed_at IS NULL`,
            [tokenHash],
        );
        return result.rows?.[0];
    }

    async function pendingFounderInviteCount(
        inviterAccountId: string,
    ): Promise<number> {
        const nowIso = new Date().toISOString();
        const result = await dbExecutor.execute(
            `SELECT COUNT(*) AS count
         FROM registration_tokens
         WHERE inviter_account_id = ${placeholder(1)}
           AND revoked_at IS NULL
           AND redeemed_at IS NULL
           AND expires_at > ${placeholder(2)}`,
            [inviterAccountId, nowIso],
        );
        const raw = result.rows?.[0]?.count;
        const count = Number(raw);
        return Number.isFinite(count) ? count : 0;
    }

    async function issueInvite(input: {
        inviterAccountId: string;
        inviterDisplayName: string;
        inviteeEmail: string;
        inviterIsFounder: boolean;
        inviteBaseUrl: string;
    }): Promise<{ tokenId: string; inviteUrl: string; expiresAt: string }> {
        if (!canSendInviteEmail()) throw new Error("smtp_unavailable");
        const inviteeEmail = normalizeEmail(input.inviteeEmail);
        if (!inviteeEmail) throw new Error("invitee_email_required");
        const emailTaken = await isEmailRegistered(inviteeEmail);
        if (emailTaken) throw new Error("email_taken");
        if (input.inviterIsFounder) {
            const pendingCount = await pendingFounderInviteCount(
                input.inviterAccountId,
            );
            if (pendingCount >= FOUNDER_PENDING_INVITE_LIMIT) {
                throw new Error("founder_token_limit_reached");
            }
        }
        const tokenId = randomUUID();
        const secret = randomBytes(32).toString("base64url");
        const rawToken = `${tokenId}.${secret}`;
        const tokenHash = sha256(rawToken);
        const expiresAt = new Date(Date.now() + INVITE_EXPIRY_MS).toISOString();
        const inviteUrl = buildInviteUrl(input.inviteBaseUrl, rawToken);

        await dbExecutor.execute(
            `INSERT INTO registration_tokens
         (id, token_hash, inviter_account_id, invitee_email, expires_at)
         VALUES (${placeholder(1)}, ${placeholder(2)}, ${placeholder(3)}, ${placeholder(4)}, ${placeholder(5)})`,
            [
                tokenId,
                tokenHash,
                input.inviterAccountId,
                inviteeEmail,
                expiresAt,
            ],
        );

        try {
            await sendInviteEmail(
                inviteeEmail,
                input.inviterDisplayName,
                inviteUrl,
            );
        } catch (error) {
            await dbExecutor.execute(
                `DELETE FROM registration_tokens WHERE id = ${placeholder(1)}`,
                [tokenId],
            );
            throw error;
        }
        return { tokenId, inviteUrl, expiresAt };
    }

    async function listInvites(filter?: {
        inviterAccountId?: string;
        includeClosed?: boolean;
    }): Promise<RegistrationInviteRecord[]> {
        const now = Date.now();
        let sql = `SELECT t.id, t.inviter_account_id, t.invitee_email, t.expires_at, t.created_at, t.revoked_at, t.redeemed_at, a.display_name
       FROM registration_tokens t
       JOIN accounts a ON a.id = t.inviter_account_id
       WHERE 1 = 1`;
        const params: unknown[] = [];
        if (filter?.inviterAccountId) {
            sql += ` AND t.inviter_account_id = ${placeholder(params.length + 1)}`;
            params.push(filter.inviterAccountId);
        }
        sql += " ORDER BY t.created_at DESC";
        const result = await dbExecutor.execute(sql, params);
        return (result.rows ?? [])
            .map((row) => {
                const expiresAt = String(row.expires_at);
                const createdAt = String(row.created_at);
                const revokedAt = row.revoked_at
                    ? String(row.revoked_at)
                    : null;
                const redeemedAt = row.redeemed_at
                    ? String(row.redeemed_at)
                    : null;
                let status: "pending" | "expired" | "revoked" | "redeemed" =
                    "pending";
                if (redeemedAt) status = "redeemed";
                else if (revokedAt) status = "revoked";
                else if (new Date(expiresAt).getTime() <= now)
                    status = "expired";
                return {
                    id: String(row.id),
                    inviterAccountId: String(row.inviter_account_id),
                    inviterDisplayName: row.display_name
                        ? String(row.display_name)
                        : String(row.inviter_account_id),
                    inviteeEmail: String(row.invitee_email),
                    expiresAt,
                    createdAt,
                    status,
                };
            })
            .filter((row) =>
                filter?.includeClosed ? true : row.status === "pending",
            );
    }

    async function revokeInvite(input: {
        tokenId: string;
        revokedByAccountId: string;
    }): Promise<boolean> {
        const nowIso = new Date().toISOString();
        const result = await dbExecutor.execute(
            `UPDATE registration_tokens
         SET revoked_at = ${placeholder(1)}, revoked_by_account_id = ${placeholder(2)}
         WHERE id = ${placeholder(3)}
           AND revoked_at IS NULL
           AND redeemed_at IS NULL
           AND expires_at > ${placeholder(4)}`,
            [nowIso, input.revokedByAccountId, input.tokenId, nowIso],
        );
        return Number(result.rowCount ?? 0) > 0;
    }

    async function resolveInvite(
        token: string,
    ): Promise<RegistrationInviteRecord | null> {
        const { tokenHash } = parseToken(token);
        const row = await readInviteByTokenHash(tokenHash);
        if (!row) return null;
        const expiresAt = String(row.expires_at);
        if (new Date(expiresAt).getTime() <= Date.now()) return null;
        return {
            id: String(row.id),
            inviterAccountId: String(row.inviter_account_id),
            inviterDisplayName: row.display_name
                ? String(row.display_name)
                : String(row.inviter_account_id),
            inviteeEmail: String(row.invitee_email),
            expiresAt,
        };
    }

    async function rollbackCreatedAccount(accountId: string): Promise<void> {
        try {
            await accountStore.delete(accountId);
        } catch (error) {
            console.warn(
                JSON.stringify({
                    level: "warn",
                    component: "registration-token",
                    message:
                        "Failed to delete account during invite redemption rollback.",
                    accountId,
                    error:
                        error instanceof Error ? error.message : String(error),
                }),
            );
        }
    }

    async function redeemInvite(input: {
        token: string;
        username: string;
        password: string;
        displayName?: string;
    }): Promise<{ createdAccountId: string; inviterAccountId: string }> {
        const username = input.username.trim();
        const password = input.password;
        if (!username || !password) {
            throw new Error("username_and_password_required");
        }
        const invite = await resolveInvite(input.token);
        if (!invite) throw new Error("invalid_token");

        const inviterStillExists = await accountStore.exists(
            invite.inviterAccountId,
        );
        if (!inviterStillExists) throw new Error("inviter_not_found");

        const created = await accountStore.register(username, password, false);
        try {
            await upsertVerifiedPrimaryEmail(
                created.username,
                invite.inviteeEmail,
            );
        } catch (error) {
            await rollbackCreatedAccount(created.username);
            throw error;
        }
        const displayName = input.displayName?.trim();
        if (displayName) {
            await dbExecutor.execute(
                `UPDATE accounts SET display_name = ${placeholder(1)} WHERE id = ${placeholder(2)}`,
                [displayName, created.username],
            );
        }
        await dbExecutor.execute(
            `UPDATE accounts SET invited_by_account_id = ${placeholder(1)} WHERE id = ${placeholder(2)}`,
            [invite.inviterAccountId, created.username],
        );
        await createProfile?.(
            created.username,
            created.username,
            "user",
            displayName || undefined,
        );

        const nowIso = new Date().toISOString();
        const { tokenHash } = parseToken(input.token);
        const redeemResult = await dbExecutor.execute(
            `UPDATE registration_tokens
         SET redeemed_at = ${placeholder(1)}, redeemed_account_id = ${placeholder(2)}
          WHERE token_hash = ${placeholder(3)}
            AND revoked_at IS NULL
            AND redeemed_at IS NULL`,
            [nowIso, created.username, tokenHash],
        );
        if (Number(redeemResult.rowCount ?? 0) < 1) {
            await rollbackCreatedAccount(created.username);
            throw new Error("invalid_token");
        }
        return {
            createdAccountId: created.username,
            inviterAccountId: invite.inviterAccountId,
        };
    }

    return {
        issueInvite,
        listInvites,
        revokeInvite,
        resolveInvite,
        redeemInvite,
    };
}

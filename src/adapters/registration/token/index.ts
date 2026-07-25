import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { DbExecutor } from "../../../gateways/db/reuse/db-executor.js";
import type { LocalAccountStore } from "../../../gateways/auth/reuse/account-store.js";

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
    log?: (
        level: "debug" | "info" | "warn" | "error",
        message: string,
        meta?: Record<string, unknown>,
    ) => void;
}): RegistrationTokenAdapter {
    const {
        dbExecutor,
        accountStore,
        canSendInviteEmail,
        sendInviteEmail,
        createProfile,
        isEmailRegistered,
        upsertVerifiedPrimaryEmail,
        log,
    } = deps;

    async function readInviteByTokenHash(tokenHash: string) {
        const result = await dbExecutor.executeCommand({
            option: "SELECT",
            table: "registration_tokens",
            alias: "registration_tokens",
            columns: [
                "registration_tokens.id",
                "registration_tokens.inviter_account_id",
                "registration_tokens.invitee_email",
                "registration_tokens.expires_at",
                "accounts.display_name",
            ],
            joins: [
                {
                    type: "INNER",
                    table: "accounts",
                    alias: "accounts",
                    on: {
                        leftColumn: "accounts.id",
                        rightColumn: "registration_tokens.inviter_account_id",
                    },
                },
            ],
            where: [
                { column: "registration_tokens.token_hash", value: tokenHash },
                {
                    column: "registration_tokens.revoked_at",
                    operator: "IS NULL",
                },
                {
                    column: "registration_tokens.redeemed_at",
                    operator: "IS NULL",
                },
            ],
        });
        return result.rows?.[0];
    }

    async function pendingFounderInviteCount(
        inviterAccountId: string,
    ): Promise<number> {
        const nowIso = new Date().toISOString();
        const result = await dbExecutor.executeCommand({
            option: "SELECT",
            table: "registration_tokens",
            count: true,
            where: [
                { column: "inviter_account_id", value: inviterAccountId },
                { column: "revoked_at", operator: "IS NULL" },
                { column: "redeemed_at", operator: "IS NULL" },
                { column: "expires_at", operator: ">", value: nowIso },
            ],
        });
        const raw = result.rows?.[0]?.cnt;
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

        await dbExecutor.executeCommand({
            option: "INSERT",
            table: "registration_tokens",
            values: {
                id: tokenId,
                token_hash: tokenHash,
                inviter_account_id: input.inviterAccountId,
                invitee_email: inviteeEmail,
                expires_at: expiresAt,
            },
        });

        try {
            await sendInviteEmail(
                inviteeEmail,
                input.inviterDisplayName,
                inviteUrl,
            );
        } catch (error) {
            await dbExecutor.executeCommand({
                option: "DELETE",
                table: "registration_tokens",
                where: [{ column: "id", value: tokenId }],
            });
            throw error;
        }
        return { tokenId, inviteUrl, expiresAt };
    }

    async function listInvites(filter?: {
        inviterAccountId?: string;
        includeClosed?: boolean;
    }): Promise<RegistrationInviteRecord[]> {
        const now = Date.now();
        const whereConditions = filter?.inviterAccountId
            ? [
                  {
                      column: "registration_tokens.inviter_account_id",
                      value: filter.inviterAccountId,
                  },
              ]
            : undefined;
        const result = await dbExecutor.executeCommand({
            option: "SELECT",
            table: "registration_tokens",
            alias: "registration_tokens",
            columns: [
                "registration_tokens.id",
                "registration_tokens.inviter_account_id",
                "registration_tokens.invitee_email",
                "registration_tokens.expires_at",
                "registration_tokens.created_at",
                "registration_tokens.revoked_at",
                "registration_tokens.redeemed_at",
                "accounts.display_name",
            ],
            joins: [
                {
                    type: "INNER",
                    table: "accounts",
                    alias: "accounts",
                    on: {
                        leftColumn: "accounts.id",
                        rightColumn: "registration_tokens.inviter_account_id",
                    },
                },
            ],
            where: whereConditions,
            orderBy: [
                { column: "registration_tokens.created_at", direction: "DESC" },
            ],
        });
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
        const result = await dbExecutor.executeCommand({
            option: "UPDATE",
            table: "registration_tokens",
            set: {
                revoked_at: nowIso,
                revoked_by_account_id: input.revokedByAccountId,
            },
            where: [
                { column: "id", value: input.tokenId },
                { column: "revoked_at", operator: "IS NULL" },
                { column: "redeemed_at", operator: "IS NULL" },
                { column: "expires_at", operator: ">", value: nowIso },
            ],
        });
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
            log?.(
                "warn",
                "Failed to delete account during invite redemption rollback.",
                {
                    component: "registration-token",
                    accountId,
                    error:
                        error instanceof Error ? error.message : String(error),
                },
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

        const displayName = input.displayName?.trim() || undefined;
        const created = await accountStore.register(
            username,
            password,
            "user",
            displayName,
        );
        try {
            await upsertVerifiedPrimaryEmail(
                created.username,
                invite.inviteeEmail,
            );
        } catch (error) {
            await rollbackCreatedAccount(created.username);
            throw error;
        }
        if (displayName) {
            await dbExecutor.executeCommand({
                option: "UPDATE",
                table: "accounts",
                set: { display_name: displayName },
                where: [{ column: "id", value: created.username }],
            });
        }
        await dbExecutor.executeCommand({
            option: "UPDATE",
            table: "accounts",
            set: { invited_by_account_id: invite.inviterAccountId },
            where: [{ column: "id", value: created.username }],
        });
        await createProfile?.(
            created.username,
            created.username,
            "user",
            displayName,
        );

        const nowIso = new Date().toISOString();
        const { tokenHash } = parseToken(input.token);
        const redeemResult = await dbExecutor.executeCommand({
            option: "UPDATE",
            table: "registration_tokens",
            set: {
                redeemed_at: nowIso,
                redeemed_account_id: created.username,
            },
            where: [
                { column: "token_hash", value: tokenHash },
                { column: "revoked_at", operator: "IS NULL" },
                { column: "redeemed_at", operator: "IS NULL" },
            ],
        });
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

import test from "node:test";
import assert from "node:assert/strict";
import { createAdapter } from "../index.js";

test("redeemInvite deletes created account when token cannot be marked redeemed", async () => {
    let deletedAccountId = "";
    const dbExecutor = {
        async ensureTable() {},
        async executeCommand(command: { option: string; table?: string }) {
            if (
                command.option === "SELECT" &&
                command.table === "registration_tokens"
            ) {
                return {
                    rows: [
                        {
                            id: "token-1",
                            inviter_account_id: "inviter",
                            invitee_email: "invitee@example.com",
                            expires_at: new Date(
                                Date.now() + 60_000,
                            ).toISOString(),
                            display_name: "Inviter",
                        },
                    ],
                    rowCount: 1,
                };
            }
            if (
                command.option === "UPDATE" &&
                command.table === "registration_tokens"
            ) {
                return { rows: [], rowCount: 0 };
            }
            return { rows: [], rowCount: 1 };
        },
        async transaction<T>(
            callback: (executor: typeof dbExecutor) => Promise<T>,
        ) {
            return callback(dbExecutor);
        },
    };
    const accountStore = {
        async register(username: string) {
            return { username, role: "user", enabled: true };
        },
        async delete(username: string) {
            deletedAccountId = username;
        },
        async exists() {
            return true;
        },
    };
    const adapter = createAdapter({
        dbExecutor: dbExecutor as any,
        accountStore: accountStore as any,
        canSendInviteEmail: () => true,
        sendInviteEmail: async () => {},
        isEmailRegistered: async () => false,
        upsertVerifiedPrimaryEmail: async () => {},
    });
    assert.equal(adapter.id, "token");
    assert.equal(adapter.locked, true);
    const inviteAdapter = adapter.invite;
    assert.ok(inviteAdapter);

    await assert.rejects(
        () =>
            inviteAdapter!.redeemInvite({
                token: "token-1.secret-value",
                username: "new-user",
                password: "password",
            }),
        /invalid_token/,
    );
    assert.equal(
        deletedAccountId,
        "new-user",
        "created account should be removed if token redemption cannot be persisted",
    );
});

test("issueInvite revokes prior pending tokens for the same invitee email", async () => {
    const revokedEmails: string[] = [];
    let insertedTokenCount = 0;
    let sentEmailCount = 0;

    const dbExecutor = {
        async executeCommand(command: {
            option: string;
            table?: string;
            where?: Array<{ column: string; value?: unknown }>;
        }) {
            if (
                command.option === "UPDATE" &&
                command.table === "registration_tokens" &&
                command.where?.some(
                    (clause) => clause.column === "invitee_email",
                )
            ) {
                const emailClause = command.where.find(
                    (clause) => clause.column === "invitee_email",
                );
                revokedEmails.push(String(emailClause?.value ?? ""));
                return { rows: [], rowCount: 1 };
            }
            if (
                command.option === "INSERT" &&
                command.table === "registration_tokens"
            ) {
                insertedTokenCount++;
            }
            return { rows: [] };
        },
        async ensureTable() {},
        async transaction<T>(
            callback: (executor: typeof dbExecutor) => Promise<T>,
        ) {
            return callback(dbExecutor);
        },
    };

    const adapter = createAdapter({
        dbExecutor: dbExecutor as any,
        accountStore: {} as any,
        canSendInviteEmail: () => true,
        sendInviteEmail: async () => {
            sentEmailCount++;
        },
        isEmailRegistered: async () => false,
        upsertVerifiedPrimaryEmail: async () => {},
    });

    const inviteAdapter = adapter.invite;
    assert.ok(inviteAdapter);

    await inviteAdapter!.issueInvite({
        inviterAccountId: "inviter-1",
        inviterDisplayName: "Inviter One",
        inviteeEmail: "recipient@example.com",
        inviterIsFounder: false,
        inviteBaseUrl: "https://example.com",
    });

    await inviteAdapter!.issueInvite({
        inviterAccountId: "inviter-1",
        inviterDisplayName: "Inviter One",
        inviteeEmail: "recipient@example.com",
        inviterIsFounder: false,
        inviteBaseUrl: "https://example.com",
    });

    assert.equal(
        revokedEmails.length,
        2,
        "prior pending tokens should be revoked on each new invite issuance",
    );
    assert.ok(
        revokedEmails.every((email) => email === "recipient@example.com"),
        "revocation should target the invitee email",
    );
    assert.equal(insertedTokenCount, 2, "two tokens should have been inserted");
    assert.equal(sentEmailCount, 2, "two invite emails should have been sent");
});

test("failed replacement delivery preserves prior pending tokens", async () => {
    let revoked = false;
    let deletedReplacement = false;
    const adapter = createAdapter({
        dbExecutor: {
            ensureTable: async () => {},
            executeCommand: async (command: {
                option: string;
                table?: string;
                where?: Array<{ column: string }>;
            }) => {
                if (command.option === "DELETE") deletedReplacement = true;
                if (
                    command.option === "UPDATE" &&
                    command.where?.some(
                        (clause) => clause.column === "invitee_email",
                    )
                ) {
                    revoked = true;
                }
                return { rows: [], rowCount: 1 };
            },
        } as any,
        accountStore: {} as any,
        canSendInviteEmail: () => true,
        sendInviteEmail: async () => {
            throw new Error("smtp_delivery_failed");
        },
        isEmailRegistered: async () => false,
        upsertVerifiedPrimaryEmail: async () => {},
    });

    await assert.rejects(
        () =>
            adapter.invite!.issueInvite({
                inviterAccountId: "inviter-1",
                inviterDisplayName: "Inviter One",
                inviteeEmail: "recipient@example.com",
                inviterIsFounder: false,
                inviteBaseUrl: "https://example.com",
            }),
        /smtp_delivery_failed/,
    );
    assert.equal(deletedReplacement, true);
    assert.equal(revoked, false);
});

test("external account token consumption records one-time redemption", async () => {
    let redemptionSet: Record<string, unknown> | undefined;
    let verifiedEmail: { accountId: string; email: string } | undefined;
    const adapter = createAdapter({
        dbExecutor: {
            ensureTable: async () => {},
            executeCommand: async (command: {
                option: string;
                set?: Record<string, unknown>;
            }) => {
                if (command.option === "UPDATE") redemptionSet = command.set;
                return { rows: [], rowCount: 1 };
            },
        } as any,
        accountStore: {} as any,
        canSendInviteEmail: () => true,
        sendInviteEmail: async () => {},
        isEmailRegistered: async () => false,
        upsertVerifiedPrimaryEmail: async (accountId, email) => {
            verifiedEmail = { accountId, email };
        },
    });

    assert.equal(
        await adapter.invite?.consumeExternalAccountToken({
            token: "token-id.token-secret",
            accountId: "external-user",
            email: "Person@Example.com",
        }),
        true,
    );
    assert.equal(redemptionSet?.redeemed_account_id, "external-user");
    assert.equal(typeof redemptionSet?.redeemed_at, "string");
    assert.deepEqual(verifiedEmail, {
        accountId: "external-user",
        email: "person@example.com",
    });
});

test("concurrent external token consumption shares one account authorization", async () => {
    let updateCalls = 0;
    let emailCalls = 0;
    let releaseEmail!: () => void;
    const emailPending = new Promise<void>((resolve) => {
        releaseEmail = resolve;
    });
    const adapter = createAdapter({
        dbExecutor: {
            ensureTable: async () => {},
            executeCommand: async (command: { option: string }) => {
                if (command.option === "UPDATE") updateCalls += 1;
                return { rows: [], rowCount: 1 };
            },
        } as any,
        accountStore: {} as any,
        canSendInviteEmail: () => true,
        sendInviteEmail: async () => {},
        isEmailRegistered: async () => false,
        upsertVerifiedPrimaryEmail: async () => {
            emailCalls += 1;
            await emailPending;
        },
    });
    const input = {
        token: "token-id.token-secret",
        accountId: "external-user",
        email: "person@example.com",
    };

    const first = adapter.invite!.consumeExternalAccountToken(input);
    const second = adapter.invite!.consumeExternalAccountToken(input);
    releaseEmail();

    assert.deepEqual(await Promise.all([first, second]), [true, true]);
    assert.equal(updateCalls, 1);
    assert.equal(emailCalls, 1);
});

test("concurrent token consumption does not authorize a different account", async () => {
    let redeemedAccountId = "";
    let releaseEmail!: () => void;
    const emailPending = new Promise<void>((resolve) => {
        releaseEmail = resolve;
    });
    const adapter = createAdapter({
        dbExecutor: {
            ensureTable: async () => {},
            executeCommand: async (command: {
                option: string;
                set?: Record<string, unknown>;
            }) => {
                if (command.option === "UPDATE" && !redeemedAccountId) {
                    redeemedAccountId = String(
                        command.set?.redeemed_account_id ?? "",
                    );
                    return { rows: [], rowCount: 1 };
                }
                if (command.option === "SELECT") {
                    return {
                        rows: [{ redeemed_account_id: redeemedAccountId }],
                        rowCount: 1,
                    };
                }
                return { rows: [], rowCount: 0 };
            },
        } as any,
        accountStore: {} as any,
        canSendInviteEmail: () => true,
        sendInviteEmail: async () => {},
        isEmailRegistered: async () => false,
        upsertVerifiedPrimaryEmail: async () => emailPending,
    });
    const commonInput = {
        token: "token-id.token-secret",
        email: "person@example.com",
    };

    const winning = adapter.invite!.consumeExternalAccountToken({
        ...commonInput,
        accountId: "winning-account",
    });
    const losing = adapter.invite!.consumeExternalAccountToken({
        ...commonInput,
        accountId: "losing-account",
    });
    assert.equal(await losing, false);
    releaseEmail();
    assert.equal(await winning, true);
});

test("external token consumption is restored when canonical email persistence fails", async () => {
    const updates: Array<Record<string, unknown> | undefined> = [];
    const adapter = createAdapter({
        dbExecutor: {
            ensureTable: async () => {},
            executeCommand: async (command: {
                option: string;
                set?: Record<string, unknown>;
            }) => {
                if (command.option === "UPDATE") updates.push(command.set);
                return { rows: [], rowCount: 1 };
            },
        } as any,
        accountStore: {} as any,
        canSendInviteEmail: () => true,
        sendInviteEmail: async () => {},
        isEmailRegistered: async () => false,
        upsertVerifiedPrimaryEmail: async () => {
            throw new Error("email_persistence_failed");
        },
    });

    await assert.rejects(
        () =>
            adapter.invite!.consumeExternalAccountToken({
                token: "token-id.token-secret",
                accountId: "external-user",
                email: "person@example.com",
            }),
        /email_persistence_failed/,
    );
    assert.equal(typeof updates[0]?.redeemed_at, "string");
    assert.deepEqual(updates[1], {
        redeemed_at: null,
        redeemed_account_id: null,
    });
});

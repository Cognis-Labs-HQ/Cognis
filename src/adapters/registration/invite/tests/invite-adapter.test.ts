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
            return { username, isAdmin: false, enabled: true };
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

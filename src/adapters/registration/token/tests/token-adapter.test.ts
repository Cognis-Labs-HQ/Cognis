import test from "node:test";
import assert from "node:assert/strict";
import { createAdapter } from "../index.js";

test("redeemInvite deletes created account when token cannot be marked redeemed", async () => {
    let deletedAccountId = "";
    const dbExecutor = {
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
        dbType: "memory",
        accountStore: accountStore as any,
        canSendInviteEmail: () => true,
        sendInviteEmail: async () => {},
        isEmailRegistered: async () => false,
        upsertVerifiedPrimaryEmail: async () => {},
    });

    await assert.rejects(
        () =>
            adapter.redeemInvite({
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

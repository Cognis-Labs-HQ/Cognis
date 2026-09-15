import assert from "node:assert/strict";
import test from "node:test";

import { authorizeAccountCreation } from "../bootstrap/account-creation-gate.js";

function createGateway({ publicEnabled = false, inviteEmail = "" } = {}) {
    const consumed: Array<{
        token: string;
        accountId: string;
    }> = [];
    return {
        consumed,
        gateway: {
            isPublicEnabled: () => publicEnabled,
            resolveInvite: async () =>
                inviteEmail
                    ? {
                          id: "token-id",
                          inviterAccountId: "inviter",
                          inviterDisplayName: "Inviter",
                          inviteeEmail: inviteEmail,
                          expiresAt: "2099-01-01T00:00:00.000Z",
                      }
                    : null,
            consumeExternalAccountToken: async (input: {
                token: string;
                accountId: string;
            }) => {
                consumed.push(input);
                return true;
            },
        },
    };
}

test("public registration authorizes external account creation", async () => {
    const { gateway } = createGateway({ publicEnabled: true });
    assert.deepEqual(await authorizeAccountCreation(gateway, true, {}), {
        authorized: true,
        source: "public",
    });
});

test("closed registration requests a missing SSO email", async () => {
    const { gateway } = createGateway();
    assert.deepEqual(
        await authorizeAccountCreation(gateway, true, {
            accountId: "external-user",
        }),
        {
            authorized: false,
            emailRequired: true,
            reason: "registration_token_required",
        },
    );
});

test("matching registration tokens are consumed for SSO accounts", async () => {
    const { gateway, consumed } = createGateway({
        inviteEmail: "person@example.com",
    });
    assert.deepEqual(
        await authorizeAccountCreation(gateway, true, {
            accountId: "external-user",
            email: "Person@Example.com",
            registrationToken: "registration-token",
        }),
        {
            authorized: true,
            emailRequired: false,
            source: "registrationToken",
        },
    );
    assert.deepEqual(consumed, [
        {
            token: "registration-token",
            accountId: "external-user",
        },
    ]);
});

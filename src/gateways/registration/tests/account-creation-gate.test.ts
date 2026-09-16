import assert from "node:assert/strict";
import test from "node:test";

import { authorizeAccountCreation } from "../bootstrap/account-creation-gate.js";

function createGateway({ publicEnabled = false, inviteEmail = "" } = {}) {
    const consumed: Array<{
        token: string;
        accountId: string;
        email: string;
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
                email: string;
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

test("matching registration tokens are consumed after SSO account persistence", async () => {
    const { gateway, consumed } = createGateway({
        inviteEmail: "person@example.com",
    });
    const result = await authorizeAccountCreation(gateway, true, {
        accountId: "external-user",
        email: "Person@Example.com",
        registrationToken: "registration-token",
    });
    assert.equal(result.authorized, true);
    assert.equal(result.emailRequired, false);
    assert.equal(result.source, "registrationToken");
    assert.deepEqual(consumed, []);
    assert.equal(await result.commit?.(), true);
    assert.deepEqual(consumed, [
        {
            token: "registration-token",
            accountId: "external-user",
            email: "person@example.com",
        },
    ]);
});

test("malformed registration tokens deny account creation", async () => {
    const { gateway } = createGateway();
    gateway.resolveInvite = async () => {
        throw new Error("invalid_token");
    };
    assert.deepEqual(
        await authorizeAccountCreation(gateway, true, {
            accountId: "external-user",
            email: "person@example.com",
            registrationToken: "malformed",
        }),
        {
            authorized: false,
            emailRequired: false,
            reason: "registration_token_invalid",
        },
    );
});

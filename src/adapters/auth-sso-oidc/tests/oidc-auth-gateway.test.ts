import test from "node:test";
import assert from "node:assert/strict";
import type { AuthAccountStore, ExternalIdentity } from "@cognis/core";
import { OidcAuthGateway } from "../oidc-auth-gateway.js";

function createStore(created: ExternalIdentity[]): AuthAccountStore {
    return {
        async findByExternalIdentity() {
            return null;
        },
        async createExternalAccount(identity) {
            created.push(identity);
            return {
                id: "acct-oidc",
                email: identity.email,
                isAdmin: identity.isAdmin,
            };
        },
        async updateExternalAccount(accountId, identity) {
            created.push(identity);
            return {
                id: accountId,
                email: identity.email,
                isAdmin: identity.isAdmin,
            };
        },
        async createLocalAccount() {
            throw new Error("not supported");
        },
    };
}

test("oidc adapter provisions accounts for third-party sso users", async () => {
    const created: ExternalIdentity[] = [];
    const gateway = new OidcAuthGateway({
        providerName: "google-sso",
        adminRoles: ["platform-admin"],
        accountStore: createStore(created),
        client: {
            introspect: async () => ({
                sub: "google-123",
                name: "Example Staff",
                email: "staff@example.com",
                roles: ["platform-admin"],
            }),
        },
    });

    const context = await gateway.authenticate("jwt");

    assert.deepEqual(context, {
        accountId: "acct-oidc",
        provider: "google-sso",
        externalUserId: "google-123",
        email: "staff@example.com",
        isAdmin: true,
    });
    assert.equal(created.length, 1);
    assert.equal(created[0]?.provider, "google-sso");
    assert.equal(created[0]?.externalUserId, "google-123");
});

test("oidc adapter returns null when token is invalid", async () => {
    const gateway = new OidcAuthGateway({
        accountStore: createStore([]),
        client: {
            introspect: async () => null,
        },
    });

    const context = await gateway.authenticate("invalid");

    assert.equal(context, null);
});

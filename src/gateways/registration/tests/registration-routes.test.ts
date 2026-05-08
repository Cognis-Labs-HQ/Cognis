import test from "node:test";
import assert from "node:assert/strict";
import { issueAccessToken } from "../../../api/auth/access-tokens.js";
import { createRegistrationRoutes } from "../bootstrap.js";

function makeResponse() {
    let status = 0;
    let payload = "";
    return {
        writeHead(code: number) {
            status = code;
        },
        end(data: string) {
            payload = data;
        },
        get status() {
            return status;
        },
        get payload() {
            return payload;
        },
    } as any;
}

const founderToken = issueAccessToken("founder-user", "user", 60);
const adminToken = issueAccessToken("admin-user", "admin", 60);

const accountStore = {
    async register(username: string) {
        return { username, isAdmin: false, enabled: true };
    },
    async verify() {
        return null;
    },
    async has() {
        return false;
    },
    async list() {
        return [];
    },
    async setRole() {},
    async setPassword() {},
    async setEnabled() {},
    async delete() {},
    async getInfo() {
        return null;
    },
    async updateLastLogin() {},
    async setFounder() {},
    async isFounder(username: string) {
        return username === "founder-user";
    },
    async exists() {
        return true;
    },
    async getDisplayName(username: string) {
        return username;
    },
} as any;

test("founder can list only their pending registration tokens", async () => {
    let inviterFilter = "";
    const route = createRegistrationRoutes(
        {
            isInviteEnabled() {
                return true;
            },
            async listInvites(filter?: { inviterAccountId?: string }) {
                inviterFilter = filter?.inviterAccountId ?? "";
                return [];
            },
            async issueInvite() {
                return { tokenId: "t", inviteUrl: "u", expiresAt: "x" };
            },
            async revokeInvite() {
                return true;
            },
            async resolveInvite() {
                return null;
            },
            async redeemInvite() {
                return { createdAccountId: "x", inviterAccountId: "y" };
            },
        } as any,
        accountStore,
    );

    const res = makeResponse();
    const handled = await route(
        {
            method: "GET",
            headers: { authorization: `Bearer ${founderToken}` },
        } as any,
        res,
        new URL("http://localhost/api/v1/registration/tokens"),
    );
    assert.equal(handled, true);
    assert.equal(res.status, 200);
    assert.equal(inviterFilter, "founder-user");
});

test("admin can list all pending registration tokens", async () => {
    let didUseUnfilteredList = false;
    const route = createRegistrationRoutes(
        {
            isInviteEnabled() {
                return true;
            },
            async listInvites(filter?: { inviterAccountId?: string }) {
                didUseUnfilteredList = !filter?.inviterAccountId;
                return [];
            },
            async issueInvite() {
                return { tokenId: "t", inviteUrl: "u", expiresAt: "x" };
            },
            async revokeInvite() {
                return true;
            },
            async resolveInvite() {
                return null;
            },
            async redeemInvite() {
                return { createdAccountId: "x", inviterAccountId: "y" };
            },
        } as any,
        accountStore,
    );

    const res = makeResponse();
    const handled = await route(
        {
            method: "GET",
            headers: { authorization: `Bearer ${adminToken}` },
        } as any,
        res,
        new URL("http://localhost/api/v1/registration/tokens"),
    );
    assert.equal(handled, true);
    assert.equal(res.status, 200);
    assert.equal(didUseUnfilteredList, true);
});

test("invite endpoint returns inviter details for valid token", async () => {
    const route = createRegistrationRoutes(
        {
            isInviteEnabled() {
                return true;
            },
            async listInvites() {
                return [];
            },
            async issueInvite() {
                return { tokenId: "t", inviteUrl: "u", expiresAt: "x" };
            },
            async revokeInvite() {
                return true;
            },
            async resolveInvite() {
                return {
                    id: "token-1",
                    inviterAccountId: "founder-user",
                    inviterDisplayName: "Founder Name",
                    inviteeEmail: "invitee@example.com",
                    expiresAt: new Date(Date.now() + 1000).toISOString(),
                };
            },
            async redeemInvite() {
                return { createdAccountId: "x", inviterAccountId: "y" };
            },
        } as any,
        accountStore,
    );

    const res = makeResponse();
    const handled = await route(
        { method: "GET", headers: {} } as any,
        res,
        new URL("http://localhost/api/v1/registration/invite?token=a.b"),
    );
    assert.equal(handled, true);
    assert.equal(res.status, 200);
    assert.match(res.payload, /Founder Name/);
});

test("invite endpoint returns invite_disabled when invite adapter is disabled", async () => {
    const route = createRegistrationRoutes(
        {
            isInviteEnabled() {
                return false;
            },
        } as any,
        accountStore,
    );

    const res = makeResponse();
    const handled = await route(
        { method: "GET", headers: {} } as any,
        res,
        new URL("http://localhost/api/v1/registration/invite?token=a.b"),
    );
    assert.equal(handled, true);
    assert.equal(res.status, 409);
    assert.match(res.payload, /invite_disabled/);
});

test("issue invite returns 409 when email is already registered", async () => {
    const route = createRegistrationRoutes(
        {
            isInviteEnabled() {
                return true;
            },
            async listInvites() {
                return [];
            },
            async issueInvite() {
                throw new Error("email_taken");
            },
            async revokeInvite() {
                return true;
            },
            async resolveInvite() {
                return null;
            },
            async redeemInvite() {
                return { createdAccountId: "x", inviterAccountId: "y" };
            },
        } as any,
        accountStore,
    );

    const res = makeResponse();
    const handled = await route(
        {
            method: "POST",
            headers: { authorization: `Bearer ${adminToken}` },
            [Symbol.asyncIterator]: async function* () {
                yield Buffer.from('{"email":"taken@example.com"}');
            },
        } as any,
        res,
        new URL("http://localhost/api/v1/registration/tokens"),
    );

    assert.equal(handled, true);
    assert.equal(res.status, 409);
    assert.match(res.payload, /email_taken/);
});

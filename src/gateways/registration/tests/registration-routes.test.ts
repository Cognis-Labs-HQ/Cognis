import test from "node:test";
import assert from "node:assert/strict";
import { issueAccessToken } from "../../auth/access-tokens.js";
import {
    createRegistrationRoutes,
    createRegistrationPageRoutes,
} from "../bootstrap.js";

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

test("registration state exposes founder-safe gateway status", async () => {
    const route = createRegistrationRoutes(
        {
            isInviteEnabled() {
                return true;
            },
            isPublicEnabled() {
                return false;
            },
        } as any,
        accountStore,
        async () => [],
        () => false,
    );

    const res = makeResponse();
    const handled = await route(
        {
            method: "GET",
            headers: { authorization: `Bearer ${founderToken}` },
        } as any,
        res,
        new URL("http://localhost/api/v1/registration/state"),
    );

    assert.equal(handled, true);
    assert.equal(res.status, 200);
    assert.match(res.payload, /"gatewayEnabled":false/);
    assert.match(res.payload, /"inviteEnabled":true/);
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

test("registration requests can be submitted without auth when request adapter is enabled", async () => {
    let submitCalled = false;
    const route = createRegistrationRoutes(
        {
            isInviteEnabled() {
                return false;
            },
            isRequestEnabled() {
                return true;
            },
            async submitRequest() {
                submitCalled = true;
                return {
                    id: "req-1",
                    provider: "line",
                    externalUserId: "U-request",
                    requestedAccountId: "line:U-request",
                    requestedDisplayName: "Request User",
                    status: "pending",
                    createdAt: new Date().toISOString(),
                };
            },
        } as any,
        accountStore,
    );

    const res = makeResponse();
    const handled = await route(
        {
            method: "POST",
            headers: {},
            [Symbol.asyncIterator]: async function* () {
                yield Buffer.from(
                    JSON.stringify({
                        provider: "line",
                        externalUserId: "U-request",
                        requestedAccountId: "line:U-request",
                        requestedDisplayName: "Request User",
                    }),
                );
            },
        } as any,
        res,
        new URL("http://localhost/api/v1/registration/requests"),
    );

    assert.equal(handled, true);
    assert.equal(res.status, 201);
    assert.equal(submitCalled, true);
    assert.match(res.payload, /req-1/);
});

test("registration requests listing requires admin auth", async () => {
    const route = createRegistrationRoutes(
        {
            isInviteEnabled() {
                return false;
            },
            isRequestEnabled() {
                return true;
            },
            async listRequests() {
                return [];
            },
        } as any,
        accountStore,
    );

    const res = makeResponse();
    const handled = await route(
        { method: "GET", headers: {} } as any,
        res,
        new URL("http://localhost/api/v1/registration/requests"),
    );

    assert.equal(handled, true);
    assert.equal(res.status, 401);
});

test("admin can review registration request status", async () => {
    const route = createRegistrationRoutes(
        {
            isInviteEnabled() {
                return false;
            },
            isRequestEnabled() {
                return true;
            },
            async reviewRequest() {
                return {
                    id: "req-2",
                    provider: "line",
                    externalUserId: "U2",
                    requestedAccountId: "line:U2",
                    requestedDisplayName: "User Two",
                    status: "approved",
                    createdAt: new Date().toISOString(),
                    reviewedAt: new Date().toISOString(),
                    reviewedByAccountId: "admin-user",
                };
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
                yield Buffer.from('{"status":"approved"}');
            },
        } as any,
        res,
        new URL("http://localhost/api/v1/registration/requests/req-2/review"),
    );

    assert.equal(handled, true);
    assert.equal(res.status, 200);
    assert.match(res.payload, /approved/);
});

test("GET /register does not redirect authenticated users to dashboard", async () => {
    const route = createRegistrationPageRoutes();
    const token = issueAccessToken("reg-authed-user", "user", 60);
    let status = 0;
    let location = "";

    const handled = await route(
        {
            method: "GET",
            headers: { cookie: `cognis_access_token=${token}` },
        } as any,
        {
            writeHead(code: number, headers: Record<string, string>) {
                status = code;
                location = headers?.location ?? "";
            },
            end() {},
        } as any,
        new URL("http://localhost/register"),
    );

    assert.equal(handled, true);
    assert.notEqual(status, 302);
    assert.notEqual(location, "/dashboard");
});

test("GET /register serves the registration page to unauthenticated visitors", async () => {
    const route = createRegistrationPageRoutes();
    let status = 0;

    const handled = await route(
        { method: "GET", headers: {} } as any,
        {
            writeHead(code: number) {
                status = code;
            },
            end() {},
        } as any,
        new URL("http://localhost/register"),
    );

    assert.equal(handled, true);
    assert.notEqual(
        status,
        302,
        "unauthenticated user should not be redirected",
    );
});

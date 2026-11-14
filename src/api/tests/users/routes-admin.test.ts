import test from "node:test";
import assert from "node:assert/strict";
import { createUserRoutes } from "../../routes/users/index.js";
import { VolatileUserPreferenceStore } from "../../reuse/preference-store.js";
import { TestAccountStore as VolatileLocalAccountStore } from "./reuse/accounts.js";
import {
    makeRouteContext,
    createProfileLifecycleTracker,
} from "./reuse/context.js";
import { issueAccessToken, verifyAccessToken } from "./reuse/sessions.js";

const adminToken = issueAccessToken("admin", "admin", 60);
const ownerToken = issueAccessToken("owner", "owner", 60);
const headers = { authorization: `Bearer ${adminToken}` };
const ownerHeaders = { authorization: `Bearer ${ownerToken}` };

test("admins cannot manage admin or owner accounts while owner can manage others", async () => {
    const accounts = new VolatileLocalAccountStore();
    await accounts.register("admin", "pw", "admin");
    await accounts.register("owner", "pw", "admin");
    await accounts.setFounder("owner", true);
    await accounts.register("alice", "pw", "admin");
    await accounts.register("bob", "pw", "admin");
    await accounts.register("carol", "pw", "admin");
    await accounts.register("founder", "pw", "admin");
    await accounts.setFounder("founder", true);
    const prefs = new VolatileUserPreferenceStore();
    const lifecycle = createProfileLifecycleTracker();
    const route = createUserRoutes(
        accounts,
        prefs,
        undefined,
        undefined,
        undefined,
        undefined,
        await makeRouteContext(accounts, {
            decisions: {
                "admin/alice": {
                    allowed: false,
                    status: 403,
                    code: "protected_admin_account",
                },
                "admin/bob": {
                    allowed: false,
                    status: 403,
                    code: "protected_admin_account",
                },
                "admin/carol": {
                    allowed: false,
                    status: 403,
                    code: "protected_admin_account",
                },
                "admin/founder": {
                    allowed: false,
                    status: 403,
                    code: "protected_admin_account",
                },
                "owner/owner": {
                    allowed: false,
                    status: 403,
                    code: "protected_self_account",
                },
            },
        }),
        lifecycle.get,
        lifecycle.set,
    );
    let status = 0;

    await route(
        {
            method: "POST",
            headers,
            [Symbol.asyncIterator]: async function* () {
                yield Buffer.from('{"role":"user"}');
            },
        } as any,
        {
            writeHead(c: number) {
                status = c;
            },
            end() {},
        } as any,
        new URL("http://localhost/api/v1/users/alice/role"),
    );
    assert.equal(status, 403);
    assert.equal((await accounts.getInfo("alice"))?.role, "admin");

    await route(
        { method: "POST", headers } as any,
        {
            writeHead(c: number) {
                status = c;
            },
            end() {},
        } as any,
        new URL("http://localhost/api/v1/users/bob/disable"),
    );
    assert.equal(status, 403);
    assert.equal((await accounts.getInfo("bob"))?.enabled, true);

    await route(
        { method: "DELETE", headers } as any,
        {
            writeHead(c: number) {
                status = c;
            },
            end() {},
        } as any,
        new URL("http://localhost/api/v1/users/carol"),
    );
    assert.equal(status, 403);
    assert.equal(await accounts.has("carol"), true);

    await route(
        {
            method: "POST",
            headers,
            [Symbol.asyncIterator]: async function* () {
                yield Buffer.from('{"role":"user"}');
            },
        } as any,
        {
            writeHead(c: number) {
                status = c;
            },
            end() {},
        } as any,
        new URL("http://localhost/api/v1/users/founder/role"),
    );
    assert.equal(status, 403);

    await route(
        {
            method: "POST",
            headers: ownerHeaders,
            [Symbol.asyncIterator]: async function* () {
                yield Buffer.from('{"role":"user"}');
            },
        } as any,
        {
            writeHead(c: number) {
                status = c;
            },
            end() {},
        } as any,
        new URL("http://localhost/api/v1/users/alice/role"),
    );
    assert.equal(status, 200);
    assert.equal((await accounts.getInfo("alice"))?.role, "user");

    await route(
        { method: "POST", headers: ownerHeaders } as any,
        {
            writeHead(c: number) {
                status = c;
            },
            end() {},
        } as any,
        new URL("http://localhost/api/v1/users/bob/disable"),
    );
    assert.equal(status, 200);
    assert.equal((await accounts.getInfo("bob"))?.enabled, true);
    assert.equal(await lifecycle.get("bob"), "archived");

    await route(
        { method: "DELETE", headers: ownerHeaders } as any,
        {
            writeHead(c: number) {
                status = c;
            },
            end() {},
        } as any,
        new URL("http://localhost/api/v1/users/carol"),
    );
    assert.equal(status, 200);
    assert.equal(await accounts.has("carol"), false);

    await route(
        {
            method: "POST",
            headers: ownerHeaders,
            [Symbol.asyncIterator]: async function* () {
                yield Buffer.from('{"role":"user"}');
            },
        } as any,
        {
            writeHead(c: number) {
                status = c;
            },
            end() {},
        } as any,
        new URL("http://localhost/api/v1/users/owner/role"),
    );
    assert.equal(status, 403);
    assert.equal((await accounts.getInfo("owner"))?.role, "admin");

    await route(
        { method: "POST", headers: ownerHeaders } as any,
        {
            writeHead(c: number) {
                status = c;
            },
            end() {},
        } as any,
        new URL("http://localhost/api/v1/users/owner/disable"),
    );
    assert.equal(status, 403);
    assert.equal((await accounts.getInfo("owner"))?.enabled, true);

    await route(
        { method: "DELETE", headers: ownerHeaders } as any,
        {
            writeHead(c: number) {
                status = c;
            },
            end() {},
        } as any,
        new URL("http://localhost/api/v1/users/owner"),
    );
    assert.equal(status, 403);
    assert.equal(await accounts.has("owner"), true);
});

test("role changes invalidate target access tokens immediately", async () => {
    const accounts = new VolatileLocalAccountStore();
    await accounts.register("admin", "pw", "admin");
    await accounts.register("alice", "pw", "admin");
    const prefs = new VolatileUserPreferenceStore();
    const route = createUserRoutes(
        accounts,
        prefs,
        undefined,
        undefined,
        undefined,
        undefined,
        await makeRouteContext(accounts),
    );
    let status = 0;
    const aliceToken = issueAccessToken("alice", "admin", 60);
    const aliceHeaders = { authorization: `Bearer ${aliceToken}` };

    assert.equal(verifyAccessToken(aliceToken)?.role, "admin");

    await route(
        {
            method: "POST",
            headers: ownerHeaders,
            [Symbol.asyncIterator]: async function* () {
                yield Buffer.from('{"role":"user"}');
            },
        } as any,
        {
            writeHead(c: number) {
                status = c;
            },
            end() {},
        } as any,
        new URL("http://localhost/api/v1/users/alice/role"),
    );

    assert.equal(status, 200);
    assert.equal(verifyAccessToken(aliceToken), null);

    await route(
        { method: "GET", headers: aliceHeaders } as any,
        {
            writeHead(c: number) {
                status = c;
            },
            end() {},
        } as any,
        new URL("http://localhost/api/v1/users"),
    );
    assert.equal(status, 401);
});

test("users list reports founder admins as owner role", async () => {
    const accounts = new VolatileLocalAccountStore();
    await accounts.register("admin", "pw", "admin");
    await accounts.setFounder("admin", true);
    const prefs = new VolatileUserPreferenceStore();
    const route = createUserRoutes(
        accounts,
        prefs,
        undefined,
        undefined,
        undefined,
        undefined,
        await makeRouteContext(accounts),
    );
    let status = 0;
    let body = "";

    await route(
        { method: "GET", headers } as any,
        {
            writeHead(code: number) {
                status = code;
            },
            end(payload: string) {
                body = payload;
            },
        } as any,
        new URL("http://localhost/api/v1/users"),
    );

    assert.equal(status, 200);
    const payload = JSON.parse(body);
    assert.equal(payload.data[0].role, "owner");
    assert.equal("isAdmin" in payload.data[0], false);
});

test("teacher role change normalizes hidden/private visibility to friends", async () => {
    const accounts = new VolatileLocalAccountStore();
    await accounts.register("admin", "pw", "admin");
    await accounts.register("alice", "pw", "user");
    const prefs = new VolatileUserPreferenceStore();
    let status = 0;
    const appliedVisibilityUpdates: string[] = [];
    const route = createUserRoutes(
        accounts,
        prefs,
        undefined,
        undefined,
        async () => "hidden",
        async (_accountId, visibility) => {
            appliedVisibilityUpdates.push(visibility);
        },
        await makeRouteContext(accounts),
    );

    await route(
        {
            method: "POST",
            headers,
            [Symbol.asyncIterator]: async function* () {
                yield Buffer.from('{"role":"teacher"}');
            },
        } as any,
        {
            writeHead(code: number) {
                status = code;
            },
            end() {},
        } as any,
        new URL("http://localhost/api/v1/users/alice/role"),
    );

    assert.equal(status, 200);
    assert.deepEqual(appliedVisibilityUpdates, ["friends"]);
});

test("teacher role change sets profile visibility to friends", async () => {
    const accounts = new VolatileLocalAccountStore();
    await accounts.register("admin", "pw", "admin");
    await accounts.register("alice", "pw", "user");
    const prefs = new VolatileUserPreferenceStore();
    let status = 0;
    const appliedVisibilityUpdates: string[] = [];
    const route = createUserRoutes(
        accounts,
        prefs,
        undefined,
        undefined,
        async () => "community",
        async (_accountId, visibility) => {
            appliedVisibilityUpdates.push(visibility);
        },
        await makeRouteContext(accounts),
    );

    await route(
        {
            method: "POST",
            headers,
            [Symbol.asyncIterator]: async function* () {
                yield Buffer.from('{"role":"teacher"}');
            },
        } as any,
        {
            writeHead(code: number) {
                status = code;
            },
            end() {},
        } as any,
        new URL("http://localhost/api/v1/users/alice/role"),
    );

    assert.equal(status, 200);
    assert.deepEqual(appliedVisibilityUpdates, ["friends"]);
});

test("admin role change sets profile visibility to friends", async () => {
    const accounts = new VolatileLocalAccountStore();
    await accounts.register("admin", "pw", "admin");
    await accounts.register("alice", "pw", "user");
    const prefs = new VolatileUserPreferenceStore();
    let status = 0;
    const appliedVisibilityUpdates: string[] = [];
    const route = createUserRoutes(
        accounts,
        prefs,
        undefined,
        undefined,
        async () => "hidden",
        async (_accountId, visibility) => {
            appliedVisibilityUpdates.push(visibility);
        },
        await makeRouteContext(accounts),
    );

    await route(
        {
            method: "POST",
            headers,
            [Symbol.asyncIterator]: async function* () {
                yield Buffer.from('{"role":"admin"}');
            },
        } as any,
        {
            writeHead(code: number) {
                status = code;
            },
            end() {},
        } as any,
        new URL("http://localhost/api/v1/users/alice/role"),
    );

    assert.equal(status, 200);
    assert.deepEqual(appliedVisibilityUpdates, ["friends"]);
});

test("users list includes hasTfaConfigured when tfa capability is present", async () => {
    const accounts = new VolatileLocalAccountStore();
    await accounts.register("admin", "pw", "admin");
    await accounts.register("alice", "pw", "user");
    await accounts.register("bob", "pw", "user");
    const prefs = new VolatileUserPreferenceStore();
    let status = 0;
    let body = "";
    const route = createUserRoutes(
        accounts,
        prefs,
        undefined,
        undefined,
        undefined,
        undefined,
        Object.assign(await makeRouteContext(accounts), {
            getCapability: <T>(capabilityId: string): T | undefined => {
                if (capabilityId !== "tfa:isSecondFactorEnabled") {
                    return undefined;
                }
                return (async (accountId: string) =>
                    accountId === "alice") as T;
            },
        }),
    );

    await route(
        { method: "GET", headers } as any,
        {
            writeHead(code: number) {
                status = code;
            },
            end(payload: string) {
                body = payload;
            },
        } as any,
        new URL("http://localhost/api/v1/users"),
    );

    assert.equal(status, 200);
    const payload = JSON.parse(body);
    const alice = payload.data.find(
        (entry: { username: string }) => entry.username === "alice",
    );
    const bob = payload.data.find(
        (entry: { username: string }) => entry.username === "bob",
    );
    assert.equal(alice.hasTfaConfigured, true);
    assert.equal(bob.hasTfaConfigured, false);
});

test("users list includes provisioned LDAP accounts and identifies their provider", async () => {
    const accounts = new VolatileLocalAccountStore();
    await accounts.register("admin", "pw", "admin");
    await accounts.ensureExternalAccount({
        accountId: "ldap-user",
        provider: "ldap",
        externalUserId: "uid=ldap-user,dc=example,dc=org",
    });
    let body = "";
    const route = createUserRoutes(
        accounts,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        await makeRouteContext(accounts),
    );

    await route(
        { method: "GET", headers } as any,
        {
            writeHead() {},
            end(payload: string) {
                body = payload;
            },
        } as any,
        new URL("http://localhost/api/v1/users"),
    );

    const ldapUser = JSON.parse(body).data.find(
        (entry: { username: string }) => entry.username === "ldap-user",
    );
    assert.equal(ldapUser.provider, "ldap");
});

test("admin password changes are rejected for LDAP accounts", async () => {
    const accounts = new VolatileLocalAccountStore();
    await accounts.register("admin", "pw", "admin");
    const ldapAccountId = await accounts.ensureExternalAccount({
        accountId: "ldap-user",
        provider: "ldap",
        externalUserId: "uid=ldap-user,dc=example,dc=org",
    });
    let status = 0;
    let body = "";
    const route = createUserRoutes(
        accounts,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        await makeRouteContext(accounts),
    );

    await route(
        {
            method: "POST",
            headers,
            [Symbol.asyncIterator]: async function* () {
                yield Buffer.from('{"password":"new-password"}');
            },
        } as any,
        {
            writeHead(code: number) {
                status = code;
            },
            end(payload: string) {
                body = payload;
            },
        } as any,
        new URL(`http://localhost/api/v1/users/${ldapAccountId}/password`),
    );

    assert.equal(status, 403);
    assert.equal(JSON.parse(body).error.code, "external_password_managed");
});

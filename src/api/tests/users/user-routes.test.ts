import test from "node:test";
import assert from "node:assert/strict";
import { createUserRoutes } from "../../routes/users/index.js";
import { VolatileLocalAccountStore } from "../../reuse/account-store.js";
import { VolatileUserPreferenceStore } from "../../reuse/preference-store.js";
import {
    issueAccessToken,
    verifyAccessToken,
} from "../../../gateways/auth/access-tokens.js";

const adminToken = issueAccessToken("admin", "admin", 60);
const ownerToken = issueAccessToken("owner", "owner", 60);
const headers = { authorization: `Bearer ${adminToken}` };
const ownerHeaders = { authorization: `Bearer ${ownerToken}` };

test("user routes create/list/update lifecycle", async () => {
    const accounts = new VolatileLocalAccountStore();
    await accounts.register("admin", "x", "admin");
    const prefs = new VolatileUserPreferenceStore();
    const route = createUserRoutes(accounts, prefs);
    let body = "";
    let status = 0;

    await route(
        {
            method: "POST",
            headers,
            [Symbol.asyncIterator]: async function* () {
                yield Buffer.from('{"password":"pw","role":"user"}');
            },
        } as any,
        {
            writeHead(c: number) {
                status = c;
            },
            end(p: string) {
                body = p;
            },
        } as any,
        new URL("http://localhost/api/v1/users/alice"),
    );
    assert.equal(status, 201);

    await route(
        { method: "GET", headers } as any,
        {
            writeHead(c: number) {
                status = c;
            },
            end(p: string) {
                body = p;
            },
        } as any,
        new URL("http://localhost/api/v1/users"),
    );
    assert.equal(status, 200);
    assert.match(body, /alice/);

    await route(
        {
            method: "POST",
            headers,
            [Symbol.asyncIterator]: async function* () {
                yield Buffer.from('{"role":"admin"}');
            },
        } as any,
        {
            writeHead(c: number) {
                status = c;
            },
            end(p: string) {
                body = p;
            },
        } as any,
        new URL("http://localhost/api/v1/users/alice/role"),
    );
    assert.equal(status, 200);

    await route(
        { method: "DELETE", headers: ownerHeaders } as any,
        {
            writeHead(c: number) {
                status = c;
            },
            end(p: string) {
                body = p;
            },
        } as any,
        new URL("http://localhost/api/v1/users/alice"),
    );
    assert.equal(status, 200);
});

test("user routes log account disable operations", async () => {
    const accounts = new VolatileLocalAccountStore();
    await accounts.register("admin", "x", "admin");
    await accounts.register("alice", "pw", "user");
    const prefs = new VolatileUserPreferenceStore();
    const entries: Array<{
        level: string;
        message: string;
        meta?: Record<string, unknown>;
    }> = [];
    const route = createUserRoutes(
        accounts,
        prefs,
        undefined,
        (level, message, meta) => {
            entries.push({ level, message, meta });
        },
    );
    let status = 0;

    await route(
        { method: "POST", headers } as any,
        {
            writeHead(c: number) {
                status = c;
            },
            end() {},
        } as any,
        new URL("http://localhost/api/v1/users/alice/disable"),
    );

    assert.equal(status, 200);
    assert.deepEqual(entries, [
        {
            level: "warn",
            message: "Disabled user account.",
            meta: {
                component: "api-users",
                method: "POST",
                path: "/api/v1/users/alice/disable",
                accountId: "admin",
                targetAccountId: "alice",
                revokedTokenCount: 0,
            },
        },
    ]);
});

test("user info endpoint allows self-access and admin access, blocks others", async () => {
    const accounts = new VolatileLocalAccountStore();
    await accounts.register("alice", "pw", "user");
    const prefs = new VolatileUserPreferenceStore();
    const route = createUserRoutes(accounts, prefs);
    let body = "";
    let status = 0;

    const aliceToken = issueAccessToken("alice", "user", 60);
    const aliceHeaders = { authorization: `Bearer ${aliceToken}` };
    const bobToken = issueAccessToken("bob", "user", 60);
    const bobHeaders = { authorization: `Bearer ${bobToken}` };

    await route(
        { method: "GET", headers: aliceHeaders } as any,
        {
            writeHead(c: number) {
                status = c;
            },
            end(p: string) {
                body = p;
            },
        } as any,
        new URL("http://localhost/api/v1/users/alice/info"),
    );
    assert.equal(status, 200);
    assert.match(body, /alice/);

    await route(
        { method: "GET", headers } as any,
        {
            writeHead(c: number) {
                status = c;
            },
            end(p: string) {
                body = p;
            },
        } as any,
        new URL("http://localhost/api/v1/users/alice/info"),
    );
    assert.equal(status, 200);

    await route(
        { method: "GET", headers: bobHeaders } as any,
        {
            writeHead(c: number) {
                status = c;
            },
            end(p: string) {
                body = p;
            },
        } as any,
        new URL("http://localhost/api/v1/users/alice/info"),
    );
    assert.equal(status, 403);

    await route(
        { method: "GET", headers: aliceHeaders } as any,
        {
            writeHead(c: number) {
                status = c;
            },
            end(p: string) {
                body = p;
            },
        } as any,
        new URL("http://localhost/api/v1/users/nonexistent/info"),
    );
    assert.equal(status, 403);
});

test("getInfo endpoint returns lastLogin field", async () => {
    const accounts = new VolatileLocalAccountStore();
    await accounts.register("carol", "pw", "user");
    const prefs = new VolatileUserPreferenceStore();
    const route = createUserRoutes(accounts, prefs);
    let body = "";
    let status = 0;

    const carolToken = issueAccessToken("carol", "user", 60);
    const carolHeaders = { authorization: `Bearer ${carolToken}` };

    await route(
        { method: "GET", headers: carolHeaders } as any,
        {
            writeHead(c: number) {
                status = c;
            },
            end(p: string) {
                body = p;
            },
        } as any,
        new URL("http://localhost/api/v1/users/carol/info"),
    );
    assert.equal(status, 200);
    const parsed = JSON.parse(body);
    assert.ok(
        "lastLogin" in parsed.data,
        "response should contain lastLogin field",
    );
    assert.equal(
        parsed.data.lastLogin,
        null,
        "lastLogin should be null before any login",
    );

    await accounts.updateLastLogin("carol");

    await route(
        { method: "GET", headers: carolHeaders } as any,
        {
            writeHead(c: number) {
                status = c;
            },
            end(p: string) {
                body = p;
            },
        } as any,
        new URL("http://localhost/api/v1/users/carol/info"),
    );
    const parsedAfter = JSON.parse(body);
    assert.notEqual(
        parsedAfter.data.lastLogin,
        null,
        "lastLogin should be set after updateLastLogin",
    );
});

test("admin can set founder flag through isfounder endpoint", async () => {
    const accounts = new VolatileLocalAccountStore();
    await accounts.register("dana", "pw", "user");
    const prefs = new VolatileUserPreferenceStore();
    const route = createUserRoutes(accounts, prefs);
    let status = 0;
    let body = "";

    await route(
        {
            method: "POST",
            headers,
            [Symbol.asyncIterator]: async function* () {
                yield Buffer.from('{"isFounder":true}');
            },
        } as any,
        {
            writeHead(c: number) {
                status = c;
            },
            end(p: string) {
                body = p;
            },
        } as any,
        new URL("http://localhost/api/v1/users/dana/isfounder"),
    );

    assert.equal(status, 200);
    assert.match(body, /"isFounder":true/);
    assert.equal(await accounts.isFounder("dana"), true);
});

test("disabling a user invalidates existing access tokens for that user", async () => {
    const accounts = new VolatileLocalAccountStore();
    await accounts.register("admin", "pw", "admin");
    await accounts.register("erin", "pw", "user");
    const prefs = new VolatileUserPreferenceStore();
    const route = createUserRoutes(accounts, prefs);
    let status = 0;

    const erinToken = issueAccessToken("erin", "user", 60);
    assert.equal(verifyAccessToken(erinToken)?.sub, "erin");

    await route(
        { method: "POST", headers } as any,
        {
            writeHead(c: number) {
                status = c;
            },
            end() {},
        } as any,
        new URL("http://localhost/api/v1/users/erin/disable"),
    );

    assert.equal(status, 200);
    assert.equal(verifyAccessToken(erinToken), null);
});

test("deleting a user invalidates existing access tokens for that user", async () => {
    const accounts = new VolatileLocalAccountStore();
    await accounts.register("frank", "pw", "user");
    const prefs = new VolatileUserPreferenceStore();
    const route = createUserRoutes(accounts, prefs);
    let status = 0;

    const frankToken = issueAccessToken("frank", "user", 60);
    assert.equal(verifyAccessToken(frankToken)?.sub, "frank");

    await route(
        { method: "DELETE", headers } as any,
        {
            writeHead(c: number) {
                status = c;
            },
            end() {},
        } as any,
        new URL("http://localhost/api/v1/users/frank"),
    );

    assert.equal(status, 200);
    assert.equal(verifyAccessToken(frankToken), null);
});

test("deleting a user frees the username for re-registration", async () => {
    const accounts = new VolatileLocalAccountStore();
    await accounts.register("grace", "pw", "user");
    const prefs = new VolatileUserPreferenceStore();
    const route = createUserRoutes(accounts, prefs);
    let status = 0;

    await route(
        { method: "DELETE", headers } as any,
        {
            writeHead(c: number) {
                status = c;
            },
            end() {},
        } as any,
        new URL("http://localhost/api/v1/users/grace"),
    );
    assert.equal(status, 200);
    assert.equal(await accounts.has("grace"), false);

    await route(
        {
            method: "POST",
            headers,
            [Symbol.asyncIterator]: async function* () {
                yield Buffer.from('{"password":"newpw","role":"user"}');
            },
        } as any,
        {
            writeHead(c: number) {
                status = c;
            },
            end() {},
        } as any,
        new URL("http://localhost/api/v1/users/grace"),
    );
    assert.equal(status, 201);
});

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
    const route = createUserRoutes(accounts, prefs);
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
    assert.equal((await accounts.getInfo("bob"))?.enabled, false);

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
    const route = createUserRoutes(accounts, prefs);
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
    const route = createUserRoutes(accounts, prefs);
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

test("admin can reset user email TFA state", async () => {
    const accounts = new VolatileLocalAccountStore();
    await accounts.register("admin", "pw", "admin");
    await accounts.register("alice", "pw", "user");
    const prefs = new VolatileUserPreferenceStore();
    let status = 0;
    let resetTarget: string | null = null;
    const route = createUserRoutes(
        accounts,
        prefs,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        async (accountId) => {
            resetTarget = accountId;
        },
    );

    await route(
        {
            method: "POST",
            headers,
        } as any,
        {
            writeHead(code: number) {
                status = code;
            },
            end() {},
        } as any,
        new URL("http://localhost/api/v1/users/alice/tfa/reset"),
    );

    assert.equal(status, 200);
    assert.equal(resetTarget, "alice");
});

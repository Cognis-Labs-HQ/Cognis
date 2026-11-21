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

test("user routes create/list/update lifecycle", async () => {
    const accounts = new VolatileLocalAccountStore();
    await accounts.register("admin", "x", "admin");
    const prefs = new VolatileUserPreferenceStore();
    const lifecycle = createProfileLifecycleTracker();
    const route = createUserRoutes(
        accounts,
        prefs,
        undefined,
        undefined,
        undefined,
        undefined,
        await makeRouteContext(accounts),
        lifecycle.get,
        lifecycle.set,
    );
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
    const lifecycle = createProfileLifecycleTracker();
    const route = createUserRoutes(
        accounts,
        prefs,
        undefined,
        (level, message, meta) => {
            entries.push({ level, message, meta });
        },
        undefined,
        undefined,
        await makeRouteContext(accounts),
        lifecycle.get,
        lifecycle.set,
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
            message: "Archived user account from admin disable control.",
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
    const route = createUserRoutes(
        accounts,
        prefs,
        undefined,
        undefined,
        undefined,
        undefined,
        await makeRouteContext(accounts),
    );
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
    const route = createUserRoutes(
        accounts,
        prefs,
        undefined,
        undefined,
        undefined,
        undefined,
        await makeRouteContext(accounts),
    );
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
    const lifecycle = createProfileLifecycleTracker();
    const route = createUserRoutes(
        accounts,
        prefs,
        undefined,
        undefined,
        undefined,
        undefined,
        await makeRouteContext(accounts),
        lifecycle.get,
        lifecycle.set,
    );
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
    assert.equal(await lifecycle.get("erin"), "archived");
    assert.equal(verifyAccessToken(erinToken), null);
});

test("deleting a user invalidates existing access tokens for that user", async () => {
    const accounts = new VolatileLocalAccountStore();
    await accounts.register("frank", "pw", "user");
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

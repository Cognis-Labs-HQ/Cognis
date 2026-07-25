import test from "node:test";
import assert from "node:assert/strict";
import { createUserRoutes } from "../../routes/users/index.js";
import { createDefaultRouteContext } from "../../reuse/route-context.js";
import { VolatileLocalAccountStore } from "../../../gateways/auth/reuse/account-store.js";
import { VolatileUserPreferenceStore } from "../../reuse/preference-store.js";
import {
    issueAccessToken,
    verifyAccessToken,
    revokeAccessTokensForSubject,
} from "../../../gateways/auth/access-tokens.js";
import {
    CapabilityStore,
    CTX_CAPABILITY,
    createCtx,
    registerCanonicalFlow,
    USER_LIFECYCLE_FLOW_CATALOG,
} from "@cognis/core";
import type { LocalAccountStore } from "../../../gateways/auth/reuse/account-store.js";

function makeRouteContext(accountStore: LocalAccountStore) {
    const VALID_ROLES = new Set(["user", "teacher", "moderator", "admin"]);
    const capabilities = new CapabilityStore();
    const flowCtx = createCtx();
    capabilities.contribute(CTX_CAPABILITY, flowCtx);
    capabilities.contribute(
        "auth:revokeAccessTokensForSubject",
        revokeAccessTokensForSubject,
    );
    for (const flow of USER_LIFECYCLE_FLOW_CATALOG) {
        registerCanonicalFlow(flowCtx, flow);
    }
    flowCtx.flow.extend(
        "provision-user",
        "validate-request",
        { id: "test:validate-account-input" },
        (stageCtx) => {
            const input = (stageCtx.input ?? {}) as { role?: string };
            const role = String(input.role ?? "user");
            if (!VALID_ROLES.has(role)) {
                return { valid: false, reason: "invalid_role", role };
            }
            return { valid: true, role };
        },
    );
    flowCtx.flow.extend(
        "provision-user",
        "persist-account",
        { id: "test:create-account" },
        async (stageCtx) => {
            const input = (stageCtx.input ?? {}) as {
                username?: string;
                password?: string;
            };
            const validateResult = (
                (stageCtx.stageResults["validate-request"] ?? []) as Array<{
                    valid: boolean;
                    reason?: string;
                    role?: string;
                }>
            )[0];
            if (!validateResult?.valid) {
                return {
                    persisted: false,
                    reason: validateResult?.reason ?? "validation_failed",
                };
            }
            const username = String(input.username ?? "");
            const password = String(input.password ?? "").trim();
            const role = validateResult.role ?? "user";
            if (!password) {
                return { persisted: false, reason: "missing_password" };
            }
            const created = await accountStore.register(
                username,
                password,
                role === "admin",
            );
            return { persisted: true, created, role };
        },
    );
    flowCtx.flow.extend(
        "provision-user",
        "emit-events",
        { id: "test:provision-emit" },
        (stageCtx) => {
            const persistResult = (
                (stageCtx.stageResults["persist-account"] ?? []) as Array<{
                    persisted: boolean;
                    created?: { username: string };
                    role?: string;
                }>
            )[0];
            if (!persistResult?.persisted) return { emitted: false };
            return {
                emitted: true,
                accountId: persistResult.created?.username,
                role: persistResult.role,
            };
        },
    );
    flowCtx.flow.extend(
        "deprovision-user",
        "authorize-request",
        { id: "test:authorize-deprovision" },
        (stageCtx) => {
            const input = (stageCtx.input ?? {}) as {
                callerRole?: string;
                targetRole?: string;
                targetIsFounder?: boolean;
            };
            if (input.targetIsFounder) {
                return {
                    authorized: false,
                    reason: "protected_founder_account",
                };
            }
            if (
                input.callerRole === "admin" &&
                (input.targetRole === "admin" || input.targetRole === "owner")
            ) {
                return { authorized: false, reason: "protected_admin_account" };
            }
            return { authorized: true };
        },
    );
    flowCtx.flow.extend(
        "deprovision-user",
        "persist-state",
        { id: "test:apply-deprovision" },
        async (stageCtx) => {
            const input = (stageCtx.input ?? {}) as {
                username?: string;
                action?: "delete" | "disable" | "archive";
            };
            const authorizeResult = (
                (stageCtx.stageResults["authorize-request"] ?? []) as Array<{
                    authorized: boolean;
                    reason?: string;
                }>
            )[0];
            if (!authorizeResult?.authorized) {
                return {
                    persisted: false,
                    reason: authorizeResult?.reason ?? "authorization_failed",
                };
            }
            const username = String(input.username ?? "");
            if (input.action === "delete") {
                await accountStore.delete(username);
            } else if (input.action === "disable") {
                await accountStore.setEnabled?.(username, false);
            }
            return { persisted: true, username, action: input.action };
        },
    );
    flowCtx.flow.extend(
        "deprovision-user",
        "cleanup-dependencies",
        { id: "test:revoke-tokens" },
        (stageCtx) => {
            const persistResult = (
                (stageCtx.stageResults["persist-state"] ?? []) as Array<{
                    persisted: boolean;
                    username?: string;
                }>
            )[0];
            if (!persistResult?.persisted || !persistResult.username) {
                return { cleaned: false, revokedTokenCount: 0 };
            }
            const revokeTokens = capabilities.get<(subject: string) => number>(
                "auth:revokeAccessTokensForSubject",
            );
            const revokedCount = revokeTokens?.(persistResult.username) ?? 0;
            return { cleaned: true, revokedTokenCount: revokedCount };
        },
    );
    return createDefaultRouteContext({
        getCapability: capabilities.get.bind(capabilities),
        requireCapability: capabilities.require.bind(capabilities),
        flow: flowCtx.flow,
    });
}

const adminToken = issueAccessToken("admin", "admin", 60);
const ownerToken = issueAccessToken("owner", "owner", 60);
const headers = { authorization: `Bearer ${adminToken}` };
const ownerHeaders = { authorization: `Bearer ${ownerToken}` };

function createProfileLifecycleTracker() {
    const states = new Map<string, "active" | "deactivated" | "archived">();
    return {
        states,
        get: async (accountId: string) => states.get(accountId) ?? "active",
        set: async (
            accountId: string,
            lifecycleState: "active" | "deactivated" | "archived",
        ) => {
            states.set(accountId, lifecycleState);
        },
    };
}

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
        makeRouteContext(accounts),
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
        makeRouteContext(accounts),
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
    const lifecycle = createProfileLifecycleTracker();
    const route = createUserRoutes(
        accounts,
        prefs,
        undefined,
        undefined,
        undefined,
        undefined,
        makeRouteContext(accounts),
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
        makeRouteContext(accounts),
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
        makeRouteContext(accounts),
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
        makeRouteContext(accounts),
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
        createDefaultRouteContext({
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
    const route = createUserRoutes(accounts, undefined);

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
    await accounts.ensureExternalAccount({
        accountId: "ldap-user",
        provider: "ldap",
        externalUserId: "uid=ldap-user,dc=example,dc=org",
    });
    let status = 0;
    let body = "";
    const route = createUserRoutes(accounts, undefined);

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
        new URL("http://localhost/api/v1/users/ldap-user/password"),
    );

    assert.equal(status, 403);
    assert.equal(JSON.parse(body).error.code, "external_password_managed");
});

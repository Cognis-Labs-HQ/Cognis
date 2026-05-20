import test from "node:test";
import assert from "node:assert/strict";
import { createSystemRoutes } from "../../routes/system/index.js";
import { issueAccessToken } from "../../../gateways/auth/access-tokens.js";

const healthService = {
    status() {
        return {
            status: "ok",
            timestamp: "2026-01-01T00:00:00.000Z",
            startedAt: "2026-01-01T00:00:00.000Z",
            uptimeMs: 1,
        };
    },
};

test("system route handles healthcheck endpoint", async () => {
    const route = createSystemRoutes(healthService as any);
    let status = 0;
    let body = "";

    const handled = await route(
        { method: "GET" } as any,
        {
            writeHead(code: number) {
                status = code;
            },
            end(payload: string) {
                body = payload;
            },
        } as any,
        new URL("http://localhost/api/v1/system/healthcheck"),
    );

    assert.equal(handled, true);
    assert.equal(status, 200);
    assert.match(body, /uptimeMs/);
});

test("system route exposes env-backed ui config", async () => {
    process.env.COGNIS_UI_DEMO_MODE = "true";
    const route = createSystemRoutes(healthService as any);
    let body = "";

    await route(
        { method: "GET" } as any,
        {
            writeHead() {},
            end(payload: string) {
                body = payload;
            },
        } as any,
        new URL("http://localhost/api/v1/system/ui-config"),
    );

    assert.match(body, /"demoMode":true/);
});

test("system release changelog feed requires authentication", async () => {
    const route = createSystemRoutes(healthService as any);
    let status = 0;
    let body = "";

    const handled = await route(
        { method: "GET", headers: {} } as any,
        {
            writeHead(code: number) {
                status = code;
            },
            end(payload: string) {
                body = payload;
            },
        } as any,
        new URL("http://localhost/api/v1/system/release-changelog"),
    );

    assert.equal(handled, true);
    assert.equal(status, 401);
    assert.match(body, /"unauthorized"/);
});

test("system release changelog feed returns release version and entries", async () => {
    const token = issueAccessToken("alice", "user", 60);
    const route = createSystemRoutes(healthService as any);
    let status = 0;
    let body = "";

    const handled = await route(
        {
            method: "GET",
            headers: { authorization: `Bearer ${token}` },
        } as any,
        {
            writeHead(code: number) {
                status = code;
            },
            end(payload: string) {
                body = payload;
            },
        } as any,
        new URL("http://localhost/api/v1/system/release-changelog"),
    );

    assert.equal(handled, true);
    assert.equal(status, 200);
    const parsed = JSON.parse(body);
    assert.match(parsed.data.releaseVersion, /^\d+\.\d+\.\d+$/);
    assert.ok(Array.isArray(parsed.data.entries));
    assert.ok(parsed.data.entries.length > 0);
    const [firstEntry] = parsed.data.entries;
    assert.equal(typeof firstEntry.slug, "string");
    assert.equal(typeof firstEntry.title, "string");
    assert.ok(Array.isArray(firstEntry.changes));
    assert.equal(typeof firstEntry.path, "string");
    assert.ok(firstEntry.path.startsWith("/changelogs/"));
});

test("system route serves license markdown payload", async () => {
    const route = createSystemRoutes(healthService as any);
    let status = 0;
    let body = "";

    const handled = await route(
        { method: "GET" } as any,
        {
            writeHead(code: number) {
                status = code;
            },
            end(payload: string) {
                body = payload;
            },
        } as any,
        new URL("http://localhost/api/v1/system/license"),
    );

    assert.equal(handled, true);
    assert.equal(status, 200);
    assert.match(body, /GNU Affero General Public License/);
});

test("system security settings require authentication", async () => {
    const route = createSystemRoutes(healthService as any);
    let status = 0;
    let body = "";

    const handled = await route(
        { method: "GET", headers: {} } as any,
        {
            writeHead(code: number) {
                status = code;
            },
            end(payload: string) {
                body = payload;
            },
        } as any,
        new URL("http://localhost/api/v1/system/security"),
    );

    assert.equal(handled, true);
    assert.equal(status, 401);
    assert.match(body, /"unauthorized"/);
});

test("system security settings sanitize and survive malformed persisted data", async () => {
    const token = issueAccessToken("alice", "user", 60);
    const headers = { authorization: `Bearer ${token}` };
    let status = 0;
    let body = "";
    const preferenceStore = {
        get: async () =>
            '{ "trustedDomains": ["Example.COM", " ", 7], "userValidationMode": "smtp" }',
    };
    const route = createSystemRoutes(
        healthService as any,
        preferenceStore as any,
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
        new URL("http://localhost/api/v1/system/security"),
    );

    assert.equal(status, 200);
    assert.deepEqual(JSON.parse(body).data.trustedDomains, ["example.com"]);
    assert.equal(JSON.parse(body).data.registrationsEnabled, false);
    assert.equal(JSON.parse(body).data.userValidationMode, "smtp");

    const malformedStore = { get: async () => "not-json" };
    const malformedRoute = createSystemRoutes(
        healthService as any,
        malformedStore as any,
    );

    await malformedRoute(
        { method: "GET", headers } as any,
        {
            writeHead(code: number) {
                status = code;
            },
            end(payload: string) {
                body = payload;
            },
        } as any,
        new URL("http://localhost/api/v1/system/security"),
    );

    assert.equal(status, 200);
    assert.deepEqual(JSON.parse(body).data.trustedDomains, []);
    assert.equal(JSON.parse(body).data.registrationsEnabled, false);
    assert.equal(JSON.parse(body).data.userValidationMode, "none");
});

test("system security settings log malformed persisted data", async () => {
    const token = issueAccessToken("alice", "user", 60);
    const headers = { authorization: `Bearer ${token}` };
    const entries: Array<{
        level: string;
        message: string;
        meta?: Record<string, unknown>;
    }> = [];
    const route = createSystemRoutes(
        healthService as any,
        { get: async () => "not-json" } as any,
        (level, message, meta) => {
            entries.push({ level, message, meta });
        },
    );

    await route(
        { method: "GET", headers } as any,
        {
            writeHead() {},
            end() {},
        } as any,
        new URL("http://localhost/api/v1/system/security"),
    );

    assert.deepEqual(entries, [
        {
            level: "warn",
            message: "Failed to parse persisted security settings.",
            meta: {
                component: "api-system",
                method: "GET",
                path: "/api/v1/system/security",
                accountId: "alice",
            },
        },
        {
            level: "debug",
            message: "Read security settings.",
            meta: {
                component: "api-system",
                method: "GET",
                path: "/api/v1/system/security",
                accountId: "alice",
            },
        },
    ]);
});

import test from "node:test";
import assert from "node:assert/strict";
import { createSystemRoutes } from "../../routes/system/index.js";
import { issueAccessToken } from "../../auth/access-tokens.js";

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
        get: async () => '{ "trustedDomains": ["Example.COM", " ", 7] }',
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
});

import test from "node:test";
import assert from "node:assert/strict";
import { createModuleExtensionRoutes } from "../module-extensions.js";
import { issueAccessToken } from "../../../gateways/auth/access-tokens.js";
import { UIRegistry } from "../../../api/ui-registry.js";

test("module extension routes expose module API endpoints", async () => {
    const extensions = createModuleExtensionRoutes(
        {
            listManifests: async () => [
                {
                    id: "sample-analytics",
                    entrypoints: { api: "./api/index.js" },
                },
            ],
        } as any,
        () => true,
    );
    await extensions.refresh();

    let status = 0;
    let body = "";

    const adminToken = issueAccessToken("owner", "owner", 60);
    const handled = await extensions.handle(
        {
            method: "GET",
            headers: { authorization: `Bearer ${adminToken}` },
        } as any,
        {
            writeHead(code: number) {
                status = code;
            },
            end(payload: string) {
                body = payload;
            },
        } as any,
        new URL("http://localhost/api/v1/modules/sample-analytics/metrics"),
    );

    assert.equal(handled, true);
    assert.equal(status, 200);
    assert.match(body, /visitors/);
});

test("module extension routes enforce declared minimum role policies", async () => {
    const extensions = createModuleExtensionRoutes(
        {
            listManifests: async () => [
                {
                    id: "sample-analytics",
                    entrypoints: { api: "./api/index.js" },
                },
            ],
        } as any,
        () => true,
    );
    await extensions.refresh();

    let status = 0;
    let body = "";

    const userToken = issueAccessToken("learner", "user", 60);
    const handled = await extensions.handle(
        {
            method: "GET",
            headers: { authorization: `Bearer ${userToken}` },
        } as any,
        {
            writeHead(code: number) {
                status = code;
            },
            end(payload: string) {
                body = payload;
            },
        } as any,
        new URL("http://localhost/api/v1/modules/sample-analytics/metrics"),
    );

    assert.equal(handled, true);
    assert.equal(status, 403);
    assert.match(body, /Requires admin scope/);
});

test("module extension routes fail closed on invalid role access policies", async () => {
    const extensions = createModuleExtensionRoutes(
        {
            listManifests: async () => [
                {
                    id: "sample-analytics",
                    entrypoints: { api: "./api/invalid-access.js" },
                },
            ],
        } as any,
        () => true,
    );
    await extensions.refresh();

    let status = 0;
    let body = "";

    const ownerToken = issueAccessToken("owner", "owner", 60);
    const handled = await extensions.handle(
        {
            method: "GET",
            headers: { authorization: `Bearer ${ownerToken}` },
        } as any,
        {
            writeHead(code: number) {
                status = code;
            },
            end(payload: string) {
                body = payload;
            },
        } as any,
        new URL(
            "http://localhost/api/v1/modules/sample-analytics-invalid/metrics",
        ),
    );

    assert.equal(handled, true);
    assert.equal(status, 403);
    assert.match(body, /invalid access policy/i);
});

test("module extension routes register module dashboard page extensions", async () => {
    const uiRegistry = new UIRegistry();
    const extensions = createModuleExtensionRoutes(
        {
            listManifests: async () => [
                {
                    id: "sample-analytics",
                    entrypoints: { api: "./api/index.js" },
                },
            ],
        } as any,
        () => true,
        undefined,
        { uiRegistry },
    );
    await extensions.refresh();

    const dashboardExtensions = uiRegistry.listPageExtensions("dashboard");
    assert.equal(dashboardExtensions.length, 1);
    assert.equal(dashboardExtensions[0]?.id, "module-sample-analytics-dashboard");
    assert.equal(
        dashboardExtensions[0]?.scriptUrl,
        "/static/modules/sample-analytics/dashboard-element.js",
    );
    assert.equal(dashboardExtensions[0]?.isEnabled?.(), true);
});

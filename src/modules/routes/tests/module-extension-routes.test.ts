import test from "node:test";
import assert from "node:assert/strict";
import { createModuleExtensionRoutes } from "../module-extensions.js";
import { issueAccessToken } from "../../../gateways/auth/access-tokens.js";
import { createDefaultRouteContext } from "../../../api/reuse/route-context.js";

const { requireRoleAccess } = createDefaultRouteContext();

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
        undefined,
        { requireRoleAccess },
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
        undefined,
        { requireRoleAccess },
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
        undefined,
        { requireRoleAccess },
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

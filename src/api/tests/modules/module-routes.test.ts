import test from "node:test";
import assert from "node:assert/strict";
import { createModuleRoutes } from "../../routes/modules/index.js";
import { issueAccessToken } from "../../../gateways/auth/access-tokens.js";

test("module routes list modules", async () => {
    const route = createModuleRoutes({
        list: async () => [
            { id: "sample-analytics", version: "1.0.0", class: "extension" },
        ],
        enable: async () => ({ moduleId: "x", enabled: true }),
        disable: async () => ({ moduleId: "x", enabled: false }),
    } as any);

    const token = issueAccessToken("u1", "admin", 60);
    let status = 0;
    let body = "";

    const handled = await route(
        { method: "GET", headers: { authorization: `Bearer ${token}` } } as any,
        {
            writeHead(code: number) {
                status = code;
            },
            end(payload: string) {
                body = payload;
            },
        } as any,
        new URL("http://localhost/api/v1/modules"),
    );

    assert.equal(handled, true);
    assert.equal(status, 200);
    assert.match(body, /sample-analytics/);
});

test("module routes log enable operations", async () => {
    const entries: Array<{
        level: string;
        message: string;
        meta?: Record<string, unknown>;
    }> = [];
    const route = createModuleRoutes(
        {
            list: async () => [],
            enable: async (moduleId: string) => ({ moduleId, enabled: true }),
            disable: async () => ({ moduleId: "x", enabled: false }),
        } as any,
        {
            log: (level, message, meta) => {
                entries.push({ level, message, meta });
            },
        },
    );

    const token = issueAccessToken("admin-user", "admin", 60);
    let status = 0;

    await route(
        {
            method: "POST",
            headers: { authorization: `Bearer ${token}` },
        } as any,
        {
            writeHead(code: number) {
                status = code;
            },
            end() {},
        } as any,
        new URL("http://localhost/api/v1/modules/sample-analytics/enable"),
    );

    assert.equal(status, 200);
    assert.deepEqual(entries, [
        {
            level: "info",
            message: "Module enabled.",
            meta: {
                component: "api-modules",
                method: "POST",
                path: "/api/v1/modules/sample-analytics/enable",
                accountId: "admin-user",
                moduleId: "sample-analytics",
                acknowledgedExternalDisclaimer: false,
            },
        },
    ]);
});

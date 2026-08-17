import test from "node:test";
import assert from "node:assert/strict";
import { createModuleRoutes } from "../../routes/modules/index.js";
import { issueAccessToken } from "../../../gateways/auth/access-tokens.js";

test("module routes list modules", async () => {
    const route = createModuleRoutes({
        list: async () => [
            { id: "analytics", version: "1.0.0", class: "extension" },
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
    assert.match(body, /analytics/);
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
        new URL("http://localhost/api/v1/modules/analytics/enable"),
    );

    assert.equal(status, 200);
    assert.deepEqual(entries, [
        {
            level: "info",
            message: "Module enabled.",
            meta: {
                component: "api-modules",
                method: "POST",
                path: "/api/v1/modules/analytics/enable",
                accountId: "admin-user",
                moduleId: "analytics",
                acknowledgedExternalDisclaimer: false,
            },
        },
    ]);
});

test("module routes support github imports", async () => {
    const route = createModuleRoutes({
        list: async () => [],
        enable: async () => ({ moduleId: "x", enabled: true }),
        disable: async () => ({ moduleId: "x", enabled: false }),
        importFromGithub: async () => ({
            id: "jitsi-meet",
            name: "Jitsi Meet",
            version: "1.0.0",
            class: "extension",
            coreApiVersion: "v1",
            capabilities: [],
            entrypoints: {},
        }),
    } as any);

    const token = issueAccessToken("owner", "owner", 60);
    let status = 0;
    let body = "";
    const handled = await route(
        {
            method: "POST",
            headers: { authorization: "Bearer " + token },
            [Symbol.asyncIterator]: async function* () {
                yield Buffer.from(
                    JSON.stringify({
                        repositoryUrl: "https://github.com/acme/jitsi-meet",
                        versionTag: "v1.0.0",
                    }),
                );
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
        new URL("http://localhost/api/v1/modules/import/github"),
    );

    assert.equal(handled, true);
    assert.equal(status, 200);
    assert.match(body, /jitsi-meet/);
});

test("module routes run enable tests before enabling modules", async () => {
    let enableCalled = false;
    const route = createModuleRoutes(
        {
            list: async () => [],
            enable: async (moduleId: string) => {
                enableCalled = true;
                return { moduleId, enabled: true };
            },
            disable: async () => ({ moduleId: "x", enabled: false }),
        } as any,
        {
            beforeEnable: async () => {
                throw new Error("enable test failed");
            },
        },
    );

    const token = issueAccessToken("admin-user", "admin", 60);
    await assert.rejects(
        route(
            {
                method: "POST",
                headers: { authorization: `Bearer ${token}` },
            } as any,
            { writeHead() {}, end() {} } as any,
            new URL("http://localhost/api/v1/modules/jitsi-meet/enable"),
        ),
        /enable test failed/,
    );
    assert.equal(enableCalled, false);
});

test("module uninstall requires disable and triggers runtime teardown", async () => {
    const token = issueAccessToken("admin-user", "admin", 60);
    const uuid = "94d6974b-d836-4653-af9b-8b68774f4458";
    let enabled = true;
    let uninstallCount = 0;
    let uninstalledModuleId = "";
    const route = createModuleRoutes(
        {
            list: async () => [{ id: "external", uuid, class: "extension" }],
        } as any,
        {
            getStatus: () => (enabled ? "enabled" : "disabled"),
            onUninstalled: async (moduleId) => {
                uninstalledModuleId = moduleId;
            },
        },
        undefined,
        {
            uninstall: async () => {
                uninstallCount++;
            },
        } as any,
    );
    const requestUninstall = async () => {
        let status = 0;
        let body = "";
        await route(
            {
                method: "DELETE",
                headers: { authorization: `Bearer ${token}` },
            } as any,
            {
                writeHead(code: number) {
                    status = code;
                },
                end(payload = "") {
                    body = payload;
                },
            } as any,
            new URL(`http://localhost/api/v1/modules/${uuid}/uninstall`),
        );
        return { status, body };
    };

    const blocked = await requestUninstall();
    assert.equal(blocked.status, 409);
    assert.match(blocked.body, /module_enabled/);
    assert.equal(uninstallCount, 0);

    enabled = false;
    assert.equal((await requestUninstall()).status, 204);
    assert.equal(uninstallCount, 1);
    assert.equal(uninstalledModuleId, "external");
});

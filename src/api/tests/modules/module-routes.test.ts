import test from "node:test";
import assert from "node:assert/strict";
import {
    createModuleRoutes,
    ModuleEnableValidationError,
} from "../../routes/modules/index.js";
import { issueAccessToken } from "../../../gateways/auth/access-tokens.js";

test("module routes list modules", async () => {
    const route = createModuleRoutes({
        list: async () => [
            { id: "example-module", version: "1.0.0", class: "extension" },
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
    assert.match(body, /example-module/);
});

test("module routes omit Cognis Core from the module catalog", async () => {
    const route = createModuleRoutes({
        list: async () => [
            { id: "cognis-core", class: "core" },
            { id: "notes", class: "extension" },
        ],
    } as any);
    const token = issueAccessToken("u1", "admin", 60);
    let body = "";
    await route(
        { method: "GET", headers: { authorization: `Bearer ${token}` } } as any,
        {
            writeHead() {},
            end(payload: string) {
                body = payload;
            },
        } as any,
        new URL("http://localhost/api/v1/modules"),
    );
    assert.doesNotMatch(body, /cognis-core/);
    assert.match(body, /notes/);
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
        new URL("http://localhost/api/v1/modules/example-module/enable"),
    );

    assert.equal(status, 200);
    assert.deepEqual(entries, [
        {
            level: "info",
            message: "Module enabled.",
            meta: {
                component: "api-modules",
                method: "POST",
                path: "/api/v1/modules/example-module/enable",
                accountId: "admin-user",
                moduleId: "example-module",
                acknowledgedExternalDisclaimer: false,
            },
        },
    ]);
});

test("module enablement requires explicit acknowledgement of integrity failures", async () => {
    let enabled = false;
    const route = createModuleRoutes(
        {
            list: async () => [
                {
                    id: "example-module",
                    uuid: "module-uuid",
                    class: "extension",
                },
            ],
            enable: async () => {
                enabled = true;
                return { moduleId: "example-module", enabled: true };
            },
        } as any,
        {
            getIntegrityReport: async () => [
                {
                    moduleId: "example-module",
                    file: "ui/app.js",
                    expected: "expected",
                    actual: "actual",
                    status: "mismatch",
                },
                {
                    moduleId: "example-module",
                    file: "ui/new.js",
                    expected: null,
                    actual: "actual",
                    status: "missing_shasum",
                },
            ],
        },
    );
    const token = issueAccessToken("admin-user", "admin", 60);
    const request = async (integrityToken = "") => {
        let status = 0;
        let body = "";
        await route(
            {
                method: "POST",
                headers: {
                    authorization: `Bearer ${token}`,
                    ...(integrityToken
                        ? {
                              "x-cognis-module-integrity-risk": `accepted:${integrityToken}`,
                          }
                        : {}),
                },
            } as any,
            {
                writeHead(code: number) {
                    status = code;
                },
                end(payload = "") {
                    body = payload;
                },
            } as any,
            new URL("http://localhost/api/v1/modules/example-module/enable"),
        );
        return { status, body };
    };

    const blocked = await request();
    assert.equal(blocked.status, 409);
    assert.equal(enabled, false);
    assert.match(blocked.body, /module_integrity_acknowledgement_required/);
    assert.match(blocked.body, /missing_shasum/);

    const integrityToken = JSON.parse(blocked.body).error.integrityToken;
    const accepted = await request(integrityToken);
    assert.equal(accepted.status, 200);
    assert.equal(enabled, true);
});

test("module routes warn when modules are disabled", async () => {
    const entries: Array<{ level: string; message: string }> = [];
    const route = createModuleRoutes(
        {
            list: async () => [],
            disable: async (moduleId: string) => ({
                moduleId,
                enabled: false,
            }),
        } as any,
        {
            log: (level, message) => entries.push({ level, message }),
        },
    );
    const token = issueAccessToken("admin-user", "admin", 60);

    await route(
        {
            method: "POST",
            headers: { authorization: `Bearer ${token}` },
        } as any,
        { writeHead() {}, end() {} } as any,
        new URL("http://localhost/api/v1/modules/example-module/disable"),
    );

    assert.deepEqual(entries, [{ level: "warn", message: "Module disabled." }]);
});

test("module routes identify temporary update disables", async () => {
    let preserveEnabledState = false;
    const route = createModuleRoutes(
        {
            list: async () => [],
            disable: async () => ({ enabled: false }),
        } as any,
        {
            onDisabled: async (_moduleId, options) => {
                preserveEnabledState = options.preserveEnabledState;
            },
        },
    );
    const token = issueAccessToken("admin-user", "admin", 60);

    await route(
        {
            method: "POST",
            headers: {
                authorization: `Bearer ${token}`,
                "x-cognis-module-lifecycle": "temporary-update",
            },
        } as any,
        { writeHead() {}, end() {} } as any,
        new URL("http://localhost/api/v1/modules/example-module/disable"),
    );

    assert.equal(preserveEnabledState, true);
});

test("module routes support github imports", async () => {
    const route = createModuleRoutes({
        list: async () => [],
        enable: async () => ({ moduleId: "x", enabled: true }),
        disable: async () => ({ moduleId: "x", enabled: false }),
        importFromGithub: async () => ({
            id: "example-module",
            name: "Example Module",
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
                        repositoryUrl: "https://github.com/acme/example-module",
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
    assert.match(body, /example-module/);
});

test("module routes run enable tests before enabling modules", async () => {
    let enableCalled = false;
    const errors: Array<{ level: string; message: string }> = [];
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
            log: (level, message) => errors.push({ level, message }),
        },
    );

    const token = issueAccessToken("admin-user", "admin", 60);
    let status = 0;
    let body = "";
    await route(
        {
            method: "POST",
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
        new URL("http://localhost/api/v1/modules/example-module/enable"),
    );
    assert.equal(status, 409);
    assert.equal(JSON.parse(body).error.code, "module_validation_failed");
    assert.equal(enableCalled, false);
    assert.deepEqual(errors, [
        { level: "error", message: "Module enable validation failed." },
    ]);
});

test("module routes return actionable dependency validation errors", async () => {
    const route = createModuleRoutes(
        {
            list: async () => [],
            enable: async () => {
                throw new Error("enable_must_not_run");
            },
        } as any,
        {
            beforeEnable: async () => {
                throw new ModuleEnableValidationError(
                    "module_dependency_unavailable",
                    "Module example-module has an unavailable dependency",
                );
            },
        },
    );
    const token = issueAccessToken("admin-user", "admin", 60);
    let status = 0;
    let body = "";

    const handled = await route(
        {
            method: "POST",
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
        new URL("http://localhost/api/v1/modules/example-module/enable"),
    );

    assert.equal(handled, true);
    assert.equal(status, 409);
    assert.deepEqual(JSON.parse(body), {
        error: {
            code: "module_dependency_unavailable",
            message: "Module example-module has an unavailable dependency",
        },
    });
});

test("module source mutations and scans emit lifecycle logs", async () => {
    const token = issueAccessToken("admin-user", "admin", 60);
    const logs: Array<{ level: string; message: string; count?: unknown }> = [];
    const source = {
        uuid: "6931e77f-f740-4db7-9f7c-5809f44255ee",
        name: "Additional source",
    };
    const route = createModuleRoutes(
        { list: async () => [] } as any,
        {
            log: (level, message, meta) =>
                logs.push({
                    level,
                    message,
                    count: meta?.catalogModulesFound,
                }),
        },
        undefined,
        {
            listSources: async () => [],
            saveSource: async () => source,
            removeSource: async () => undefined,
            listRecommendedModuleUuids: async () => [],
            discoverWithReport: async () => ({
                modules: [{ uuid: "module-one" }],
                sourceFailures: [],
            }),
        } as any,
    );
    const request = async (method: string, pathname: string, body?: unknown) =>
        route(
            {
                method,
                headers: { authorization: `Bearer ${token}` },
                async *[Symbol.asyncIterator]() {
                    if (body) yield Buffer.from(JSON.stringify(body));
                },
            } as any,
            { writeHead() {}, end() {} } as any,
            new URL(`http://localhost${pathname}`),
        );

    await request("POST", "/api/v1/modules/sources", source);
    await request("DELETE", `/api/v1/modules/sources/${source.uuid}`);
    await request("POST", "/api/v1/modules/catalog", {});

    assert.deepEqual(logs, [
        { level: "info", message: "Module source added.", count: undefined },
        { level: "warn", message: "Module source deleted.", count: undefined },
        { level: "info", message: "Module source scan completed.", count: 1 },
    ]);
});

test("module uninstall requires disable and triggers runtime teardown", async () => {
    const token = issueAccessToken("admin-user", "admin", 60);
    const uuid = "94d6974b-d836-4653-af9b-8b68774f4458";
    let enabled = true;
    let uninstallCount = 0;
    let uninstalledModuleId = "";
    let deleteContent = false;
    const logEntries: Array<{ level: string; message: string }> = [];
    const route = createModuleRoutes(
        {
            list: async () => [{ id: "external", uuid, class: "extension" }],
        } as any,
        {
            getStatus: () => (enabled ? "enabled" : "disabled"),
            beforeUninstall: async (_moduleId, options) => {
                deleteContent = options.deleteContent;
                return true;
            },
            onUninstalled: async (moduleId) => {
                uninstalledModuleId = moduleId;
            },
            log: (level, message) => logEntries.push({ level, message }),
        },
        undefined,
        {
            uninstall: async () => {
                uninstallCount++;
            },
        } as any,
    );
    const requestUninstall = async (removeContent = false) => {
        let status = 0;
        let body = "";
        await route(
            {
                method: "DELETE",
                headers: { authorization: `Bearer ${token}` },
                async *[Symbol.asyncIterator]() {
                    yield Buffer.from(
                        JSON.stringify({ deleteContent: removeContent }),
                    );
                },
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
    assert.equal((await requestUninstall(true)).status, 204);
    assert.equal(uninstallCount, 1);
    assert.equal(uninstalledModuleId, "external");
    assert.equal(deleteContent, true);
    assert.deepEqual(logEntries, [
        { level: "warn", message: "External module deleted." },
    ]);
});

test("module catalog discovery accepts caller-selected sources", async () => {
    const token = issueAccessToken("admin-user", "admin", 60);
    let selectedSources: string[] | undefined;
    let forceRefresh = false;
    const route = createModuleRoutes(
        { list: async () => [] } as any,
        undefined,
        undefined,
        {
            listRecommendedModuleUuids: async () => ["notes-uuid"],
            getAsset: async (id: string) =>
                id === "b".repeat(64)
                    ? {
                          body: Buffer.from("<resources></resources>"),
                          contentType: "application/xml",
                      }
                    : undefined,
            discoverWithReport: async (_tokens, sourceUuids, force) => {
                selectedSources = sourceUuids;
                forceRefresh = force;
                return {
                    modules: [
                        {
                            id: "notes",
                            uuid: "notes-uuid",
                            ui: {
                                stringsBaseUrl:
                                    "/static/modules/notes/languages",
                            },
                            assetIds: {
                                icon: "a".repeat(64),
                                strings: { en: "b".repeat(64) },
                            },
                        },
                    ],
                    sourceFailures: [
                        {
                            sourceUuid: "source-one",
                            sourceName: "Private source",
                            code: "private_repository_access_failed",
                        },
                    ],
                };
            },
        } as any,
    );
    let status = 0;
    let responseBody = "";
    await route(
        {
            method: "POST",
            headers: { authorization: `Bearer ${token}` },
            async *[Symbol.asyncIterator]() {
                yield Buffer.from(
                    JSON.stringify({
                        sourceUuids: ["source-one"],
                        forceRefresh: true,
                    }),
                );
            },
        } as any,
        {
            writeHead(code: number) {
                status = code;
            },
            end(value: string) {
                responseBody = value;
            },
        } as any,
        new URL("http://localhost/api/v1/modules/catalog"),
    );
    assert.equal(status, 200);
    assert.deepEqual(selectedSources, ["source-one"]);
    assert.equal(forceRefresh, true);
    assert.match(responseBody, /\/api\/v1\/modules\/catalog\/assets\/a{64}/);
    assert.match(
        responseBody,
        /\/api\/v1\/modules\/catalog\/strings\/notes-uuid/,
    );
    assert.match(responseBody, /private_repository_access_failed/);
});

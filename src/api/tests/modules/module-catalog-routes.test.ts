import test from "node:test";
import assert from "node:assert/strict";
import {
    createModuleRoutes,
    ModuleEnableValidationError,
} from "../../routes/modules/index.js";
import { issueAccessToken } from "../../../gateways/auth/access-tokens.js";

test("module catalog only advertises string assets available from cache", async () => {
    const token = issueAccessToken("admin-user", "admin", 60);
    const logEntries: Array<Record<string, unknown>> = [];
    const route = createModuleRoutes(
        { list: async () => [] } as any,
        {
            log: (level, message, meta) =>
                logEntries.push({ level, message, ...meta }),
        },
        undefined,
        {
            listRecommendedModuleUuids: async () => [],
            listCachedModules: async () => [
                {
                    id: "incomplete",
                    uuid: "incomplete-uuid",
                    ui: {
                        stringsBaseUrl: "/static/modules/incomplete/languages",
                    },
                    assetIds: { strings: {} },
                },
            ],
            getAsset: async () => undefined,
        } as any,
    );
    let responseBody = "";
    await route(
        {
            method: "GET",
            headers: { authorization: `Bearer ${token}` },
        } as any,
        {
            writeHead() {},
            end(value: string) {
                responseBody = value;
            },
        } as any,
        new URL("http://localhost/api/v1/modules/catalog"),
    );
    const payload = JSON.parse(responseBody);
    assert.equal(payload.data[0].ui.stringsBaseUrl, undefined);
    assert.deepEqual(
        logEntries.find(
            (entry) => entry.operation === "resolve-marketplace-strings",
        ),
        {
            level: "warn",
            message: "Module catalog strings were unavailable.",
            component: "api-modules",
            operation: "resolve-marketplace-strings",
            moduleUuid: "incomplete-uuid",
            locale: "en",
            assetId: undefined,
        },
    );
});

test("cached module catalog retains current recommendations", async () => {
    const token = issueAccessToken("admin-user", "admin", 60);
    const route = createModuleRoutes(
        { list: async () => [] } as any,
        undefined,
        undefined,
        {
            listRecommendedModuleUuids: async () => ["recommended-uuid"],
            listCachedModules: async () => [
                { id: "recommended", uuid: "recommended-uuid" },
                { id: "ordinary", uuid: "ordinary-uuid" },
            ],
        } as any,
    );
    let body = "";
    await route(
        {
            method: "GET",
            headers: { authorization: `Bearer ${token}` },
        } as any,
        {
            writeHead() {},
            end(payload: string) {
                body = payload;
            },
        } as any,
        new URL("http://localhost/api/v1/modules/catalog"),
    );
    const modules = JSON.parse(body).data;
    assert.equal(modules[0].recommended, true);
    assert.equal(modules[1].recommended, false);
});

test("module catalog returns persisted discoveries without refreshing sources", async () => {
    let discoveryCalled = false;
    const route = createModuleRoutes(
        { list: async () => [] } as any,
        undefined,
        undefined,
        {
            listRecommendedModuleUuids: async () => [],
            listCachedModules: async () => [
                {
                    id: "example-module",
                    uuid: "f055f2e5-227a-5fb4-b934-5397ec32cf2d",
                },
            ],
            discover: async () => {
                discoveryCalled = true;
                return [];
            },
        } as any,
    );
    const token = issueAccessToken("admin-user", "admin", 60);
    let body = "";
    await route(
        {
            method: "GET",
            headers: { authorization: `Bearer ${token}` },
        } as any,
        {
            writeHead() {},
            end(payload: string) {
                body = payload;
            },
        } as any,
        new URL("http://localhost/api/v1/modules/catalog"),
    );
    assert.match(body, /example-module/);
    assert.equal(discoveryCalled, false);
});

test("module catalog serves localized strings before module installation", async () => {
    const moduleUuid = "f055f2e5-227a-5fb4-b934-5397ec32cf2d";
    const stringAssetId = "a".repeat(64);
    const marketplace = {
        listCachedModules: async () => [
            {
                id: "example-module",
                uuid: moduleUuid,
                ui: { stringsBaseUrl: "/static/modules/example/languages" },
                assetIds: { strings: { en: stringAssetId } },
            },
        ],
        getAsset: async (id: string) =>
            id === stringAssetId
                ? {
                      body: Buffer.from(
                          '<resources><string name="module.example.name">Example</string></resources>',
                      ),
                      contentType: "application/xml",
                  }
                : undefined,
    } as any;
    const route = createModuleRoutes(
        { list: async () => [] } as any,
        undefined,
        undefined,
        marketplace,
    );
    const token = issueAccessToken("admin-user", "admin", 60);
    let status = 0;
    let body = "";
    await route(
        {
            method: "GET",
            headers: { authorization: `Bearer ${token}` },
        } as any,
        {
            writeHead(code: number) {
                status = code;
            },
            end(payload: Buffer) {
                body = payload.toString();
            },
        } as any,
        new URL(
            `http://localhost/api/v1/modules/catalog/strings/${moduleUuid}/en/strings.xml`,
        ),
    );
    assert.equal(status, 200);
    assert.match(body, />Example</);
});

test("module marketplace install forwards the selected branch", async () => {
    const token = issueAccessToken("admin-user", "admin", 60);
    let installedBranch = "";
    let validatedRequires: string[] = [];
    const route = createModuleRoutes(
        { list: async () => [] } as any,
        {
            validateInstallDependencies: async (manifest) => {
                validatedRequires = manifest.requires ?? [];
            },
        },
        undefined,
        {
            install: async (_module, _token, branch, validateDependencies) => {
                installedBranch = branch;
                const manifest = {
                    id: "notes",
                    uuid: "module-uuid",
                    requires: ["338b9237-a2c8-5bcf-9437-bccc9abd9a27"],
                };
                await validateDependencies(manifest);
                return manifest;
            },
        } as any,
    );
    let status = 0;
    await route(
        {
            method: "POST",
            headers: { authorization: `Bearer ${token}` },
            async *[Symbol.asyncIterator]() {
                yield Buffer.from(
                    JSON.stringify({
                        module: { id: "notes" },
                        branch: "preview",
                    }),
                );
            },
        } as any,
        {
            writeHead(code: number) {
                status = code;
            },
            end() {},
        } as any,
        new URL("http://localhost/api/v1/modules/install"),
    );
    assert.equal(status, 202);
    assert.equal(installedBranch, "preview");
    assert.deepEqual(validatedRequires, [
        "338b9237-a2c8-5bcf-9437-bccc9abd9a27",
    ]);
});

test("module marketplace persists a selected release channel", async () => {
    const token = issueAccessToken("admin-user", "admin", 60);
    let selectedModuleUuid = "";
    let selectedBranch = "";
    const route = createModuleRoutes(
        { list: async () => [] } as any,
        {},
        undefined,
        {
            saveSelectedBranch: async (moduleUuid: string, branch: string) => {
                selectedModuleUuid = moduleUuid;
                selectedBranch = branch;
            },
        } as any,
    );
    let status = 0;
    await route(
        {
            method: "PUT",
            headers: { authorization: `Bearer ${token}` },
            async *[Symbol.asyncIterator]() {
                yield Buffer.from(JSON.stringify({ branch: "preview" }));
            },
        } as any,
        {
            writeHead(code: number) {
                status = code;
            },
            end() {},
        } as any,
        new URL("http://localhost/api/v1/modules/catalog/module-uuid/channel"),
    );
    assert.equal(status, 204);
    assert.equal(selectedModuleUuid, "module-uuid");
    assert.equal(selectedBranch, "preview");
});

test("module marketplace reports and logs installation failures", async () => {
    const token = issueAccessToken("admin-user", "admin", 60);
    const entries: Array<{ message: string; meta?: Record<string, unknown> }> =
        [];
    const route = createModuleRoutes(
        { list: async () => [] } as any,
        {
            log: (_level, message, meta) => entries.push({ message, meta }),
        },
        undefined,
        {
            install: async () => {
                throw new Error("manifest checksum mismatch");
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
                        module: { uuid: "module-uuid" },
                        branch: "main",
                    }),
                );
            },
        } as any,
        {
            writeHead(code: number) {
                status = code;
            },
            end(payload: string) {
                responseBody = payload;
            },
        } as any,
        new URL("http://localhost/api/v1/modules/install"),
    );
    assert.equal(status, 202);
    const jobId = JSON.parse(responseBody).data.jobId;
    await new Promise((resolve) => setImmediate(resolve));
    await route(
        {
            method: "GET",
            headers: { authorization: `Bearer ${token}` },
        } as any,
        {
            writeHead(code: number) {
                status = code;
            },
            end(payload: string) {
                responseBody = payload;
            },
        } as any,
        new URL(`http://localhost/api/v1/modules/install/${jobId}`),
    );
    assert.equal(status, 422);
    assert.doesNotMatch(responseBody, /manifest checksum mismatch/);
    assert.match(responseBody, /Module installation failed\./);
    assert.deepEqual(entries, [
        {
            message: "External module installation failed.",
            meta: {
                component: "api-modules",
                method: "POST",
                path: "/api/v1/modules/install",
                accountId: "admin-user",
                moduleUuid: "module-uuid",
                error: "manifest checksum mismatch",
            },
        },
    ]);
});

test("module marketplace identifies GitHub connection timeouts in jobs and logs", async () => {
    const token = issueAccessToken("admin-user", "admin", 60);
    const entries: Array<{ meta?: Record<string, unknown> }> = [];
    const route = createModuleRoutes(
        { list: async () => [] } as any,
        {
            log: (_level, _message, meta) => entries.push({ meta }),
        },
        undefined,
        {
            install: async () => {
                const error = new Error("git clone timed out");
                (error as Error & { code?: string }).code =
                    "github_connection_timeout";
                throw error;
            },
        } as any,
    );
    let responseBody = "";
    const response = {
        writeHead() {},
        end(payload: string) {
            responseBody = payload;
        },
    } as any;
    await route(
        {
            method: "POST",
            headers: { authorization: `Bearer ${token}` },
            async *[Symbol.asyncIterator]() {
                yield Buffer.from(
                    JSON.stringify({ module: { uuid: "module-uuid" } }),
                );
            },
        } as any,
        response,
        new URL("http://localhost/api/v1/modules/install"),
    );
    const jobId = JSON.parse(responseBody).data.jobId;
    await new Promise((resolve) => setImmediate(resolve));
    await route(
        {
            method: "GET",
            headers: { authorization: `Bearer ${token}` },
        } as any,
        response,
        new URL(`http://localhost/api/v1/modules/install/${jobId}`),
    );

    assert.match(responseBody, /github_connection_timeout/);
    assert.equal(entries[0].meta?.knownCause, "container_network_mtu");
});

test("module updates report that a container restart is required", async () => {
    const token = issueAccessToken("admin-user", "admin", 60);
    const moduleUuid = "94d6974b-d836-4653-af9b-8b68774f4458";
    let responseBody = "";
    const route = createModuleRoutes(
        {
            list: async () => [
                { id: "meetings", uuid: moduleUuid, class: "extension" },
            ],
        } as any,
        {
            getStatus: () => "disabled",
            onImported: async () => {},
        },
        undefined,
        {
            install: async () => ({
                id: "meetings",
                uuid: moduleUuid,
                class: "extension",
                version: "2.0.0",
            }),
        } as any,
    );
    const response = {
        writeHead() {},
        end(payload: string) {
            responseBody = payload;
        },
    } as any;
    await route(
        {
            method: "POST",
            headers: { authorization: `Bearer ${token}` },
            async *[Symbol.asyncIterator]() {
                yield Buffer.from(
                    JSON.stringify({
                        module: { uuid: moduleUuid },
                        wasEnabled: true,
                    }),
                );
            },
        } as any,
        response,
        new URL("http://localhost/api/v1/modules/install"),
    );
    const jobId = JSON.parse(responseBody).data.jobId;
    await new Promise((resolve) => setImmediate(resolve));
    await route(
        {
            method: "GET",
            headers: { authorization: `Bearer ${token}` },
        } as any,
        response,
        new URL(`http://localhost/api/v1/modules/install/${jobId}`),
    );

    assert.equal(JSON.parse(responseBody).data.data.restartRequired, true);
});

test("module catalog serves cached images from the same origin", async () => {
    const token = issueAccessToken("u1", "admin", 60);
    const assetId = "a".repeat(64);
    const route = createModuleRoutes(
        { list: async () => [] } as any,
        undefined,
        undefined,
        {
            getAsset: (id) =>
                id === assetId
                    ? {
                          body: Buffer.from("<svg/>", "utf8"),
                          contentType: "image/svg+xml",
                      }
                    : undefined,
        } as any,
    );
    let status = 0;
    let contentType = "";
    let body = "";
    await route(
        {
            method: "GET",
            headers: { authorization: `Bearer ${token}` },
        } as any,
        {
            writeHead(code: number, headers: Record<string, string>) {
                status = code;
                contentType = headers["content-type"];
            },
            end(value: Buffer) {
                body = value.toString("utf8");
            },
        } as any,
        new URL(`http://localhost/api/v1/modules/catalog/assets/${assetId}`),
    );
    assert.equal(status, 200);
    assert.equal(contentType, "image/svg+xml");
    assert.equal(body, "<svg/>");
});

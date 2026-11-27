import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm as removePath } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { ModuleMarketplaceService, type ModuleSource } from "../../../index.js";
import { createSecretContext } from "./fixtures/encryption.js";

const original: ModuleSource = {
    uuid: "6931e77f-f740-4db7-9f7c-5809f44255ee",
    name: "Original source",
    provider: "github",
    namespace: "example",
    baseUrl: "https://old.example.test/api/v3",
};

async function fixture(
    testContext: TestContext,
    source = original,
    cloneUrl = "https://old.example.test/example/module.git",
    token?: string,
) {
    const directory = await mkdtemp(
        path.join(tmpdir(), "cognis-install-binding-"),
    );
    testContext.after(() =>
        removePath(directory, { recursive: true, force: true }),
    );
    const { ctx } = createSecretContext();
    const service = new ModuleMarketplaceService(
        path.join(directory, "sources.json"),
        path.join(directory, "modules"),
        undefined,
        ctx,
    );
    await service.saveSource(source, token ? { token } : {});
    const module = {
        uuid: "71567e48-480a-45a5-a853-8c96d6ab9973",
        sourceUuid: source.uuid,
        cloneUrl,
        defaultBranch: "main",
        branches: [],
        releases: [],
    };
    const cache = path.join(directory, "modules", ".cache");
    await mkdir(cache, { recursive: true });
    await writeFile(path.join(cache, "catalog.json"), JSON.stringify([module]));
    return { ctx, service, module: (await service.listCachedModules())[0] };
}

for (const change of [
    { baseUrl: "https://replacement.example.test/api/v3" },
    { namespace: "replacement" },
    { provider: "gitlab" as const },
])
    test(`installation rejects concurrent credential rebinding (${Object.keys(change)[0]})`, async (testContext) => {
        testContext.mock.method(globalThis, "fetch", async () =>
            Response.json([]),
        );
        const { ctx, service, module } = await fixture(
            testContext,
            original,
            undefined,
            "original-test-PAT",
        );
        let reads = 0;
        let replaced = false;
        ctx.flow.extend(
            "modules:sources:read",
            "present",
            { id: "test:concurrentAdmin", order: 100 },
            async () => {
                // Installation first filters its cached catalog, then reads the source to validate checkout.
                if (++reads !== 2) return;
                replaced = true;
                await service.saveSource(
                    { ...original, ...change },
                    { token: "replacement-test-PAT" },
                );
            },
        );
        await assert.rejects(
            service.install(module, "main"),
            /module_source_credential_scope_changed/,
        );
        assert.equal(replaced, true);
    });

test("GitLab sources cannot use the GitHub API-to-repository host alias", async (testContext) => {
    const { service, module } = await fixture(
        testContext,
        { ...original, provider: "gitlab", baseUrl: "https://api.github.com" },
        "https://github.com/example/module.git",
    );
    await assert.rejects(
        service.install(module, "main"),
        /module_source_repository_mismatch/,
    );
});

test("GitLab installation validates namespace within the configured deployment prefix", async (testContext) => {
    const root = await mkdtemp(path.join(tmpdir(), "cognis-gitlab-prefix-"));
    testContext.after(() => removePath(root, { recursive: true, force: true }));
    const modulesRoot = path.join(root, "modules");
    const service = new ModuleMarketplaceService(
        path.join(root, "sources.json"),
        modulesRoot,
    );
    await service.saveSource({
        ...original,
        provider: "gitlab",
        baseUrl: "https://example.test/gitlab/api/v4",
        namespace: "team/subgroup",
    });
    const cache = path.join(modulesRoot, ".cache");
    await mkdir(cache, { recursive: true });
    for (const [cloneUrl, expected] of [
        [
            "https://example.test/gitlab/team/subgroup/module.git",
            /invalid_module_branch/,
        ],
        [
            "https://example.test/team/subgroup/module.git",
            /module_source_repository_mismatch/,
        ],
        [
            "https://example.test/gitlab/team/other/module.git",
            /module_source_repository_mismatch/,
        ],
        [
            "https://other.test/gitlab/team/subgroup/module.git",
            /module_source_repository_mismatch/,
        ],
    ] as const) {
        const module = {
            uuid: "71567e48-480a-45a5-a853-8c96d6ab9973",
            sourceUuid: original.uuid,
            cloneUrl,
            defaultBranch: "main",
            branches: [],
            releases: [],
        };
        await writeFile(
            path.join(cache, "catalog.json"),
            JSON.stringify([module]),
        );
        const catalog = await service.listCachedModules();
        assert.equal(catalog.length, 1);
        await assert.rejects(service.install(catalog[0], "main"), expected);
    }
});

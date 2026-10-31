import test, { type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
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
    t: TestContext,
    source = original,
    cloneUrl = "https://old.example.test/example/module.git",
    token?: string,
) {
    const directory = await mkdtemp(
        path.join(tmpdir(), "cognis-install-binding-"),
    );
    t.after(() => rm(directory, { recursive: true, force: true }));
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
    test(`installation rejects concurrent credential rebinding (${Object.keys(change)[0]})`, async (t) => {
        t.mock.method(globalThis, "fetch", async () => Response.json([]));
        const { ctx, service, module } = await fixture(
            t,
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

test("GitLab sources cannot use the GitHub API-to-repository host alias", async (t) => {
    const { service, module } = await fixture(
        t,
        { ...original, provider: "gitlab", baseUrl: "https://api.github.com" },
        "https://github.com/example/module.git",
    );
    await assert.rejects(
        service.install(module, "main"),
        /module_source_repository_mismatch/,
    );
});

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ModuleMarketplaceService } from "../index.js";

const source = {
    uuid: "6931e77f-f740-4db7-9f7c-5809f44255ee",
    name: "Additional source",
    provider: "github" as const,
    namespace: "example",
    baseUrl: "https://api.github.com",
};

test("module marketplace persists source metadata without PAT values", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cognis-marketplace-"));
    const service = new ModuleMarketplaceService(
        path.join(root, "sources.json"),
        path.join(root, "modules"),
    );
    await service.saveSource({ ...source, credentialId: "module-source:pat" });
    assert.deepEqual(await service.listSources(), [
        {
            uuid: "178271bf-5631-40df-82df-967f8a37a020",
            name: "Cognis Labs HQ",
            provider: "github",
            namespace: "Cognis-Labs-HQ",
            baseUrl: "https://api.github.com",
            homepage: "https://github.com/Cognis-Labs-HQ",
            trusted: true,
            credentialId: undefined,
        },
        { ...source, credentialId: "module-source:pat", trusted: false },
    ]);
});

test("module marketplace always provides an immutable trusted source", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cognis-marketplace-"));
    const service = new ModuleMarketplaceService(
        path.join(root, "sources.json"),
        path.join(root, "modules"),
    );
    const [trusted] = await service.listSources();
    assert.equal(trusted.namespace, "Cognis-Labs-HQ");
    assert.equal(trusted.trusted, true);
    await assert.rejects(
        service.removeSource(trusted.uuid),
        /trusted_module_source_readonly/,
    );
});

test("module marketplace discovers repository manifests", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cognis-marketplace-"));
    const service = new ModuleMarketplaceService(
        path.join(root, "sources.json"),
        path.join(root, "modules"),
    );
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input) =>
        String(input).endsWith("/README.md")
            ? new Response("# Notes\nA useful module.")
            : String(input).includes("/repos?")
              ? new Response(
                    JSON.stringify([
                        {
                            clone_url: "https://github.com/acme/notes.git",
                            default_branch: "main",
                            full_name: "acme/notes",
                        },
                    ]),
                )
              : new Response(
                    JSON.stringify({
                        uuid: "71567e48-480a-45a5-a853-8c96d6ab9973",
                        id: "notes",
                        name: "Notes",
                        version: "1.0.0",
                        publisher: "Acme",
                        class: "extension",
                        coreApiVersion: "v1",
                        summary: "Notes",
                        description: "Shared notes.",
                        categories: ["Productivity"],
                        tags: ["notes"],
                        recommended: false,
                        license: "MIT",
                        repository: "https://github.com/acme/notes",
                        capabilities: [],
                        entrypoints: { bootstrap: "./bootstrap.js" },
                        assets: {
                            icon: "assets/icon.svg",
                            banner: "assets/banner.svg",
                        },
                    }),
                );
    try {
        const modules = await service.discover();
        assert.equal(modules[0].id, "notes");
        assert.equal(
            modules[0].sourceUuid,
            "178271bf-5631-40df-82df-967f8a37a020",
        );
        assert.equal(
            modules[0].assets?.icon,
            "https://raw.githubusercontent.com/acme/notes/main/assets/icon.svg",
        );
        assert.equal(modules[0].readme, "# Notes\nA useful module.");
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("module marketplace rejects incomplete module registrations", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cognis-marketplace-"));
    const service = new ModuleMarketplaceService(
        path.join(root, "sources.json"),
        path.join(root, "modules"),
    );
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input) =>
        String(input).includes("/repos?")
            ? new Response(
                  JSON.stringify([
                      {
                          clone_url: "https://github.com/acme/incomplete.git",
                          default_branch: "main",
                          full_name: "acme/incomplete",
                      },
                  ]),
              )
            : new Response(JSON.stringify({ id: "incomplete" }));
    try {
        await assert.rejects(service.discover(), /invalid_module_manifest/);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

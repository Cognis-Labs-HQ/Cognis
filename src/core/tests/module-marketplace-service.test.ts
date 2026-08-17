import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ModuleMarketplaceService } from "../index.js";

const source = {
    uuid: "178271bf-5631-40df-82df-967f8a37a020",
    name: "Cognis Labs",
    provider: "github" as const,
    namespace: "Cognis-Labs-HQ",
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
        { ...source, credentialId: "module-source:pat" },
    ]);
});

test("module marketplace discovers repository manifests", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cognis-marketplace-"));
    const service = new ModuleMarketplaceService(
        path.join(root, "sources.json"),
        path.join(root, "modules"),
    );
    await service.saveSource(source);
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
                        class: "extension",
                        coreApiVersion: "v1",
                        capabilities: [],
                        entrypoints: {},
                        assets: {
                            icon: "assets/icon.svg",
                            banner: "assets/banner.svg",
                        },
                    }),
                );
    try {
        const modules = await service.discover();
        assert.equal(modules[0].id, "notes");
        assert.equal(modules[0].sourceUuid, source.uuid);
        assert.equal(
            modules[0].assets?.icon,
            "https://raw.githubusercontent.com/acme/notes/main/assets/icon.svg",
        );
        assert.equal(modules[0].readme, "# Notes\nA useful module.");
    } finally {
        globalThis.fetch = originalFetch;
    }
});

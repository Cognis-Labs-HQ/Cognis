import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { MarketplaceRepository } from "../../services/module-loader/marketplace/repository.js";
import type { ModuleSource } from "../../services/module-loader/marketplace/index.js";
import type { ModuleManifest } from "../../contracts/module-manifest.js";

class TestMarketplaceRepository extends MarketplaceRepository {
    parse(raw: string): ModuleManifest {
        return this.parseManifest(raw);
    }

    cacheStrings(
        source: ModuleSource,
        projectPath: string,
        reference: string,
        assetPath: string,
    ): Promise<string | undefined> {
        return this.cacheRepositoryStringAsset(
            source,
            projectPath,
            reference,
            assetPath,
            {},
        );
    }
}

const validManifest = {
    uuid: "6931e77f-f740-4db7-9f7c-5809f44255ee",
    id: "notes",
    name: "Notes",
    version: "1.0.0",
    publisher: "Cognis",
    class: "extension",
    summary: "Notes module",
    description: "Creates notes.",
    repository: "https://example.com/notes",
    coreApiVersion: "1.0.0",
    capabilities: [],
    categories: ["productivity"],
    tags: ["notes"],
    entrypoints: { bootstrap: "api/index.js" },
    assets: { icon: "icon.svg", banner: "banner.svg" },
};

test("module manifests accept string dependency lists", () => {
    const repository = new TestMarketplaceRepository("sources.json", "modules");
    const manifest = repository.parse(
        JSON.stringify({
            ...validManifest,
            hardDependencies: ["calendar"],
            softDependencies: ["tasks"],
        }),
    );
    assert.deepEqual(manifest.hardDependencies, ["calendar"]);
    assert.deepEqual(manifest.softDependencies, ["tasks"]);
});

test("module manifests reject malformed dependency lists", () => {
    const repository = new TestMarketplaceRepository("sources.json", "modules");
    for (const hardDependencies of ["calendar", [""], [3]]) {
        assert.throws(
            () =>
                repository.parse(
                    JSON.stringify({ ...validManifest, hardDependencies }),
                ),
            /invalid_module_manifest/,
        );
    }
});

test("public GitHub strings use the raw content endpoint", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cognis-strings-"));
    const repository = new TestMarketplaceRepository(
        path.join(root, "sources.json"),
        path.join(root, "modules"),
    );
    const originalFetch = globalThis.fetch;
    let requestedUrl = "";
    globalThis.fetch = async (input) => {
        requestedUrl = String(input);
        return new Response(
            '<resources><string name="module.notes.name">Notes</string></resources>',
        );
    };

    try {
        const assetId = await repository.cacheStrings(
            {
                uuid: "6931e77f-f740-4db7-9f7c-5809f44255ee",
                name: "Public modules",
                provider: "github",
                namespace: "example",
                baseUrl: "https://api.github.com",
            },
            "example/notes",
            "main",
            "ui/languages/en/strings.xml",
        );
        assert.equal(
            requestedUrl,
            "https://raw.githubusercontent.com/example/notes/main/ui/languages/en/strings.xml",
        );
        assert.match(assetId ?? "", /^[a-f0-9]{64}$/);
        assert.match(
            await readFile(
                path.join(root, "modules/.cache/assets", assetId ?? ""),
                "utf8",
            ),
            /module\.notes\.name/,
        );
    } finally {
        globalThis.fetch = originalFetch;
        await rm(root, { recursive: true, force: true });
    }
});

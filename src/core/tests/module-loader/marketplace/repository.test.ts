import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { MarketplaceRepository } from "../../../services/module-loader/marketplace/repository.js";
import type { ModuleSource } from "../../../services/module-loader/marketplace/index.js";
import type { ModuleManifest } from "../../../contracts/module-manifest.js";

class TestMarketplaceRepository extends MarketplaceRepository {
    cacheAsset(
        source: ModuleSource,
        assetPath: string,
        headers: Record<string, string> = {},
    ): Promise<string | undefined> {
        return this.cacheRepositoryAsset(
            source,
            "example/notes",
            "feature/artwork",
            assetPath,
            headers,
        );
    }

    parse(raw: string): ModuleManifest {
        return this.parseManifest(raw);
    }

    cacheStrings(
        source: ModuleSource,
        projectPath: string,
        reference: string,
        assetPath: string,
    ): Promise<string | undefined> {
        return this.cacheRepositoryAsset(
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

const githubSource: ModuleSource = {
    uuid: "6931e77f-f740-4db7-9f7c-5809f44255ee",
    name: "Modules",
    provider: "github",
    namespace: "example",
    baseUrl: "https://api.github.com",
};

for (const privateRepository of [false, true]) {
    test(`large GitHub artwork is cached from raw bytes (private: ${privateRepository})`, async (context) => {
        const root = await mkdtemp(path.join(os.tmpdir(), "cognis-artwork-"));
        context.after(() => rm(root, { recursive: true, force: true }));
        const repository = new TestMarketplaceRepository("sources.json", root);
        const body = Buffer.alloc(1300000, 42);
        context.mock.method(globalThis, "fetch", async (input, init) => {
            const url = String(input);
            if (privateRepository) {
                const endpoint = new URL(url);
                assert.equal(endpoint.origin, "https://api.github.com");
                assert.equal(
                    endpoint.pathname,
                    "/repos/example/notes/contents/assets/banner.png",
                );
                assert.equal(
                    new Headers(init?.headers).get("authorization"),
                    "Bearer test-token",
                );
                assert.equal(
                    new Headers(init?.headers).get("accept"),
                    "application/vnd.github.raw+json",
                );
            } else {
                assert.equal(
                    url,
                    "https://raw.githubusercontent.com/example/notes/feature%2Fartwork/assets/banner.png",
                );
                assert.equal(
                    new Headers(init?.headers).get("authorization"),
                    null,
                );
            }
            return new Response(body, {
                headers: { "content-type": "application/octet-stream" },
            });
        });
        const assetId = await repository.cacheAsset(
            { ...githubSource, scanPrivateRepos: privateRepository },
            "assets/banner.png",
            {
                Authorization: "Bearer test-token",
                accept: "application/vnd.github+json",
            },
        );
        assert.match(assetId ?? "", /^[a-f0-9]{64}$/);
        assert.deepEqual(
            await readFile(path.join(root, ".cache/assets", assetId!)),
            body,
        );
        assert.deepEqual(
            JSON.parse(
                await readFile(
                    path.join(root, ".cache/assets", `${assetId}.json`),
                    "utf8",
                ),
            ),
            { contentType: "image/png" },
        );
    });
}

for (const failure of ["http", "empty", "size", "network"] as const) {
    test(`asset retrieval reports ${failure} failures without caching invalid content`, async (context) => {
        const logs: Array<Record<string, unknown>> = [];
        const repository = new TestMarketplaceRepository(
            "sources.json",
            "/unused",
            (_level, _message, metadata) => logs.push(metadata ?? {}),
        );
        context.mock.method(globalThis, "fetch", async () => {
            if (failure === "network") throw new Error("network_unreachable");
            if (failure === "http") return new Response("", { status: 404 });
            if (failure === "size")
                return new Response(Buffer.alloc(10 * 1024 * 1024 + 1));
            return new Response("");
        });
        assert.equal(
            await repository.cacheAsset(githubSource, "assets/banner.png"),
            undefined,
        );
        assert.equal(logs.length, 1);
        assert.equal(logs[0].assetPath, "assets/banner.png");
        assert.equal(
            logs[0].reason,
            {
                http: "asset_http_error",
                empty: "asset_empty",
                size: "asset_too_large",
                network: "network_unreachable",
            }[failure],
        );
        if (failure === "http") assert.equal(logs[0].status, 404);
    });
}

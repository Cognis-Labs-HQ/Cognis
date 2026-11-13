import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ModuleMarketplaceService } from "../../../index.js";

test("module marketplace removes cached modules when a successful scan returns no repositories", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cognis-marketplace-"));
    const statePath = path.join(root, "sources.json");
    await mkdir(path.join(root, "modules", ".cache"), { recursive: true });
    await writeFile(
        path.join(root, "modules", ".cache", "catalog.json"),
        JSON.stringify([
            {
                uuid: "71567e48-480a-45a5-a853-8c96d6ab9973",
                id: "notes",
                sourceUuid: "178271bf-5631-40df-82df-967f8a37a020",
                cloneUrl: "https://github.com/acme/notes.git",
            },
        ]),
    );
    const service = new ModuleMarketplaceService(
        statePath,
        path.join(root, "modules"),
    );
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response("[]");
    try {
        assert.deepEqual(await service.discover(), []);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("module marketplace keeps cached repositories whose refresh is inconclusive", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cognis-marketplace-"));
    const statePath = path.join(root, "sources.json");
    const service = new ModuleMarketplaceService(
        statePath,
        path.join(root, "modules"),
    );
    await mkdir(path.join(root, "modules", ".cache"), { recursive: true });
    await writeFile(
        path.join(root, "modules", ".cache", "catalog.json"),
        JSON.stringify([
            {
                uuid: "71567e48-480a-45a5-a853-8c96d6ab9973",
                id: "notes",
                sourceUuid: "178271bf-5631-40df-82df-967f8a37a020",
                cloneUrl: "https://github.com/acme/notes.git",
            },
        ]),
    );
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input) =>
        String(input).includes("/repos?")
            ? new Response(
                  JSON.stringify([
                      {
                          clone_url: "https://github.com/acme/notes.git",
                          default_branch: "main",
                          full_name: "acme/notes",
                      },
                  ]),
              )
            : new Response("provider error", { status: 500 });
    try {
        assert.equal((await service.discover())[0].id, "notes");
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("empty cached artwork is unavailable and logs its asset identity", async (context) => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cognis-empty-artwork-"));
    context.after(() => rm(root, { recursive: true, force: true }));
    const logs: Array<Record<string, unknown>> = [];
    const service = new ModuleMarketplaceService(
        "sources.json",
        root,
        (_level, _message, metadata) => logs.push(metadata ?? {}),
    );
    const assetId = "a".repeat(64);
    await mkdir(path.join(root, ".cache/assets"), { recursive: true });
    await writeFile(path.join(root, ".cache/assets", assetId), "");
    await writeFile(
        path.join(root, ".cache/assets", `${assetId}.json`),
        JSON.stringify({ contentType: "image/png" }),
    );
    assert.equal(await service.getAsset(assetId), undefined);
    assert.equal(logs[0].reason, "asset_empty");
    assert.equal(logs[0].assetId, assetId);
    logs.length = 0;
    const missingId = "b".repeat(64);
    assert.equal(await service.getAsset(missingId), undefined);
    assert.equal(logs[0].reason, "ENOENT");
    assert.equal(logs[0].assetId, missingId);
});

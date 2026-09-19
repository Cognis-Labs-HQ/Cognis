import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ModuleMarketplaceService } from "../../index.js";

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

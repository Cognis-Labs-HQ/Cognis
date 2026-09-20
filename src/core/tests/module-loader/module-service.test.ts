import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ModuleService, type ModuleRuntimeGateway } from "../../index.js";

function runtime(manifests: any[]): ModuleRuntimeGateway {
    return {
        async listManifests() {
            return manifests;
        },
        async installFromZip() {
            return (
                manifests[0] ?? {
                    id: "imported",
                    name: "Imported",
                    version: "1.0.0",
                    class: "extension",
                    coreApiVersion: "v1",
                    capabilities: [],
                    entrypoints: {},
                }
            );
        },
        async enable(moduleId: string) {
            return { moduleId, enabled: true };
        },
        async disable(moduleId: string) {
            return { moduleId, enabled: false };
        },
    };
}

test("module import rejects non-github URLs", async () => {
    const service = new ModuleService(runtime([]));
    await assert.rejects(() =>
        service.importFromGithub({
            repositoryUrl: "https://example.com/acme/mod",
            versionTag: "v1.0.0",
        }),
    );
});

test("module import passes downloaded archive to runtime", async () => {
    const expectedManifest = {
        id: "imported-mod",
        name: "Imported",
        version: "1.0.0",
        class: "extension",
        coreApiVersion: "v1",
        capabilities: [],
        entrypoints: {},
    };
    const captured: Uint8Array[] = [];
    const service = new ModuleService({
        async listManifests() {
            return [];
        },
        async installFromZip(binary: Uint8Array) {
            captured.push(binary);
            return expectedManifest as any;
        },
        async enable(moduleId: string) {
            return { moduleId, enabled: true };
        },
        async disable(moduleId: string) {
            return { moduleId, enabled: false };
        },
    });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
        new Response(new Uint8Array([1, 2, 3]), {
            status: 200,
            headers: { "content-type": "application/gzip" },
        })) as any;
    try {
        const manifest = await service.importFromGithub({
            repositoryUrl: "https://github.com/Cognis-Labs-HQ/Cognis",
            versionTag: "v1.0.0",
        });
        assert.equal(manifest.id, "imported-mod");
        assert.equal(captured.length, 1);
        assert.equal(captured[0].length, 3);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("module service enables extension modules", async () => {
    const service = new ModuleService(
        runtime([
            {
                id: "notes",
                name: "Notes",
                version: "1.0.0",
                class: "extension",
                coreApiVersion: "v1",
                capabilities: [],
                entrypoints: {},
            },
        ]),
    );
    const result = await service.enable("notes");
    assert.equal(result.enabled, true);
});

test("module service blocks toggling core modules", async () => {
    const service = new ModuleService(
        runtime([
            {
                id: "auth-core",
                name: "Auth Core",
                version: "1.0.0",
                class: "core",
                coreApiVersion: "v1",
                capabilities: [],
                entrypoints: {},
            },
        ]),
    );
    await assert.rejects(() => service.enable("auth-core"));
});

test("external modules require disclaimer acknowledgement", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cognis-modules-"));
    const externalModulesPath = path.join(root, "external");
    const enabledPointersPath = path.join(root, "enabled.d");
    await mkdir(externalModulesPath, { recursive: true });
    await writeFile(
        path.join(externalModulesPath, "weather-pack.zip"),
        "dummy",
    );

    const service = new ModuleService(
        runtime([
            {
                id: "weather-pack",
                name: "Weather",
                version: "1.0.0",
                class: "extension",
                coreApiVersion: "v1",
                capabilities: [],
                entrypoints: {},
            },
        ]),
        { externalModulesPath, enabledPointersPath },
    );

    await assert.rejects(() => service.enable("weather-pack"));
    const enabled = await service.enable("weather-pack", {
        acknowledgeExternalDisclaimer: true,
    });
    assert.equal(enabled.enabled, true);
});

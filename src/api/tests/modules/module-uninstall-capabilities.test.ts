import test from "node:test";
import assert from "node:assert/strict";
import { copyFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createCtx, type ModuleRuntimeGateway } from "@cognis/core";
import { createModuleExtensionRoutes } from "../../reuse/module-extension-routes.js";
import { createDefaultRouteContext } from "../../reuse/route-context.js";

test("disabled language modules resolve live public cleanup capabilities on uninstall", async (context) => {
    const modulesRoot = await mkdtemp(
        path.join(tmpdir(), "cognis-uninstall-public-"),
    );
    const previousRoot = process.env.COGNIS_EXTERNAL_MODULES_ROOT;
    process.env.COGNIS_EXTERNAL_MODULES_ROOT = modulesRoot;
    context.after(async () => {
        if (previousRoot === undefined)
            delete process.env.COGNIS_EXTERNAL_MODULES_ROOT;
        else process.env.COGNIS_EXTERNAL_MODULES_ROOT = previousRoot;
        await rm(modulesRoot, { recursive: true, force: true });
    });
    const manifests = [
        {
            id: "study-language-ja",
            uuid: "e905927f-b133-572a-92ce-2ea8645e5ceb",
        },
        {
            id: "study-language-en",
            uuid: "b1adc29f-9d54-5785-9bea-2ce76f1981e4",
        },
    ].map((identity) => ({
        ...identity,
        name: identity.id,
        version: "1.0.0",
        class: "extension" as const,
        coreApiVersion: "0.5.2",
        capabilities: [],
        entrypoints: { bootstrap: "./bootstrap.mjs" },
    }));
    for (const manifest of manifests) {
        const moduleRoot = path.join(modulesRoot, manifest.uuid);
        await mkdir(moduleRoot);
        await copyFile(
            new URL("./fixtures/uninstall-provider.mjs", import.meta.url),
            path.join(moduleRoot, "bootstrap.mjs"),
        );
    }
    const system = createCtx();
    system.contributeCapability("host:private", { sensitive: true });
    const direct = new Map<string, unknown>([
        ["system:ctx", system],
        ["db:executor", {}],
    ]);
    const runtime: ModuleRuntimeGateway = {
        listManifests: async () => manifests,
        installFromZip: async () => {
            throw new Error("unused");
        },
        enable: async (moduleId) => ({ moduleId, enabled: true }),
        disable: async (moduleId) => ({ moduleId, enabled: false }),
    };
    const extensions = createModuleExtensionRoutes(
        runtime,
        () => false,
        undefined,
        {
            routeContext: createDefaultRouteContext({
                getCapability: <T>(id: string) =>
                    direct.get(id) as T | undefined,
            }),
        },
    );
    await extensions.refresh();
    const removed: string[] = [];
    for (const manifest of manifests) {
        assert.equal(
            await extensions.uninstall(manifest.id, { deleteContent: false }),
            true,
        );
        await assert.rejects(
            extensions.uninstall(manifest.id, { deleteContent: true }),
            /study_library_cleanup_unavailable/,
        );
    }
    system.contributePublicCapability("study:library:provider", {
        async deleteContentPack() {
            throw new Error("cleanup_failed");
        },
    });
    await assert.rejects(
        extensions.uninstall(manifests[0].id, { deleteContent: true }),
        /cleanup_failed/,
    );
    system.removeCapability("study:library:provider");
    system.contributePublicCapability("study:library:provider", {
        async deleteContentPack(root: string) {
            removed.push(root);
        },
    });
    for (const manifest of manifests) {
        assert.equal(
            await extensions.uninstall(manifest.id, { deleteContent: false }),
            true,
        );
        assert.equal(removed.length, manifests.indexOf(manifest));
        assert.equal(
            await extensions.uninstall(manifest.id, { deleteContent: true }),
            true,
        );
    }
    assert.deepEqual(
        removed,
        manifests.map((manifest) =>
            path.join(modulesRoot, manifest.uuid, "data", "library"),
        ),
    );
});

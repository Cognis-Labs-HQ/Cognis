import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ModuleService, type ModuleRuntimeGateway } from "../index.js";

function runtime(manifests: any[]): ModuleRuntimeGateway {
    return {
        async listManifests() {
            return manifests;
        },
        async installFromZip() {
            throw new Error("not used");
        },
        async enable(moduleId: string) {
            return { moduleId, enabled: true };
        },
        async disable(moduleId: string) {
            return { moduleId, enabled: false };
        },
    };
}

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

test("module lifecycle writes nginx-style pointer for internal modules", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cognis-modules-"));
    const internalModulesPath = path.join(root, "internal");
    const externalModulesPath = path.join(root, "external");
    const enabledPointersPath = path.join(root, "enabled.d");
    await mkdir(path.join(internalModulesPath, "analytics"), {
        recursive: true,
    });

    const service = new ModuleService(
        runtime([
            {
                id: "analytics",
                name: "Analytics",
                version: "1.0.0",
                class: "extension",
                coreApiVersion: "v1",
                capabilities: [],
                entrypoints: {},
            },
        ]),
        { internalModulesPath, externalModulesPath, enabledPointersPath },
    );

    await service.enable("analytics");
    const target = await readlink(
        path.join(enabledPointersPath, "analytics.load"),
    );
    assert.match(target, /analytics$/);

    const disabled = await service.disable("analytics");
    assert.equal(disabled.enabled, false);
});

test("external modules require disclaimer acknowledgement", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cognis-modules-"));
    const internalModulesPath = path.join(root, "internal");
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
        { internalModulesPath, externalModulesPath, enabledPointersPath },
    );

    await assert.rejects(() => service.enable("weather-pack"));
    const enabled = await service.enable("weather-pack", {
        acknowledgeExternalDisclaimer: true,
    });
    assert.equal(enabled.enabled, true);
});

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import type { ModuleManifest } from "../contracts/module-manifest.js";
import { validateModuleRepository } from "../services/module-repository-validator.js";

const REPOSITORY_ROOT = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../..",
);

async function createRepository(): Promise<{
    root: string;
    manifest: ModuleManifest;
}> {
    const root = await mkdtemp(
        path.join(tmpdir(), "cognis-module-repository-"),
    );
    await mkdir(path.join(root, "assets"));
    await mkdir(path.join(root, "api"));
    await writeFile(
        path.join(root, "package.json"),
        JSON.stringify({ name: "example", version: "1.0.0", type: "module" }),
    );
    await writeFile(path.join(root, "routes.json"), "[]");
    await writeFile(path.join(root, "api/index.js"), "export default {};\n");
    await writeFile(
        path.join(root, "bootstrap.js"),
        "export function bootstrapModule() {}\n",
    );
    await writeFile(path.join(root, "assets/icon.svg"), "<svg/>\n");
    await writeFile(path.join(root, "assets/banner.png"), "banner\n");
    const apiDigest = createHash("sha256")
        .update("export default {};\n")
        .digest("hex");
    return {
        root,
        manifest: {
            uuid: "40cafc3c-85e7-4d99-b6e9-70ab9e1238b0",
            id: "example",
            name: "Example",
            version: "1.0.0",
            class: "extension",
            coreApiVersion: "v1",
            capabilities: [],
            entrypoints: {
                bootstrap: "./bootstrap.js",
                api: "./api/index.js",
            },
            assets: {
                icon: "assets/icon.svg",
                banner: "assets/banner.png",
            },
            files: [{ path: "api/index.js", sha256: apiDigest }],
        },
    };
}

test("module repository validator accepts a portable repository", async () => {
    const fixture = await createRepository();
    try {
        await validateModuleRepository(fixture.root, fixture.manifest);
    } finally {
        await rm(fixture.root, { recursive: true, force: true });
    }
});

test("module repository validator rejects mismatched packages and files", async () => {
    const fixture = await createRepository();
    try {
        await writeFile(
            path.join(fixture.root, "package.json"),
            JSON.stringify({
                name: "example",
                version: "2.0.0",
                type: "module",
            }),
        );
        await assert.rejects(
            validateModuleRepository(fixture.root, fixture.manifest),
            /invalid_module_repository_layout/,
        );
        await writeFile(
            path.join(fixture.root, "package.json"),
            JSON.stringify({
                name: "example",
                version: "1.0.0",
                type: "module",
            }),
        );
        await writeFile(path.join(fixture.root, "api/index.js"), "tampered\n");
        await assert.rejects(
            validateModuleRepository(fixture.root, fixture.manifest),
            /module_file_checksum_mismatch/,
        );
    } finally {
        await rm(fixture.root, { recursive: true, force: true });
    }
});

test("module repository validator requires a root license file when declared", async () => {
    const fixture = await createRepository();
    fixture.manifest.license = "MIT";
    try {
        await assert.rejects(
            validateModuleRepository(fixture.root, fixture.manifest),
            /missing_module_license_file/,
        );
        await writeFile(path.join(fixture.root, "LICENSE"), "MIT\n");
        await validateModuleRepository(fixture.root, fixture.manifest);
    } finally {
        await rm(fixture.root, { recursive: true, force: true });
    }
});

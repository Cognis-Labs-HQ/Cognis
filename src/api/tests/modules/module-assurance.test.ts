import test from "node:test";
import assert from "node:assert/strict";
import {
    assertModuleOwnedCtxRegistration,
    assertModuleOwnedRoute,
    resolveModuleAssurance,
} from "../../reuse/module-assurance.js";
import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const unprivileged = { requested: false, trustedSource: false };
const privileged = { requested: true, trustedSource: false };

test("unprivileged modules can register only within their own namespaces", () => {
    assert.doesNotThrow(() =>
        assertModuleOwnedRoute(
            "/api/v1/modules/example/settings",
            "example",
            unprivileged,
        ),
    );
    assert.doesNotThrow(() =>
        assertModuleOwnedCtxRegistration(
            "example:resolveAccount",
            "example",
            unprivileged,
        ),
    );
    assert.throws(
        () =>
            assertModuleOwnedRoute(
                "/api/v1/modules/another/settings",
                "example",
                unprivileged,
            ),
        /module_privileged_access_required/,
    );
    assert.throws(
        () =>
            assertModuleOwnedCtxRegistration(
                "auth:resolveAccount",
                "example",
                unprivileged,
            ),
        /module_privileged_access_required/,
    );
});

test("privileged modules may request host namespace integrations", () => {
    assert.doesNotThrow(() =>
        assertModuleOwnedRoute(
            "/api/v1/integrations/example",
            "example",
            privileged,
        ),
    );
    assert.doesNotThrow(() =>
        assertModuleOwnedCtxRegistration(
            "auth:resolveAccount",
            "example",
            privileged,
        ),
    );
});

test("module assurance does not verify an incomplete runtime inventory", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "cognis-assurance-"));
    try {
        const bootstrap = "export function bootstrapModule() {}\n";
        const manifest = {
            id: "example",
            uuid: "example-uuid",
            entrypoints: { bootstrap: "bootstrap.js" },
            files: [
                {
                    path: "bootstrap.js",
                    sha256: createHash("sha256")
                        .update(bootstrap)
                        .digest("hex"),
                },
            ],
        };
        const rawManifest = JSON.stringify(manifest);
        await writeFile(path.join(root, "manifest.json"), rawManifest);
        await writeFile(path.join(root, "bootstrap.js"), bootstrap);
        await writeFile(
            path.join(root, "undeclared.js"),
            "export const changed = true;\n",
        );
        await writeFile(
            path.join(root, ".cognis-install.json"),
            JSON.stringify({
                manifestSha256: createHash("sha256")
                    .update(rawManifest)
                    .digest("hex"),
            }),
        );
        assert.equal(
            (await resolveModuleAssurance(manifest, root)).integrity,
            "unverified",
        );
    } finally {
        await rm(root, { recursive: true, force: true });
    }
});

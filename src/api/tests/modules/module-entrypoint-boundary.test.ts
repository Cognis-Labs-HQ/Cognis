import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { validateModuleEntrypointBoundary } from "../../reuse/module-entrypoint-boundary.js";

test("disabled entrypoint validation ignores unrelated module bundles", async () => {
    const moduleRoot = await mkdtemp(path.join(tmpdir(), "cognis-entrypoint-"));
    try {
        const entrypoint = path.join(moduleRoot, "disabled-api.js");
        await writeFile(
            entrypoint,
            `export function registerDisabledApiRoutes(ctx) {
                ctx.registerApiGet("/api/v1/modules/example/config", () => {});
            }`,
        );
        await mkdir(path.join(moduleRoot, "ui"));
        await writeFile(
            path.join(moduleRoot, "ui", "unused-bundle.js"),
            "import ".repeat(1_000_000),
        );
        const startedAt = Date.now();
        await validateModuleEntrypointBoundary(
            moduleRoot,
            entrypoint,
            "example",
        );
        assert.ok(Date.now() - startedAt < 250);
    } finally {
        await rm(moduleRoot, { recursive: true, force: true });
    }
});

test("disabled entrypoint validation follows local server imports", async () => {
    const moduleRoot = await mkdtemp(path.join(tmpdir(), "cognis-entrypoint-"));
    try {
        const entrypoint = path.join(moduleRoot, "disabled-api.js");
        await writeFile(entrypoint, `import "./routes.js";`);
        await writeFile(
            path.join(moduleRoot, "routes.js"),
            `import { createCtx } from "@cognis/core"; export { createCtx };`,
        );
        await assert.rejects(
            validateModuleEntrypointBoundary(moduleRoot, entrypoint, "example"),
            /routes\.js:internal_import:@cognis\/core/,
        );
    } finally {
        await rm(moduleRoot, { recursive: true, force: true });
    }
});

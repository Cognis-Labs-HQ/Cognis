import test from "node:test";
import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

test("a directly registered provider remains a built entry when another entry imports it", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "cognis-build-entry-"));
    try {
        await cp(new URL("./fixtures/ui-build/", import.meta.url), directory, {
            recursive: true,
        });
        await run(
            process.execPath,
            [path.resolve("src/tooling/scripts/build-ui.mjs")],
            { cwd: directory },
        );
        const manifest = JSON.parse(
            await readFile(
                path.join(directory, "dist/ui/asset-manifest.json"),
                "utf8",
            ),
        );
        const providerUrl =
            manifest["/static/adapters/example/sample/provider.js"];
        assert.equal(
            new Set(Object.values(manifest)).size,
            2,
            "the app and registered provider own the two entrypoints; ordinary imports stay bundled",
        );
        assert.match(providerUrl, /^\/assets\/.+\.js$/);
        assert.equal(
            providerUrl,
            manifest["/static/adapters/example/sample/ui/provider.js"],
        );
        const app = await import(
            pathToFileURL(
                path.join(directory, "dist/ui", manifest["/static/app.js"]),
            )
        );
        const provider = await import(
            pathToFileURL(path.join(directory, "dist/ui", providerUrl))
        );
        assert.equal(
            app.mountProvider,
            provider.mountProvider,
            "built consumers share one provider implementation",
        );
        assert.equal(app.helperValue, "bundled dependency");
        const contributions = [];
        provider.mountProvider({
            capabilities: { contribute: (...args) => contributions.push(args) },
        });
        assert.deepEqual(contributions, [["example:value", "ready"]]);
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});

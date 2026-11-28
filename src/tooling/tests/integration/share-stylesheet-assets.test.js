import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { relative, resolve } from "node:path";
import { bootstrap } from "../../../gateways/share/bootstrap.js";
import { sourceFiles } from "../../reuse/component-files.js";
import { createGatewayHost } from "../../reuse/gateway-host.js";

test("registered Share method stylesheets resolve their component assets through their published mount", async (testContext) => {
    const { context } = await createGatewayHost(testContext, [
        ["share", bootstrap],
    ]);
    const mounts = readdirSync(resolve("src/adapters/share"), {
        withFileTypes: true,
    })
        .filter((entry) => entry.isDirectory())
        .map((entry) => ({
            prefix: `/static/adapters/share/${entry.name}/`,
            directory: context.uiRegistry.getAdapterStaticDirectory(
                "share",
                entry.name,
            ),
        }))
        .filter((entry) => entry.directory);
    assert.ok(mounts.length > 0);
    const missing = [];
    for (const mount of mounts) {
        for (const file of sourceFiles(mount.directory).filter((file) =>
            file.endsWith(".css"),
        )) {
            const stylesheet =
                mount.prefix +
                relative(mount.directory, file).replaceAll("\\", "/");
            for (const match of readFileSync(file, "utf8").matchAll(
                /url\(\s*["']?([^"')\s]+)["']?\s*\)/g,
            )) {
                const asset = new URL(
                    match[1],
                    `https://fixture.test${stylesheet}`,
                );
                if (asset.origin !== "https://fixture.test") continue;
                const owner = mounts.find((item) =>
                    asset.pathname.startsWith(item.prefix),
                );
                if (
                    owner &&
                    !existsSync(
                        resolve(
                            owner.directory,
                            asset.pathname.slice(owner.prefix.length),
                        ),
                    )
                )
                    missing.push({ stylesheet, asset: asset.pathname });
            }
        }
    }
    assert.deepEqual(missing, []);
});

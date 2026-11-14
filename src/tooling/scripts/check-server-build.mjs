import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const serverRoot = path.resolve("dist/server");
const serverManifest = JSON.parse(
    await readFile(path.join(serverRoot, "package.json"), "utf8"),
);
assert.equal(
    typeof serverManifest.version,
    "string",
    "compiled server must include the platform manifest for root documentation versioning",
);
async function walk(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    return (
        await Promise.all(
            entries.map((entry) => {
                const entryPath = path.join(directory, entry.name);
                return entry.isDirectory() ? walk(entryPath) : [entryPath];
            }),
        )
    ).flat();
}

const expectedEntrypoints = [
    "src/api/main.js",
    "src/core/services/gateway-service.js",
    "src/gateways/auth/bootstrap/index.js",
    "src/gateways/db/executor.js",
    "src/gateways/files/bootstrap.js",
    "src/gateways/logging/bootstrap.js",
    "src/tooling/cli/index.js",
];
await Promise.all(
    expectedEntrypoints.map((entrypoint) =>
        access(path.join(serverRoot, entrypoint)),
    ),
);

const dynamicLoaderFiles = expectedEntrypoints.slice(1, 5);
for (const relativePath of dynamicLoaderFiles) {
    const contents = await readFile(
        path.join(serverRoot, relativePath),
        "utf8",
    );
    assert.doesNotMatch(
        contents,
        /["'](?:bootstrap|index)\.ts["']/,
        `${relativePath} must load compiled JavaScript entrypoints`,
    );
}

const gatewayService = await readFile(
    path.join(serverRoot, "src/core/services/gateway-service.js"),
    "utf8",
);
assert.match(gatewayService, /bootstrap\.js/);

const adaptersRoot = path.join(serverRoot, "src/adapters");
for (const adapterFamily of await readdir(adaptersRoot, {
    withFileTypes: true,
})) {
    if (!adapterFamily.isDirectory()) continue;
    const adapterFamilyRoot = path.join(adaptersRoot, adapterFamily.name);
    for (const adapter of await readdir(adapterFamilyRoot, {
        withFileTypes: true,
    })) {
        if (!adapter.isDirectory()) continue;
        const adapterRoot = path.join(adapterFamilyRoot, adapter.name);
        const packageManifest = JSON.parse(
            await readFile(path.join(adapterRoot, "package.json"), "utf8"),
        );
        assert.equal(
            typeof packageManifest.main,
            "string",
            `${adapterFamily.name}/${adapter.name} must declare a package entrypoint`,
        );
        await import(
            pathToFileURL(path.join(adapterRoot, packageManifest.main)).href
        );
    }
}

for (const emittedPath of (await walk(path.join(serverRoot, "src"))).filter(
    (filePath) => filePath.endsWith(".js"),
)) {
    const contents = await readFile(emittedPath, "utf8");
    assert.doesNotMatch(
        contents,
        /["'][^"'\n]*\.ts["']/,
        `${path.relative(serverRoot, emittedPath)} retains a TypeScript runtime specifier`,
    );
}
console.log("Validated compiled server entrypoints and dynamic imports.");

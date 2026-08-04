import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

const serverRoot = path.resolve("dist/server");
const expectedEntrypoints = [
    "src/api/main.js",
    "src/core/services/gateway-service.js",
    "src/gateways/auth/bootstrap/index.js",
    "src/gateways/db/executor.js",
    "src/gateways/files/bootstrap.js",
    "src/gateways/logging/bootstrap.js",
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
console.log("Validated compiled server entrypoints and dynamic imports.");

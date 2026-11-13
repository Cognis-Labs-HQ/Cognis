import { createHash } from "node:crypto";

/** Version the complete recovery set without assuming a particular worker generation. */
export function versionOfflineWorker(workerSource, resources) {
    const declaration = workerSource.match(/const CACHE_VERSION = "([^"]+)";/);
    if (!declaration) throw new Error("Missing offline worker cache version");
    const digest = createHash("sha256").update(workerSource);
    for (const resource of resources) {
        digest.update(`${Buffer.byteLength(resource)}:`).update(resource);
    }
    const version = `${declaration[1]}-${digest.digest("hex").slice(0, 16)}`;
    return workerSource.replace(
        declaration[0],
        `const CACHE_VERSION = ${JSON.stringify(version)};`,
    );
}

import { readFile } from "node:fs/promises";

/** Read a gateway's authoritative runtime version from its manifest. */
export async function readGatewayManifestVersion(
    bootstrapUrl: string,
    manifestPath = "./manifest.json",
): Promise<string> {
    const manifest = JSON.parse(
        await readFile(new URL(manifestPath, bootstrapUrl), "utf8"),
    ) as { version: string };
    return manifest.version;
}

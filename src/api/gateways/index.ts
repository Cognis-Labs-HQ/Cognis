import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { GatewayBootstrapContext } from "../gateway-bootstrap.js";

interface GatewayDirectoryManifest {
    id?: string;
    required?: boolean;
}

/**
 * Discovers all gateway subdirectories under `gatewaysRoot`, reads each
 * directory's `manifest.json` to determine which gateways are required, then
 * dynamically imports and calls each gateway's `bootstrap(ctx)` function.
 *
 * Returns the list of gateway IDs declared as `required: true` in their
 * manifests. The caller is responsible for verifying that all returned IDs
 * appear in the gateway registry after this function resolves — if any do not,
 * the server should refuse to start.
 */
export async function bootstrapGateways(
    ctx: GatewayBootstrapContext,
    gatewaysRoot: string,
): Promise<readonly string[]> {
    let entries: string[];
    try {
        const dirEntries = await readdir(gatewaysRoot, { withFileTypes: true });
        entries = dirEntries
            .filter((e) => e.isDirectory() && e.name !== "tests")
            .map((e) => e.name);
    } catch {
        return [];
    }

    const requiredIds: string[] = [];

    for (const entry of entries) {
        const gatewayDir = path.join(gatewaysRoot, entry);

        let manifest: GatewayDirectoryManifest = {};
        try {
            const raw = await readFile(
                path.join(gatewayDir, "manifest.json"),
                "utf8",
            );
            manifest = JSON.parse(raw) as GatewayDirectoryManifest;
        } catch {
            // No manifest — gateway is treated as optional
        }

        const gatewayId = manifest.id ?? entry;
        if (manifest.required === true) {
            requiredIds.push(gatewayId);
        }

        const bootstrapUrl = pathToFileURL(
            path.join(gatewayDir, "bootstrap.ts"),
        ).href;

        try {
            const mod = (await import(bootstrapUrl)) as {
                bootstrap?: (ctx: GatewayBootstrapContext) => Promise<void>;
            };
            if (typeof mod.bootstrap === "function") {
                await mod.bootstrap(ctx);
            }
        } catch {
            // Bootstrap failure — required check will surface this as an error.
        }
    }

    return requiredIds;
}

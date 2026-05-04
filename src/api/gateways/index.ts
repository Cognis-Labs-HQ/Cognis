import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type {
    GatewayBootstrapContext,
    BootstrapLog,
} from "../gateway-bootstrap.js";

interface GatewayDirectoryManifest {
    id?: string;
    required?: boolean;
}

/**
 * Discovers all gateway subdirectories under `gatewaysRoot`, reads each
 * directory's `manifest.json` to determine which gateways are required, then
 * dynamically imports and calls each gateway's `bootstrap(ctx)` function.
 *
 * The logging gateway is bootstrapped first (if present) so that its
 * contributed `logging:logger` capability becomes available to all subsequent
 * gateways via `ctx.log`.
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

    // Sort so the logging gateway always bootstraps first, making its logger
    // available to every subsequent gateway via ctx.log.
    entries.sort((a, b) => {
        if (a === "logging") return -1;
        if (b === "logging") return 1;
        return a.localeCompare(b);
    });

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

        // After the logging gateway runs, pull the contributed log function into
        // the context so all subsequent gateways can use it.
        if (gatewayId === "logging" && !ctx.log) {
            const contributed =
                ctx.capabilities.get<BootstrapLog>("logging:log");
            if (contributed) {
                ctx.log = contributed;
            }
        }
    }

    return requiredIds;
}

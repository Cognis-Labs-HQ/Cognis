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
    /** Gateway IDs that must be present in the registry after all bootstraps complete. */
    requires?: string[];
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
 *
 * Cross-gateway dependency checking (the `requires` field) is also performed:
 * if a required gateway lists a missing dependency, an error is thrown. If an
 * optional gateway lists a missing dependency, a warning is logged.
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
    const gatewayManifests = new Map<
        string,
        { required: boolean; requires: string[] }
    >();

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
            // No manifest — gateway is treated as optional with no dependencies
        }

        const gatewayId = manifest.id ?? entry;
        if (manifest.required === true) {
            requiredIds.push(gatewayId);
        }

        gatewayManifests.set(gatewayId, {
            required: manifest.required === true,
            requires: Array.isArray(manifest.requires) ? manifest.requires : [],
        });

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

    // Validate cross-gateway dependencies now that all gateways have
    // bootstrapped and registered themselves.
    for (const [gatewayId, meta] of gatewayManifests) {
        for (const depId of meta.requires) {
            if (!ctx.gatewayRegistry.get(depId)) {
                const message = `Gateway "${gatewayId}" requires gateway "${depId}" but it is not registered.`;
                if (meta.required) {
                    throw new Error(message);
                }
                void ctx.log?.("warn", message, { gatewayId, depId });
            }
        }
    }

    return requiredIds;
}

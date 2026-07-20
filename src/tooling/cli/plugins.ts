import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { apiGet, apiPost } from "./http.ts";
import { register, registry } from "./registry.ts";

interface ModuleManifest {
    entrypoints?: {
        cli?: unknown;
    };
}

function uniquePaths(paths: string[]): string[] {
    return [...new Set(paths.map((entry) => path.resolve(entry)))];
}

function configuredModuleRoots(): string[] {
    const configured =
        process.env.COGNIS_MODULE_CLI_PATHS ?? process.env.COGNIS_MODULES_ROOT;
    const explicitRoots = configured
        ? configured.split(path.delimiter).filter(Boolean)
        : [];

    return uniquePaths([
        ...explicitRoots,
        path.resolve(process.cwd(), "modules"),
        path.resolve(process.cwd(), "src", "modules"),
        path.resolve(import.meta.dirname, "..", "..", "modules"),
    ]);
}

async function resolveCliEntrypoint(
    moduleRoot: string,
): Promise<string | null> {
    const fallback = path.join(moduleRoot, "cli", "index.js");

    try {
        const manifest = JSON.parse(
            await readFile(path.join(moduleRoot, "manifest.json"), "utf8"),
        ) as ModuleManifest;
        if (typeof manifest.entrypoints?.cli === "string") {
            return path.resolve(moduleRoot, manifest.entrypoints.cli);
        }
    } catch {
        return fallback;
    }

    return fallback;
}

export async function loadModuleCliPlugins(options?: {
    refresh?: boolean;
}): Promise<void> {
    if (options?.refresh) {
        for (const [name, spec] of registry.entries()) {
            if (spec.section === "Extensions") registry.delete(name);
        }
    }

    for (const modulesRoot of configuredModuleRoots()) {
        let entries: string[] = [];

        try {
            entries = await readdir(modulesRoot);
        } catch {
            continue;
        }

        for (const moduleName of entries) {
            const pluginPath = await resolveCliEntrypoint(
                path.join(modulesRoot, moduleName),
            );
            if (!pluginPath) continue;

            try {
                const plugin = await import(pluginPath);
                if (typeof plugin.registerCommands === "function") {
                    plugin.registerCommands({ register, apiGet, apiPost });
                }
            } catch {
                continue;
            }
        }
    }
}

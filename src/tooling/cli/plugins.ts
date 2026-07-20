import { readdir } from "node:fs/promises";
import path from "node:path";

import { apiGet, apiPost } from "./http.ts";
import { register, registry } from "./registry.ts";

export async function loadModuleCliPlugins(options?: {
    refresh?: boolean;
}): Promise<void> {
    if (options?.refresh) {
        for (const [name, spec] of registry.entries()) {
            if (spec.section === "Extensions") registry.delete(name);
        }
    }

    const configured =
        process.env.COGNIS_MODULE_CLI_PATHS ??
        path.resolve(process.cwd(), "modules");
    const roots = configured.split(path.delimiter).filter(Boolean);

    for (const modulesRoot of roots) {
        let entries: string[] = [];

        try {
            entries = await readdir(modulesRoot);
        } catch {
            continue;
        }

        for (const moduleName of entries) {
            const pluginPath = path.join(
                modulesRoot,
                moduleName,
                "cli",
                "index.js",
            );

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

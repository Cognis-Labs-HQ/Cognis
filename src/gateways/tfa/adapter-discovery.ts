import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { BootstrapLog } from "../shared.js";
import type { TfaMethodAdapter } from "./contracts/method.js";
import type { TfaAdapterFactory } from "./gateway.js";

export async function discoverTfaAdapters(
    tfaAdaptersRoot: string,
    factoryContext: Record<string, unknown>,
    log?: BootstrapLog,
): Promise<TfaMethodAdapter[]> {
    const adapters: TfaMethodAdapter[] = [];
    let entries: string[];
    try {
        entries = await readdir(tfaAdaptersRoot);
    } catch (error) {
        log?.("error", "TFA adapter directory unavailable.", {
            component: "tfa-gateway",
            operation: "discoverAdapters",
            errorName: error instanceof Error ? error.name : "UnknownError",
        });
        return adapters;
    }

    for (const entry of entries) {
        const packagePath = path.join(tfaAdaptersRoot, entry, "package.json");
        try {
            const packageRaw = await readFile(packagePath, "utf8");
            const packageJson = JSON.parse(packageRaw) as {
                main?: string;
                version?: string;
            };
            if (!packageJson.main) continue;
            const entryPath = path.resolve(
                tfaAdaptersRoot,
                entry,
                packageJson.main,
            );
            const module = await import(`${entryPath}?t=${Date.now()}`);
            if (typeof module.createAdapter !== "function") continue;
            const factory = module.createAdapter as TfaAdapterFactory;
            const adapter = factory(factoryContext);
            if (module.defineContracts !== undefined)
                Object.assign(adapter, {
                    defineContracts: module.defineContracts,
                });
            if (packageJson.version) {
                Object.assign(adapter, { version: packageJson.version });
            }
            try {
                const manifestRaw = await readFile(
                    path.join(tfaAdaptersRoot, entry, "manifest.json"),
                    "utf8",
                );
                const manifest = JSON.parse(manifestRaw) as {
                    publisher?: string;
                };
                if (typeof manifest.publisher === "string") {
                    Object.assign(adapter, {
                        publisher: manifest.publisher,
                    });
                }
            } catch (error) {
                log?.("error", "Optional TFA publisher metadata unavailable.", {
                    component: "tfa-gateway",
                    operation: "discoverAdapterMetadata",
                    adapterId: adapter.id,
                    errorName:
                        error instanceof Error ? error.name : "UnknownError",
                });
            }
            adapters.push(adapter);
        } catch (error) {
            log?.("error", "TFA adapter discovery failed.", {
                component: "tfa-gateway",
                operation: "discoverAdapters",
                adapterDirectory: entry,
                errorName: error instanceof Error ? error.name : "UnknownError",
            });
        }
    }
    return adapters;
}

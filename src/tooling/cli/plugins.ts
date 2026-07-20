import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { formatStructured } from "./formatters.ts";
import { apiGet, apiPost, apiPut } from "./http.ts";
import { register, registry } from "./registry.ts";
import type { CommandHandler, RegisterCommandOptions } from "./types.ts";

interface ComponentManifest {
    entrypoints?: {
        cli?: unknown;
    };
}

const pluginCommandNames = new Set<string>();

function uniquePaths(paths: string[]): string[] {
    return [...new Set(paths.map((entry) => path.resolve(entry)))];
}

function splitConfiguredPaths(value: string | undefined): string[] {
    return value ? value.split(path.delimiter).filter(Boolean) : [];
}

function configuredModuleRoots(): string[] {
    return uniquePaths([
        ...splitConfiguredPaths(
            process.env.COGNIS_MODULE_CLI_PATHS ??
                process.env.COGNIS_MODULES_ROOT,
        ),
        path.resolve(process.cwd(), "modules"),
        path.resolve(process.cwd(), "src", "modules"),
        path.resolve(import.meta.dirname, "..", "..", "modules"),
    ]);
}

function configuredGatewayRoots(): string[] {
    return uniquePaths([
        ...splitConfiguredPaths(process.env.COGNIS_GATEWAY_CLI_PATHS),
        path.resolve(process.cwd(), "gateways"),
        path.resolve(process.cwd(), "src", "gateways"),
        path.resolve(import.meta.dirname, "..", "..", "gateways"),
    ]);
}

function configuredAdapterRoots(): string[] {
    return uniquePaths([
        ...splitConfiguredPaths(process.env.COGNIS_ADAPTER_CLI_PATHS),
        path.resolve(process.cwd(), "adapters"),
        path.resolve(process.cwd(), "src", "adapters"),
        path.resolve(import.meta.dirname, "..", "..", "adapters"),
    ]);
}

async function pathExists(filePath: string): Promise<boolean> {
    try {
        await access(filePath);
        return true;
    } catch {
        return false;
    }
}

async function resolveCliEntrypoint(
    componentRoot: string,
): Promise<string | null> {
    const fallback = path.join(componentRoot, "cli", "index.js");

    try {
        const manifest = JSON.parse(
            await readFile(path.join(componentRoot, "manifest.json"), "utf8"),
        ) as ComponentManifest;
        if (typeof manifest.entrypoints?.cli === "string") {
            return path.resolve(componentRoot, manifest.entrypoints.cli);
        }
    } catch {
        return fallback;
    }

    return fallback;
}

async function listChildDirectories(root: string): Promise<string[]> {
    try {
        const entries = await readdir(root, { withFileTypes: true });
        return entries
            .filter((entry) => entry.isDirectory())
            .map((entry) => path.join(root, entry.name));
    } catch {
        return [];
    }
}

async function discoverComponentRoots(): Promise<string[]> {
    const moduleRoots = await Promise.all(
        configuredModuleRoots().map((root) => listChildDirectories(root)),
    );
    const gatewayRoots = await Promise.all(
        configuredGatewayRoots().map((root) => listChildDirectories(root)),
    );
    const adapterGatewayRoots = await Promise.all(
        configuredAdapterRoots().map((root) => listChildDirectories(root)),
    );
    const adapterRoots = await Promise.all(
        adapterGatewayRoots.flat().map((root) => listChildDirectories(root)),
    );

    return uniquePaths([
        ...moduleRoots.flat(),
        ...gatewayRoots.flat(),
        ...adapterRoots.flat(),
    ]);
}

function registerPluginCommand(
    name: string,
    handler: CommandHandler,
    options?: RegisterCommandOptions,
): void {
    pluginCommandNames.add(name);
    register(name, handler, {
        ...options,
        render: options?.render ?? formatStructured,
    });
}

export async function loadModuleCliPlugins(options?: {
    refresh?: boolean;
}): Promise<void> {
    if (options?.refresh) {
        for (const name of pluginCommandNames) {
            registry.delete(name);
        }
        pluginCommandNames.clear();
    }

    for (const componentRoot of await discoverComponentRoots()) {
        const pluginPath = await resolveCliEntrypoint(componentRoot);
        if (!pluginPath || !(await pathExists(pluginPath))) continue;

        const plugin = await import(pluginPath);
        if (typeof plugin.registerCommands === "function") {
            plugin.registerCommands({
                register: registerPluginCommand,
                apiGet,
                apiPost,
                apiPut,
            });
        }
    }
}

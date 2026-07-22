import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { renderStructuredSummary } from "./formatters.ts";
import { apiGet, apiPost, apiPut } from "./http.ts";
import { register, registry } from "./registry.ts";
import type { CommandHandler, RegisterCommandOptions } from "./types.ts";

interface ComponentManifest {
    entrypoints?: {
        cli?: unknown;
    };
}

type ComponentOwner =
    | { type: "module"; id: string }
    | { type: "gateway"; id: string }
    | { type: "adapter"; id: string; gatewayId: string };

interface DiscoveredComponent {
    root: string;
    owner: ComponentOwner;
}

interface ComponentAvailability {
    modules: Set<string>;
    gateways: Set<string>;
    adapters: Set<string>;
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

async function discoverComponents(): Promise<DiscoveredComponent[]> {
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

    const components: DiscoveredComponent[] = [];
    for (const root of uniquePaths(moduleRoots.flat())) {
        components.push({
            root,
            owner: { type: "module", id: path.basename(root) },
        });
    }
    for (const root of uniquePaths(gatewayRoots.flat())) {
        components.push({
            root,
            owner: { type: "gateway", id: path.basename(root) },
        });
    }
    for (const root of uniquePaths(adapterRoots.flat())) {
        components.push({
            root,
            owner: {
                type: "adapter",
                id: path.basename(root),
                gatewayId: path.basename(path.dirname(root)),
            },
        });
    }

    return components;
}

function adapterKey(gatewayId: string, adapterId: string): string {
    return `${gatewayId}:${adapterId}`;
}

function isEnabledStatus(entry: {
    status?: unknown;
    enabled?: unknown;
    active?: unknown;
}): boolean {
    if (typeof entry.enabled === "boolean") return entry.enabled;
    if (typeof entry.active === "boolean") return entry.active;
    return String(entry.status ?? "active") !== "disabled";
}

async function loadComponentAvailability(
    apiBaseUrl: string | undefined,
    getApiToken: (() => Promise<string>) | undefined,
): Promise<ComponentAvailability | null> {
    if (!apiBaseUrl || !getApiToken) return null;
    try {
        const token = await getApiToken();
        const [modulePayload, gatewayPayload] = (await Promise.all([
            apiGet(apiBaseUrl, "/api/v1/modules", token),
            apiGet(apiBaseUrl, "/api/v1/gateways", token),
        ])) as [
            {
                data?: Array<{
                    id: string;
                    status?: unknown;
                    enabled?: unknown;
                    active?: unknown;
                }>;
            },
            {
                data?: Array<{
                    id: string;
                    status?: unknown;
                    enabled?: unknown;
                    active?: unknown;
                }>;
            },
        ];
        const gateways = gatewayPayload.data ?? [];
        const adapterPayloads = await Promise.all(
            gateways
                .filter((gateway) => isEnabledStatus(gateway))
                .map(async (gateway) => {
                    try {
                        const payload = (await apiGet(
                            apiBaseUrl,
                            `/api/v1/gateways/${encodeURIComponent(gateway.id)}/adapters`,
                            token,
                        )) as {
                            data?: Array<{
                                id?: string;
                                adapterId?: string;
                                senderId?: string;
                                name?: string;
                                status?: unknown;
                                enabled?: unknown;
                                active?: unknown;
                            }>;
                        };
                        return {
                            gatewayId: gateway.id,
                            adapters: payload.data ?? [],
                        };
                    } catch {
                        return { gatewayId: gateway.id, adapters: [] };
                    }
                }),
        );

        return {
            modules: new Set(
                (modulePayload.data ?? [])
                    .filter((entry) => isEnabledStatus(entry))
                    .map((entry) => entry.id),
            ),
            gateways: new Set(
                gateways
                    .filter((entry) => isEnabledStatus(entry))
                    .map((entry) => entry.id),
            ),
            adapters: new Set(
                adapterPayloads.flatMap(({ gatewayId, adapters }) =>
                    adapters
                        .filter((adapter) => isEnabledStatus(adapter))
                        .map((adapter) =>
                            adapterKey(
                                gatewayId,
                                adapter.adapterId ??
                                    adapter.senderId ??
                                    adapter.id ??
                                    adapter.name ??
                                    "adapter",
                            ),
                        ),
                ),
            ),
        };
    } catch {
        return null;
    }
}

function isComponentEnabled(
    owner: ComponentOwner,
    availability: ComponentAvailability | null,
): boolean {
    if (!availability) return true;
    if (owner.type === "module") return availability.modules.has(owner.id);
    if (owner.type === "gateway") return availability.gateways.has(owner.id);
    return availability.adapters.has(adapterKey(owner.gatewayId, owner.id));
}

function registerPluginCommand(
    name: string,
    handler: CommandHandler,
    options?: RegisterCommandOptions,
): void {
    pluginCommandNames.add(name);
    register(name, handler, {
        ...options,
        render: options?.render ?? renderStructuredSummary,
    });
}

export async function loadModuleCliPlugins(options?: {
    refresh?: boolean;
    filterDisabled?: boolean;
    apiBaseUrl?: string;
    getApiToken?: () => Promise<string>;
}): Promise<void> {
    if (options?.refresh) {
        for (const name of pluginCommandNames) {
            registry.delete(name);
        }
        pluginCommandNames.clear();
    }

    const availability = options?.filterDisabled
        ? await loadComponentAvailability(
              options.apiBaseUrl,
              options.getApiToken,
          )
        : null;

    for (const component of await discoverComponents()) {
        if (!isComponentEnabled(component.owner, availability)) continue;
        const pluginPath = await resolveCliEntrypoint(component.root);
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

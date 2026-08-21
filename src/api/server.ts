import { createSearchRoutes } from "./routes/search/index.js";
import { createServer } from "node:http";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
    HealthService,
    ModuleService,
    ModuleMarketplaceService,
    ModuleTestService,
    type GatewayRegistry,
    type BootstrapLog,
    type ModuleManifest,
    type ModuleRuntimeGateway,
} from "@cognis/core";
import {
    createModuleRoutes,
    ModuleEnableValidationError,
} from "./routes/modules/index.js";
import { createSystemRoutes } from "./routes/system/index.js";
import { createDocsRoutes } from "./routes/docs/index.js";
import { createUiRoutes } from "./routes/ui/index.js";
import { createModuleExtensionRoutes } from "./reuse/module-extension-routes.js";
import type { LocalAccountStore } from "@cognis/core";
import type { UserPreferenceStore } from "./reuse/preference-store.js";
import type { RouteContext } from "./reuse/route-context.js";
import { createUserRoutes } from "./routes/users/index.js";
import type { RouteRegistry } from "./reuse/route-registry.js";
import { createGatewayRoutes } from "./routes/gateways/index.js";
import type { UIRegistry } from "./reuse/ui-registry.js";

export interface ApiDependencies {
    moduleRuntimeGateway: ModuleRuntimeGateway;
    accountStore?: LocalAccountStore;
    preferenceStore?: UserPreferenceStore;
    routeRegistry?: RouteRegistry;
    gatewayRegistry?: GatewayRegistry;
    uiRegistry?: UIRegistry;
    healthService?: HealthService;
    log?: BootstrapLog;
    validateModuleEnable?: (moduleId: string) => Promise<void> | void;
    runModuleTests?: (moduleId: string) => Promise<void>;
    moduleIntegrityChecker?: () => Promise<
        Array<{
            moduleId: string;
            file: string;
            expected: string | null;
            actual: string | null;
            status: "ok" | "mismatch" | "missing" | "missing_shasum";
        }>
    >;
    loadModuleStates?: () => Promise<
        Array<{ moduleId: string; enabled: boolean }>
    >;
    persistModuleState?: (moduleId: string, enabled: boolean) => Promise<void>;
    loadGatewayStates?: () => Promise<
        Array<{ gatewayId: string; enabled: boolean }>
    >;
    persistGatewayState?: (
        gatewayId: string,
        enabled: boolean,
    ) => Promise<void>;
    createProfile?: (
        accountId: string,
        handle: string,
        role?: string,
    ) => Promise<void>;
    setProfileRole?: (handle: string, role: string) => Promise<void>;
    searchProfiles?: (
        query: string,
        limit: number,
        options?: { includeHidden?: boolean; requesterAccountId?: string },
    ) => Promise<
        Array<{
            accountId?: string;
            handle?: string;
            displayName?: string;
            avatarKey?: string | null;
        }>
    >;
    getProfileVisibility?: (
        accountId: string,
    ) => Promise<string | null | undefined>;
    setProfileVisibility?: (
        accountId: string,
        visibility: "friends",
    ) => Promise<void>;
    getProfileLifecycleState?: (
        accountId: string,
    ) => Promise<string | null | undefined>;
    setProfileLifecycleState?: (
        accountId: string,
        lifecycleState: "active" | "deactivated" | "archived",
    ) => Promise<void>;
    onModuleStateChanged?: (
        moduleId: string,
        enabled: boolean,
    ) => Promise<void> | void;
    routeContext?: RouteContext;
    observability?: {
        record(
            name: string,
            value: number,
            labels?: Record<string, string>,
        ): void;
    };
    discoverModulesOnStartup?: boolean;
}

export interface CoreComponentDependency {
    id: string;
    uuid: string;
    name: string;
    gatewayId?: string;
}

export async function discoverCoreComponentDependencies(
    roots: readonly string[],
): Promise<CoreComponentDependency[]> {
    const components: CoreComponentDependency[] = [];
    const visit = async (root: string): Promise<void> => {
        let entries;
        try {
            entries = await readdir(root, { withFileTypes: true });
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
            throw error;
        }
        for (const entry of entries) {
            const entryPath = path.join(root, entry.name);
            if (entry.isDirectory()) {
                await visit(entryPath);
                continue;
            }
            if (entry.name !== "manifest.json") continue;
            const manifest = JSON.parse(await readFile(entryPath, "utf8")) as {
                id?: unknown;
                uuid?: unknown;
                name?: unknown;
                gateway?: unknown;
            };
            if (
                typeof manifest.id !== "string" ||
                typeof manifest.uuid !== "string" ||
                typeof manifest.name !== "string"
            )
                continue;
            components.push({
                id: manifest.id,
                uuid: manifest.uuid,
                name: manifest.name,
                ...(typeof manifest.gateway === "string"
                    ? { gatewayId: manifest.gateway }
                    : {}),
            });
        }
    };
    for (const root of roots) await visit(root);
    return components;
}

export function assertModuleEnableDependencies(
    moduleId: string,
    requires: readonly string[],
    registry: GatewayRegistry | undefined,
    components: readonly CoreComponentDependency[] = [],
): void {
    for (const reference of requires) {
        const directGateway = registry
            ?.list()
            .find(
                (entry) => entry.id === reference || entry.uuid === reference,
            );
        const component = components.find(
            (entry) => entry.id === reference || entry.uuid === reference,
        );
        const dependency =
            directGateway ??
            (component?.gatewayId
                ? registry?.get(component.gatewayId)
                : undefined);
        if (!dependency) {
            throw new ModuleEnableValidationError(
                "module_dependency_unavailable",
                `Module ${moduleId} requires unavailable component ${reference}`,
            );
        }
        if (dependency.status === "active") continue;
        throw new ModuleEnableValidationError(
            "module_dependency_disabled",
            `Module ${moduleId} requires disabled component ${component?.name ?? dependency.name}`,
        );
    }
}

export function assertModuleInstallDependencies(
    moduleId: string,
    requires: readonly string[],
    registry: GatewayRegistry | undefined,
    components: readonly CoreComponentDependency[] = [],
): void {
    for (const reference of requires) {
        const dependency = registry
            ?.list()
            .find(
                (entry) => entry.id === reference || entry.uuid === reference,
            );
        const component = components.find(
            (entry) => entry.id === reference || entry.uuid === reference,
        );
        if (!dependency && !component) {
            throw new ModuleEnableValidationError(
                "module_dependency_unavailable",
                `Module ${moduleId} requires unavailable component ${reference}`,
            );
        }
        const owningGateway = component?.gatewayId
            ? registry?.get(component.gatewayId)
            : undefined;
        if (
            dependency?.status === "disabled" ||
            (component?.gatewayId && owningGateway?.status !== "active")
        ) {
            throw new ModuleEnableValidationError(
                "module_dependency_disabled",
                `Module ${moduleId} requires disabled component ${component?.name ?? dependency?.name}`,
            );
        }
    }
}

export function assertModuleCapabilityDependencies(
    moduleId: string,
    requiresCapabilities: readonly string[],
    isCapabilityAvailable: (capabilityId: string) => boolean,
): void {
    for (const capability of requiresCapabilities) {
        if (isCapabilityAvailable(capability)) continue;
        throw new ModuleEnableValidationError(
            "module_capability_unavailable",
            `Module ${moduleId} requires unavailable capability ${capability}`,
        );
    }
}

/**
 * Resolves a module's startup enabled state from highest to lowest priority:
 * core-module requirement, persisted runtime override, then manifest default.
 */
export function resolveInitialModuleEnabledState(
    manifest: Pick<ModuleManifest, "id" | "class" | "enabledByDefault">,
    persistedState: boolean | undefined,
): boolean {
    if (manifest.class === "core") return true;
    if (persistedState === true) return true;
    if (persistedState === false) return false;
    return manifest.enabledByDefault === true;
}

function isUiStaticAssetRequest(pathname: string): boolean {
    return (
        pathname.startsWith("/static/") ||
        pathname.startsWith("/assets/") ||
        pathname === "/manifest.webmanifest"
    );
}

export function buildServer(deps: ApiDependencies) {
    const log = deps.log ?? (() => undefined);
    const coreComponentDependencies = discoverCoreComponentDependencies([
        fileURLToPath(new URL("../gateways", import.meta.url)),
        fileURLToPath(new URL("../adapters", import.meta.url)),
    ]);
    const routeContext = deps.routeContext;
    if (!routeContext) {
        throw new Error(
            "route_context_missing: auth route context is required in ApiDependencies",
        );
    }
    const externalModulesRoot =
        process.env.COGNIS_EXTERNAL_MODULES_ROOT ??
        path.resolve(process.cwd(), "external-modules");
    const moduleService = new ModuleService(deps.moduleRuntimeGateway, {
        externalModulesPath: externalModulesRoot,
        enabledPointersPath:
            process.env.COGNIS_ENABLED_MODULES_ROOT ??
            path.resolve(process.cwd(), "config", "enabled-modules"),
    });
    const moduleMarketplaceService = new ModuleMarketplaceService(
        process.env.COGNIS_MODULE_SOURCES_PATH ??
            path.resolve(process.cwd(), "config", "module-sources.json"),
        externalModulesRoot,
        (level, message, meta) => log(level, message, meta),
    );
    if (deps.discoverModulesOnStartup) {
        void moduleMarketplaceService.discover().catch((error) => {
            log("warn", "Initial module marketplace discovery failed.", {
                component: "api-modules",
                error: error instanceof Error ? error.message : String(error),
            });
        });
    }
    const moduleTestService = new ModuleTestService([externalModulesRoot]);
    const healthService = deps.healthService ?? new HealthService();
    const enabledModules = new Set<string>();
    const moduleExtensionRoutes = createModuleExtensionRoutes(
        deps.moduleRuntimeGateway,
        (moduleId) => enabledModules.has(moduleId),
        log,
        {
            uiRegistry: deps.uiRegistry,
            routeContext,
            onBootstrapFailed: async (moduleId) => {
                enabledModules.delete(moduleId);
                await deps.onModuleStateChanged?.(moduleId, false);
                await deps.persistModuleState?.(moduleId, false);
            },
        },
    );

    const moduleRoutes = createModuleRoutes(
        moduleService,
        {
            validateInstallDependencies: async (manifest) => {
                assertModuleInstallDependencies(
                    manifest.id,
                    manifest.requires ?? [],
                    deps.gatewayRegistry,
                    await coreComponentDependencies,
                );
            },
            beforeEnable: async (moduleId) => {
                await deps.moduleRuntimeGateway.refresh?.();
                const manifest = (
                    await deps.moduleRuntimeGateway.listManifests()
                ).find((entry) => entry.id === moduleId);
                assertModuleEnableDependencies(
                    moduleId,
                    manifest?.requires ?? [],
                    deps.gatewayRegistry,
                    await coreComponentDependencies,
                );
                assertModuleCapabilityDependencies(
                    moduleId,
                    manifest?.requiresCapabilities ?? [],
                    (capabilityId) =>
                        routeContext.getCapability(capabilityId) !==
                            undefined ||
                        (deps.uiRegistry?.hasActiveCapabilityProvider(
                            capabilityId,
                        ) ??
                            false),
                );
                await (
                    deps.runModuleTests ??
                    moduleTestService.run.bind(moduleTestService)
                )(moduleId);
                await deps.validateModuleEnable?.(moduleId);
            },
            onEnabled: async (moduleId) => {
                enabledModules.add(moduleId);
                await deps.onModuleStateChanged?.(moduleId, true);
                await deps.persistModuleState?.(moduleId, true);
                await moduleExtensionRoutes.refresh();
            },
            onDisabled: async (moduleId) => {
                enabledModules.delete(moduleId);
                await deps.onModuleStateChanged?.(moduleId, false);
                await deps.persistModuleState?.(moduleId, false);
                await moduleExtensionRoutes.refresh();
            },
            onImported: async () => {
                await deps.moduleRuntimeGateway.refresh?.();
                await moduleExtensionRoutes.refresh();
            },
            onUninstalled: async (moduleId) => {
                enabledModules.delete(moduleId);
                await deps.persistModuleState?.(moduleId, false);
                await deps.moduleRuntimeGateway.refresh?.();
                await moduleExtensionRoutes.refresh();
            },
            getStatus: (moduleId) =>
                enabledModules.has(moduleId) ? "enabled" : "disabled",
            getIntegrityReport: deps.moduleIntegrityChecker,
            log,
        },
        routeContext,
        moduleMarketplaceService,
    );
    const systemRoutes = createSystemRoutes(
        healthService,
        deps.preferenceStore,
        log,
        routeContext,
    );
    const docsRoutes = createDocsRoutes();
    const uiRoutes = createUiRoutes(
        deps.moduleRuntimeGateway,
        deps.uiRegistry,
        deps.accountStore,
        deps.gatewayRegistry,
        (moduleId) => enabledModules.has(moduleId),
        log,
        routeContext,
    );
    const userRoutes = deps.accountStore
        ? createUserRoutes(
              deps.accountStore,
              deps.preferenceStore,
              deps.setProfileRole,
              log,
              deps.getProfileVisibility,
              deps.setProfileVisibility,
              routeContext,
              deps.getProfileLifecycleState,
              deps.setProfileLifecycleState,
          )
        : null;
    const gatewayRoutes = deps.gatewayRegistry
        ? createGatewayRoutes(
              deps.gatewayRegistry,
              deps.uiRegistry,
              deps.persistGatewayState,
              log,
              routeContext,
          )
        : null;
    const searchRoutes = createSearchRoutes(deps.searchProfiles, routeContext);

    const runtimeStateReady = Promise.all([
        deps.moduleRuntimeGateway.listManifests(),
        deps.loadModuleStates?.() ?? Promise.resolve([]),
        deps.loadGatewayStates?.() ?? Promise.resolve([]),
    ])
        .then(([manifests, savedStates, savedGatewayStates]) => {
            const saved = new Map(
                savedStates.map((row) => [row.moduleId, row.enabled]),
            );
            for (const manifest of manifests) {
                const persisted = saved.get(manifest.id);
                const isEnabled = resolveInitialModuleEnabledState(
                    manifest,
                    persisted,
                );
                if (isEnabled) enabledModules.add(manifest.id);
                deps.onModuleStateChanged?.(manifest.id, isEnabled);
            }
            const savedGateways = new Map(
                savedGatewayStates.map((row) => [row.gatewayId, row.enabled]),
            );
            for (const manifest of manifests) {
                healthService.contribute(`module:${manifest.id}`, () => ({
                    componentId: manifest.id,
                    componentType: "module",
                    status: enabledModules.has(manifest.id) ? "ok" : "warning",
                    message: enabledModules.has(manifest.id)
                        ? "Module is enabled."
                        : "Module is disabled.",
                    checkedAt: new Date().toISOString(),
                }));
            }
            if (deps.gatewayRegistry) {
                for (const entry of deps.gatewayRegistry.list()) {
                    if (entry.required) continue;
                    const persisted = savedGateways.get(entry.id);
                    if (persisted === false) {
                        deps.gatewayRegistry.disable(entry.id);
                    }
                }
                for (const entry of deps.gatewayRegistry.list()) {
                    healthService.contribute(`gateway:${entry.id}`, () => ({
                        componentId: entry.id,
                        componentType: "gateway",
                        status: entry.status === "active" ? "ok" : "warning",
                        message:
                            entry.status === "active"
                                ? "Gateway is active."
                                : "Gateway is disabled.",
                        checkedAt: new Date().toISOString(),
                    }));
                }
            }
            return moduleExtensionRoutes.refresh();
        })
        .catch((error) => {
            log("error", "Failed to restore persisted runtime states.", {
                component: "api-server",
                error: error instanceof Error ? error.message : String(error),
            });
        });

    const server = createServer(async (req, res) => {
        await runtimeStateReady;
        const url = new URL(req.url ?? "/", "http://localhost");
        const startedAt = Date.now();
        let responseBytes = 0;
        const originalWrite = res.write.bind(res);
        const originalEnd = res.end.bind(res);
        res.write = ((chunk: unknown, ...args: unknown[]) => {
            if (chunk) responseBytes += Buffer.byteLength(chunk as string);
            return originalWrite(chunk as never, ...(args as never[]));
        }) as typeof res.write;
        res.end = ((chunk?: unknown, ...args: unknown[]) => {
            if (chunk) responseBytes += Buffer.byteLength(chunk as string);
            return originalEnd(chunk as never, ...(args as never[]));
        }) as typeof res.end;
        res.once("finish", () => {
            const pathSegments = url.pathname.split("/").filter(Boolean);
            const route = url.pathname.startsWith("/api/")
                ? `/${pathSegments.slice(0, 3).join("/")}`
                : `/${pathSegments[0] ?? "root"}`;
            const labels = {
                method: req.method ?? "GET",
                route,
                status_class: `${Math.floor(res.statusCode / 100)}xx`,
            };
            deps.observability?.record(
                "http.server.duration_ms",
                Date.now() - startedAt,
                labels,
            );
            deps.observability?.record(
                "http.server.response_bytes",
                responseBytes,
                labels,
            );
        });
        log("debug", "Incoming API request.", {
            method: req.method ?? "GET",
            path: url.pathname,
        });

        try {
            const owner = deps.routeRegistry?.findOwner(url.pathname);
            if (
                owner &&
                deps.gatewayRegistry?.get(owner.gatewayId)?.status ===
                    "disabled"
            ) {
                res.writeHead(503, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "gateway_disabled",
                            message: "Gateway disabled",
                        },
                    }),
                );
                log("debug", "Request blocked: gateway disabled.", {
                    method: req.method ?? "GET",
                    path: url.pathname,
                    gatewayId: owner.gatewayId,
                    durationMs: Date.now() - startedAt,
                });
                return;
            }

            const handledByModule = await moduleRoutes(req, res, url);
            if (handledByModule) {
                log("debug", "Request handled by module routes.", {
                    method: req.method ?? "GET",
                    path: url.pathname,
                    durationMs: Date.now() - startedAt,
                });
                return;
            }

            const handledBySystem = await systemRoutes(req, res, url);
            if (handledBySystem) {
                log("debug", "Request handled by system routes.", {
                    method: req.method ?? "GET",
                    path: url.pathname,
                    durationMs: Date.now() - startedAt,
                });
                return;
            }

            if (userRoutes) {
                const handledByUsers = await userRoutes(req, res, url);
                if (handledByUsers) {
                    log("debug", "Request handled by user routes.", {
                        method: req.method ?? "GET",
                        path: url.pathname,
                        durationMs: Date.now() - startedAt,
                    });
                    return;
                }
            }

            if (gatewayRoutes) {
                const handledByGateways = await gatewayRoutes(req, res, url);
                if (handledByGateways) {
                    log("debug", "Request handled by gateway routes.", {
                        method: req.method ?? "GET",
                        path: url.pathname,
                        durationMs: Date.now() - startedAt,
                    });
                    return;
                }
            }

            if (isUiStaticAssetRequest(url.pathname)) {
                const handledByUiStatic = await uiRoutes(req, res, url);
                if (handledByUiStatic) {
                    log("debug", "Static request handled by UI routes.", {
                        method: req.method ?? "GET",
                        path: url.pathname,
                        durationMs: Date.now() - startedAt,
                    });
                    return;
                }
            }

            const handledBySearch = await searchRoutes(req, res, url);
            if (handledBySearch) {
                log("debug", "Request handled by search routes.", {
                    method: req.method ?? "GET",
                    path: url.pathname,
                    durationMs: Date.now() - startedAt,
                });
                return;
            }

            // Gateway-registered route handlers run after core routes but before
            // module extensions, docs, and UI. Handlers tied to a disabled
            // gateway are skipped so that disabling a gateway also silences its
            // routes without needing explicit unregistration.
            for (const entry of deps.routeRegistry?.getEntries() ?? []) {
                if (
                    entry.gatewayId &&
                    deps.gatewayRegistry?.get(entry.gatewayId)?.status ===
                        "disabled"
                ) {
                    continue;
                }
                const handledByRegistry = await entry.handler(req, res, url);
                if (handledByRegistry) {
                    log("debug", "Request handled by registered route.", {
                        method: req.method ?? "GET",
                        path: url.pathname,
                        durationMs: Date.now() - startedAt,
                    });
                    return;
                }
            }

            const handledByExtensions = await moduleExtensionRoutes.handle(
                req,
                res,
                url,
            );
            if (handledByExtensions) {
                log("debug", "Request handled by module extension routes.", {
                    method: req.method ?? "GET",
                    path: url.pathname,
                    durationMs: Date.now() - startedAt,
                });
                return;
            }

            const handledByDocs = await docsRoutes(req, res, url);
            if (handledByDocs) {
                log("debug", "Request handled by docs routes.", {
                    method: req.method ?? "GET",
                    path: url.pathname,
                    durationMs: Date.now() - startedAt,
                });
                return;
            }

            const handledByUi = await uiRoutes(req, res, url);
            if (handledByUi) {
                log("debug", "Request handled by UI routes.", {
                    method: req.method ?? "GET",
                    path: url.pathname,
                    durationMs: Date.now() - startedAt,
                });
                return;
            }

            res.writeHead(404, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    error: { code: "not_found", message: "Route not found" },
                }),
            );
            log("warn", "Request resulted in 404.", {
                method: req.method ?? "GET",
                path: url.pathname,
                durationMs: Date.now() - startedAt,
            });
        } catch (error) {
            res.writeHead(400, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    error: {
                        code: "bad_request",
                        message: "Request failed",
                    },
                }),
            );
            log("error", "Request failed with handled error response.", {
                method: req.method ?? "GET",
                path: url.pathname,
                durationMs: Date.now() - startedAt,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    });
    server.requestTimeout = 60_000;
    server.headersTimeout = 15_000;
    server.keepAliveTimeout = 30_000;
    server.maxRequestsPerSocket = 500;
    return server;
}

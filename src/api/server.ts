import type { ApiDependencies } from "./server-dependencies.js";
export type { ApiDependencies } from "./server-dependencies.js";
import { recoverComponentRequest } from "./components/http-failure.js";
import {
    discoverCoreComponentDependencies,
    type CoreComponentDependency,
} from "./components/discovery.js";
import { isModuleCapabilityAvailable } from "./reuse/module-capability-availability.js";
import { createSearchRoutes } from "./routes/search/index.js";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
    HealthService,
    ModuleService,
    ModuleMarketplaceService,
    ModuleTestService,
    type Ctx,
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
import { createDocumentsRoutes } from "./routes/docs/index.js";
import { createUiRoutes } from "./routes/ui/index.js";
import { createModuleExtensionRoutes } from "./reuse/module-extension-routes.js";
import { createUserRoutes } from "./routes/users/index.js";
import { createGatewayRoutes } from "./routes/gateways/index.js";
import { installComponentManagement } from "./components/bootstrap.js";

export async function discoverModuleSourcesOnStartup(
    marketplace: Pick<ModuleMarketplaceService, "discover" | "listSources">,
    log: BootstrapLog,
): Promise<void> {
    try {
        const sourceUuids = (await marketplace.listSources()).map(
            (source) => source.uuid,
        );
        const modules = sourceUuids.length
            ? await marketplace.discover(sourceUuids, true)
            : [];
        log("info", "Initial module marketplace discovery completed.", {
            component: "api-modules",
            operation: "startup-source-discovery",
            catalogModulesFound: modules.length,
        });
    } catch (error) {
        log("warn", "Initial module marketplace discovery failed.", {
            component: "api-modules",
            operation: "startup-source-discovery",
            error: error instanceof Error ? error.message : String(error),
        });
    }
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

export function assertExternalModuleDependencies(
    moduleId: string,
    references: readonly string[],
    manifests: readonly ModuleManifest[],
    isEnabled: (dependencyId: string) => boolean,
): void {
    for (const reference of references) {
        const dependency = manifests.find(
            (manifest) =>
                manifest.id === reference || manifest.uuid === reference,
        );
        if (!dependency) {
            throw new ModuleEnableValidationError(
                "module_dependency_unavailable",
                `Module ${moduleId} requires unavailable external module ${reference}`,
            );
        }
        if (isEnabled(dependency.id)) continue;
        throw new ModuleEnableValidationError(
            "module_dependency_disabled",
            `Module ${moduleId} requires disabled external module ${dependency.name}`,
        );
    }
}

export function resolveHardDependencyDisableOrder(
    disabledModuleId: string,
    manifests: readonly ModuleManifest[],
    isEnabled: (moduleId: string) => boolean,
): string[] {
    const manifestsById = new Map(
        manifests.map((manifest) => [manifest.id, manifest]),
    );
    const visited = new Set([disabledModuleId]);
    const order: string[] = [];
    const visitDependents = (dependencyId: string) => {
        const dependency = manifestsById.get(dependencyId);
        if (!dependency) return;
        for (const candidate of manifests) {
            const hardDependencies = candidate.hardDependencies ?? [];
            if (
                visited.has(candidate.id) ||
                !isEnabled(candidate.id) ||
                !hardDependencies.some(
                    (reference) =>
                        reference === dependency.id ||
                        reference === dependency.uuid,
                )
            ) {
                continue;
            }
            visited.add(candidate.id);
            visitDependents(candidate.id);
            order.push(candidate.id);
        }
    };
    visitDependents(disabledModuleId);
    return order;
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

export function buildServer(dependencies: ApiDependencies) {
    const log = dependencies.log ?? (() => undefined);
    const coreComponentDependencies = discoverCoreComponentDependencies(
        [
            fileURLToPath(new URL("../gateways", import.meta.url)),
            fileURLToPath(new URL("../adapters", import.meta.url)),
        ],
        {
            adaptersRoot: fileURLToPath(
                new URL("../adapters", import.meta.url),
            ),
        },
    );
    const routeContext = dependencies.routeContext;
    if (!routeContext) {
        throw new Error(
            "route_context_missing: auth route context is required in ApiDependencies",
        );
    }
    const externalModulesRoot =
        process.env.COGNIS_EXTERNAL_MODULES_ROOT ??
        path.resolve(process.cwd(), "external-modules");
    const moduleService = new ModuleService(dependencies.moduleRuntimeGateway, {
        externalModulesPath: externalModulesRoot,
        enabledPointersPath:
            process.env.COGNIS_ENABLED_MODULES_ROOT ??
            path.resolve(process.cwd(), "config", "enabled-modules"),
    });
    const moduleMarketplaceService =
        dependencies.moduleMarketplaceService ??
        new ModuleMarketplaceService(
            process.env.COGNIS_MODULE_SOURCES_PATH ??
                path.resolve(process.cwd(), "config", "module-sources.json"),
            externalModulesRoot,
            (level, message, meta) => log(level, message, meta),
            routeContext.getCapability<Ctx>("system:ctx"),
        );
    if (dependencies.discoverModulesOnStartup) {
        void discoverModuleSourcesOnStartup(moduleMarketplaceService, log);
    }
    const moduleTestService = new ModuleTestService([externalModulesRoot]);
    const healthService = dependencies.healthService ?? new HealthService();
    const enabledModules = new Set<string>();
    const temporarilyDisabledDependents = new Map<string, string[]>();
    const moduleExtensionRoutes = createModuleExtensionRoutes(
        dependencies.moduleRuntimeGateway,
        (moduleId) => enabledModules.has(moduleId),
        log,
        {
            uiRegistry: dependencies.uiRegistry,
            routeContext,
            authorizeModuleNamespace: (request) =>
                dependencies.gatewayRegistry?.allowsModuleNamespace(
                    request,
                    request.kind === "apiRoute"
                        ? dependencies.routeRegistry?.findOwner(request.id)
                              ?.gatewayId
                        : undefined,
                ) === true,
            getProtectedRoutePrefixes: () =>
                dependencies.routeRegistry?.getClaimedPrefixes() ?? [],
            onBootstrapFailed: async (moduleId) => {
                const manifest = (await moduleService.list()).find(
                    (entry) => entry.id === moduleId,
                );
                if (manifest?.class === "core") {
                    log("error", "Protected component bootstrap failed.", {
                        component: "api",
                        operation: "componentBootstrap",
                        componentId: moduleId,
                        fatal: true,
                    });
                    return;
                }
                enabledModules.delete(moduleId);
                await dependencies.onModuleStateChanged?.(moduleId, false);
                await dependencies.persistModuleState?.(moduleId, false);
            },
        },
    );

    const validateModuleForEnable = async (moduleId: string): Promise<void> => {
        await dependencies.moduleRuntimeGateway.refresh?.();
        const manifests =
            await dependencies.moduleRuntimeGateway.listManifests();
        const manifest = manifests.find((entry) => entry.id === moduleId);
        assertModuleEnableDependencies(
            moduleId,
            manifest?.requires ?? [],
            dependencies.gatewayRegistry,
            await coreComponentDependencies,
        );
        assertExternalModuleDependencies(
            moduleId,
            manifest?.hardDependencies ?? [],
            manifests,
            (dependencyId) => enabledModules.has(dependencyId),
        );
        assertModuleCapabilityDependencies(
            moduleId,
            manifest?.requiresCapabilities ?? [],
            (capabilityId) =>
                isModuleCapabilityAvailable(
                    capabilityId,
                    routeContext,
                    dependencies.uiRegistry,
                ),
        );
        await (
            dependencies.runModuleTests ??
            moduleTestService.run.bind(moduleTestService)
        )(moduleId);
        await dependencies.validateModuleEnable?.(moduleId);
    };

    const assertModuleIntegrity = async (moduleId: string): Promise<void> => {
        if (!dependencies.moduleIntegrityChecker) return;
        const failures = (await dependencies.moduleIntegrityChecker()).filter(
            (entry) => entry.moduleId === moduleId && entry.status !== "ok",
        );
        if (failures.length === 0) return;
        throw new ModuleEnableValidationError(
            "module_integrity_acknowledgement_required",
            `Module ${moduleId} has unacknowledged integrity failures.`,
        );
    };

    const moduleRoutes = createModuleRoutes(
        moduleService,
        {
            validateInstallDependencies: async (manifest) => {
                assertModuleInstallDependencies(
                    manifest.id,
                    manifest.requires ?? [],
                    dependencies.gatewayRegistry,
                    await coreComponentDependencies,
                );
                await dependencies.moduleRuntimeGateway.refresh?.();
                assertExternalModuleDependencies(
                    manifest.id,
                    manifest.hardDependencies ?? [],
                    await dependencies.moduleRuntimeGateway.listManifests(),
                    (dependencyId) => enabledModules.has(dependencyId),
                );
            },
            beforeEnable: validateModuleForEnable,
            onEnabled: async (moduleId) => {
                enabledModules.add(moduleId);
                try {
                    await dependencies.onModuleStateChanged?.(moduleId, true);
                    await dependencies.persistModuleState?.(moduleId, true);
                    const dependentModuleIds =
                        temporarilyDisabledDependents.get(moduleId) ?? [];
                    for (const dependentModuleId of [
                        ...dependentModuleIds,
                    ].reverse()) {
                        await validateModuleForEnable(dependentModuleId);
                        await assertModuleIntegrity(dependentModuleId);
                        await moduleService.enable(dependentModuleId, {
                            acknowledgeExternalDisclaimer: true,
                        });
                        enabledModules.add(dependentModuleId);
                        await dependencies.onModuleStateChanged?.(
                            dependentModuleId,
                            true,
                        );
                        await dependencies.persistModuleState?.(
                            dependentModuleId,
                            true,
                        );
                    }
                    temporarilyDisabledDependents.delete(moduleId);
                    await moduleExtensionRoutes.refresh({
                        throwOnFailure: true,
                    });
                } catch (error) {
                    enabledModules.delete(moduleId);
                    await dependencies.onModuleStateChanged?.(moduleId, false);
                    await dependencies.persistModuleState?.(moduleId, false);
                    await moduleExtensionRoutes.refresh();
                    throw error;
                }
            },
            onDisabled: async (moduleId, { preserveEnabledState }) => {
                await dependencies.moduleRuntimeGateway.refresh?.();
                const manifests =
                    await dependencies.moduleRuntimeGateway.listManifests();
                const dependentModuleIds = resolveHardDependencyDisableOrder(
                    moduleId,
                    manifests,
                    (candidateId) => enabledModules.has(candidateId),
                );
                if (preserveEnabledState) {
                    temporarilyDisabledDependents.set(
                        moduleId,
                        dependentModuleIds,
                    );
                }
                for (const dependentModuleId of dependentModuleIds) {
                    await moduleService.disable(dependentModuleId);
                    enabledModules.delete(dependentModuleId);
                    dependencies.uiRegistry?.unregisterModuleContributions(
                        dependentModuleId,
                    );
                    await dependencies.onModuleStateChanged?.(
                        dependentModuleId,
                        false,
                    );
                    if (!preserveEnabledState) {
                        await dependencies.persistModuleState?.(
                            dependentModuleId,
                            false,
                        );
                    }
                    log(
                        "warn",
                        "Module disabled because its hard dependency was disabled.",
                        {
                            moduleId: dependentModuleId,
                            disabledDependencyId: moduleId,
                        },
                    );
                }
                enabledModules.delete(moduleId);
                dependencies.uiRegistry?.unregisterModuleContributions(
                    moduleId,
                );
                await moduleExtensionRoutes.refresh();
                await dependencies.onModuleStateChanged?.(moduleId, false);
                if (!preserveEnabledState) {
                    await dependencies.persistModuleState?.(moduleId, false);
                }
            },
            onImported: async () => {
                await dependencies.moduleRuntimeGateway.refresh?.();
                await moduleExtensionRoutes.refresh();
            },
            beforeUninstall: (moduleId, options) =>
                moduleExtensionRoutes.uninstall(moduleId, options),
            onUninstalled: async (moduleId) => {
                enabledModules.delete(moduleId);
                await dependencies.persistModuleState?.(moduleId, false);
                await dependencies.moduleRuntimeGateway.refresh?.();
                await moduleExtensionRoutes.refresh();
            },
            getStatus: (moduleId) =>
                enabledModules.has(moduleId) ? "enabled" : "disabled",
            getIntegrityReport: dependencies.moduleIntegrityChecker,
            log,
        },
        routeContext,
        moduleMarketplaceService,
    );
    const systemRoutes = createSystemRoutes(
        healthService,
        dependencies.preferenceStore,
        log,
        routeContext,
    );
    const documentsRoutes = createDocumentsRoutes();
    const uiRoutes = createUiRoutes(
        dependencies.moduleRuntimeGateway,
        dependencies.uiRegistry,
        dependencies.accountStore,
        dependencies.gatewayRegistry,
        (moduleId) => enabledModules.has(moduleId),
        log,
        routeContext,
    );
    const userRoutes = dependencies.accountStore
        ? createUserRoutes(
              dependencies.accountStore,
              dependencies.preferenceStore,
              dependencies.setProfileRole,
              log,
              dependencies.getProfileVisibility,
              dependencies.setProfileVisibility,
              routeContext,
              dependencies.getProfileLifecycleState,
              dependencies.setProfileLifecycleState,
          )
        : null;
    const gatewayRoutes = dependencies.gatewayRegistry
        ? createGatewayRoutes(
              dependencies.gatewayRegistry,
              dependencies.uiRegistry,
              dependencies.persistGatewayState,
              log,
              routeContext,
          )
        : null;
    const searchRoutes = createSearchRoutes(
        dependencies.searchProfiles,
        routeContext,
    );

    const runtimeStateReady = Promise.all([
        dependencies.moduleRuntimeGateway.listManifests(),
        dependencies.loadModuleStates?.() ?? Promise.resolve([]),
        dependencies.loadGatewayStates?.() ?? Promise.resolve([]),
    ])
        .then(async ([manifests, savedStates, savedGatewayStates]) => {
            const saved = new Map(
                savedStates.map((row) => [row.moduleId, row.enabled]),
            );
            const pendingEnabledManifests = [];
            for (const manifest of manifests) {
                const persisted = saved.get(manifest.id);
                const isEnabled = resolveInitialModuleEnabledState(
                    manifest,
                    persisted,
                );
                if (isEnabled) pendingEnabledManifests.push(manifest);
                else
                    await dependencies.onModuleStateChanged?.(
                        manifest.id,
                        false,
                    );
            }
            let restoredInPass = true;
            while (pendingEnabledManifests.length && restoredInPass) {
                restoredInPass = false;
                for (let i = pendingEnabledManifests.length - 1; i >= 0; i--) {
                    const manifest = pendingEnabledManifests[i];
                    const dependenciesReady = (
                        manifest.hardDependencies ?? []
                    ).every((reference) => {
                        const dependency = manifests.find(
                            (candidate) =>
                                candidate.id === reference ||
                                candidate.uuid === reference,
                        );
                        return (
                            dependency !== undefined &&
                            enabledModules.has(dependency.id)
                        );
                    });
                    if (!dependenciesReady) continue;
                    enabledModules.add(manifest.id);
                    await dependencies.onModuleStateChanged?.(
                        manifest.id,
                        true,
                    );
                    pendingEnabledManifests.splice(i, 1);
                    restoredInPass = true;
                }
            }
            for (const manifest of pendingEnabledManifests) {
                await dependencies.onModuleStateChanged?.(manifest.id, false);
                log("error", "Persisted module state could not be restored.", {
                    component: "api-server",
                    operation: "restore-module-state",
                    moduleId: manifest.id,
                    hardDependencies: manifest.hardDependencies ?? [],
                });
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
            if (dependencies.gatewayRegistry) {
                for (const entry of dependencies.gatewayRegistry.list()) {
                    if (entry.required) continue;
                    const persisted = savedGateways.get(entry.id);
                    if (persisted === false) {
                        await dependencies.gatewayRegistry.disable(entry.id);
                    }
                }
                for (const entry of dependencies.gatewayRegistry.list()) {
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

    const managementCtx = routeContext.getCapability<Ctx>("system:ctx");
    const componentManagementReady = managementCtx
        ? installComponentManagement({
              ctx: managementCtx,
              routeContext,
              modules: moduleService,
              gateways: dependencies.gatewayRegistry,
              uiRegistry: dependencies.uiRegistry,
              components: () => coreComponentDependencies,
              log,
              handlers: () => [
                  moduleRoutes,
                  ...(gatewayRoutes ? [gatewayRoutes] : []),
                  ...(dependencies.routeRegistry?.getHandlers() ?? []),
              ],
          })
        : undefined;
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
            dependencies.observability?.record(
                "http.server.duration_ms",
                Date.now() - startedAt,
                labels,
            );
            dependencies.observability?.record(
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
            const owner = dependencies.routeRegistry?.findOwner(url.pathname);
            if (
                owner &&
                dependencies.gatewayRegistry?.get(owner.gatewayId)?.status ===
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

            const componentManagement = await componentManagementReady;
            if (
                componentManagement &&
                (await componentManagement.routes(req, res, url))
            )
                return;
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
            for (const entry of dependencies.routeRegistry?.getEntries() ??
                []) {
                if (
                    entry.gatewayId &&
                    dependencies.gatewayRegistry?.get(entry.gatewayId)
                        ?.status === "disabled"
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

            const handledByDocuments = await documentsRoutes(req, res, url);
            if (handledByDocuments) {
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
            await recoverComponentRequest(
                req,
                res,
                error,
                componentManagementReady,
                log,
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
    server.once("close", () => {
        void Promise.resolve(componentManagementReady)
            .then((management) => management?.dispose())
            .catch((error) =>
                log("error", "Component management cleanup failed.", {
                    component: "api",
                    operation: "disposeComponentManagement",
                    errorName:
                        error instanceof Error ? error.name : "UnknownError",
                }),
            );
    });
    return server;
}

import { runBootstrapScope } from "@cognis/core";
import { versionModuleUiAssets } from "./module-ui-assets.js";
import {
    disposeModuleResources,
    removeModuleRoutes,
} from "./module-resource-disposal.js";
import type { IncomingMessage, ServerResponse } from "node:http";
import type {
    BootstrapLog,
    Ctx,
    FlowRegistration,
    ModuleRuntimeGateway,
    RoleAccessPolicy,
    FlowApi,
    ModuleNamespacePolicy,
} from "@cognis/core";
import path from "node:path";
import { stat } from "node:fs/promises";
import { parseRoleAccessPolicy } from "../../api/reuse/parse-role-access-policy.js";
import type { RouteContext } from "../../api/reuse/route-context.js";
import type { UIRegistry } from "../../api/reuse/ui-registry.js";
import type {
    ModuleApiRouter,
    ModuleRouteOptions,
    ModuleBootstrapCtx,
    ModuleBootstrapPlugin,
    ModuleDisabledApiPlugin,
} from "./module-extension-contracts.js";
import {
    assertModuleOwnedCtxRegistration,
    assertModuleOwnedRoute,
    PRIVILEGED_FLOW_IDS,
    resolveModuleAssurance,
    resolveModulePrivilege,
    type ModuleAssurance,
    type ModulePrivilege,
} from "./module-assurance.js";

interface RouteHandler {
    method: string;
    routePath: string;
    moduleId: string;
    access?: RoleAccessPolicy;
    invalidAccessPolicy: boolean;
    allowWhenDisabled?: boolean;
    handler: (
        req: IncomingMessage,
        res: ServerResponse,
    ) => Promise<void> | void;
}

interface ModuleContributions {
    hooks: Array<{ flowId: string; stageId: string; hookId: string }>;
    capabilities: string[];
    flows: string[];
}

export interface ModuleExtensionOptions {
    uiRegistry?: UIRegistry;
    authorizeModuleNamespace?: ModuleNamespacePolicy;
    routeContext: RouteContext;
    bootstrapTimeoutMs?: number;
    onBootstrapFailed?: (moduleId: string) => Promise<void> | void;
    getProtectedRoutePrefixes?: () => readonly string[];
}

export interface ModuleExtensionRoutes {
    handle(
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean>;
    refresh(options?: { throwOnFailure?: boolean }): Promise<void>;
    uninstall(
        moduleId: string,
        options: { deleteContent: boolean },
    ): Promise<boolean>;
}

export function createModuleExtensionRoutes(
    runtime: ModuleRuntimeGateway,
    isModuleEnabled: (moduleId: string) => boolean,
    log?: BootstrapLog,
    options?: ModuleExtensionOptions,
): ModuleExtensionRoutes {
    const bootstrapTimeoutMs = options?.bootstrapTimeoutMs ?? 120_000;
    let refreshQueue = Promise.resolve();
    const activeRequests = new Set<Promise<boolean>>();
    let handlers: RouteHandler[] = [];
    if (!options?.routeContext) {
        throw new Error(
            "module_extension_route_context_missing: createModuleExtensionRoutes requires route context for module routes",
        );
    }
    const { requireRoleAccess } = options.routeContext;
    const loadedModules = new Map<
        string,
        {
            ctx: ModuleBootstrapCtx;
            plugin: ModuleBootstrapPlugin;
            dispose?: () => void | Promise<void>;
            hooks: Array<{ flowId: string; stageId: string; hookId: string }>;
            capabilities: string[];
            flows: string[];
            disposers: Array<() => void | Promise<void>>;
        }
    >();
    const externalModulesRoot =
        process.env.COGNIS_EXTERNAL_MODULES_ROOT ??
        path.resolve(process.cwd(), "external-modules");
    const assuranceByModuleId = new Map<string, ModuleAssurance>();

    function resolveHostCapability<T>(capabilityId: string): T | undefined {
        const systemCtx = options.routeContext.getCapability<Ctx>("system:ctx");
        return (
            options.routeContext.getCapability<T>(capabilityId) ??
            (systemCtx?.isPublicCapability(capabilityId)
                ? systemCtx.getCapability<T>(capabilityId)
                : undefined)
        );
    }

    function logInvalidAccessPolicy(
        method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
        moduleId: string,
        routePath: string,
        access: unknown,
    ): void {
        log?.(
            "warn",
            "Rejected module API route due to invalid access policy.",
            {
                component: "module-extension-routes",
                moduleId,
                method,
                routePath,
                access,
            },
        );
    }

    function createModuleCtx(
        manifest: {
            id: string;
            uuid: string;
            requiresCapabilities?: string[];
            version: string;
        },
        moduleRoot: string,
        nextHandlers: RouteHandler[],
        scope: {
            active: boolean;
            hooks: Array<{ flowId: string; stageId: string; hookId: string }>;
            capabilities: string[];
            flows: string[];
            disposers: Array<() => void | Promise<void>>;
        },
        moduleEnabled: boolean,
        privilege: ModulePrivilege,
    ): ModuleBootstrapCtx {
        const moduleId = manifest.id;
        function resolveCapability<T>(capabilityId: string): T | undefined {
            const capability = resolveHostCapability<T>(capabilityId);
            if (
                capabilityId !== "auth:registerProvider" ||
                typeof capability !== "function"
            ) {
                return capability;
            }
            return ((
                provider: { registerRoutes?: unknown },
                ...args: unknown[]
            ) => {
                if (
                    typeof provider?.registerRoutes === "function" &&
                    !privilege.requested
                ) {
                    throw new Error("module_privileged_access_required");
                }
                return (capability as (...input: unknown[]) => unknown)(
                    provider,
                    ...args,
                );
            }) as T;
        }
        function requireActiveBootstrap() {
            if (scope.active) return;
            throw new Error(
                `Module ${moduleId} attempted registration after bootstrap ended.`,
            );
        }

        function registerApiRoute(
            method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
            routePath: string,
            handler: RouteHandler["handler"],
            routeOptions?: ModuleRouteOptions,
        ) {
            requireActiveBootstrap();
            assertModuleOwnedRoute(
                routePath,
                moduleId,
                privilege,
                options?.authorizeModuleNamespace,
            );
            const protectedPrefixes = [
                "/api/v1/system",
                "/api/v1/auth",
                "/api/v1/users",
                "/public",
                "/ui",
            ];
            if (
                protectedPrefixes.some(
                    (prefix) =>
                        routePath === prefix ||
                        routePath.startsWith(`${prefix}/`),
                )
            ) {
                throw new Error(
                    `Module ${moduleId} attempts to register protected route: ${routePath}`,
                );
            }
            if (
                (options?.getProtectedRoutePrefixes?.() ?? []).some(
                    (prefix) =>
                        routePath === prefix ||
                        routePath.startsWith(`${prefix}/`),
                ) &&
                options?.authorizeModuleNamespace?.({
                    moduleId,
                    kind: "apiRoute",
                    id: routePath,
                }) !== true
            )
                throw new Error(
                    `Module ${moduleId} attempts to register protected route: ${routePath}`,
                );
            if (
                nextHandlers.some(
                    (entry) =>
                        entry.method === method &&
                        entry.routePath === routePath &&
                        entry.moduleId !== moduleId,
                )
            ) {
                throw new Error("module_route_conflict");
            }
            const parsedAccess = parseRoleAccessPolicy(routeOptions?.access);
            if (parsedAccess.invalid) {
                logInvalidAccessPolicy(
                    method,
                    moduleId,
                    routePath,
                    routeOptions?.access,
                );
            }
            const allowWhenDisabled = Boolean(routeOptions?.allowWhenDisabled);
            if (!moduleEnabled && !allowWhenDisabled) return;
            if (!moduleEnabled) {
                log?.(
                    "info",
                    "Registered module route for disabled configuration.",
                    {
                        component: "module-extension-routes",
                        moduleId,
                        method,
                        routePath,
                    },
                );
            }
            nextHandlers.push({
                method,
                routePath,
                moduleId,
                access: parsedAccess.access,
                invalidAccessPolicy: parsedAccess.invalid,
                allowWhenDisabled,
                handler,
            });
        }

        const router: ModuleApiRouter = {
            get(routePath, handler, routeOptions) {
                registerApiRoute("GET", routePath, handler, routeOptions);
            },
            post(routePath, handler, routeOptions) {
                registerApiRoute("POST", routePath, handler, routeOptions);
            },
            put(routePath, handler, routeOptions) {
                registerApiRoute("PUT", routePath, handler, routeOptions);
            },
            patch(routePath, handler, routeOptions) {
                registerApiRoute("PATCH", routePath, handler, routeOptions);
            },
            delete(routePath, handler, routeOptions) {
                registerApiRoute("DELETE", routePath, handler, routeOptions);
            },
        };

        const systemCtx = options.routeContext.getCapability<Ctx>("system:ctx");
        const moduleLog: BootstrapLog = (level, message, meta) => {
            log?.(level, message, {
                ...meta,
                component: `module:${moduleId}`,
                moduleId,
            });
        };
        const baseFlow = options.routeContext.flow;
        const flow: FlowApi = {
            exists: baseFlow.exists.bind(baseFlow),
            run: baseFlow.run.bind(baseFlow),
            extend(flowId, stageId, hook, handler) {
                requireActiveBootstrap();
                if (!moduleEnabled && !scope.flows.includes(flowId)) {
                    throw new Error("module_disabled_flow_not_owned");
                }
                if (PRIVILEGED_FLOW_IDS.has(flowId) && !privilege.requested) {
                    throw new Error("module_privileged_access_required");
                }
                const registered = baseFlow.extend(
                    flowId,
                    stageId,
                    hook,
                    handler,
                );
                if (registered) {
                    scope.hooks.push({
                        flowId,
                        stageId,
                        hookId: hook.id,
                    });
                }
                return registered;
            },
        };

        return {
            moduleId,
            moduleUuid: manifest.uuid,
            moduleRoot,
            flow,
            log: moduleLog,
            capabilities: {
                contribute(key, value) {
                    requireActiveBootstrap();
                    if (!moduleEnabled) return;
                    assertModuleOwnedCtxRegistration(
                        key,
                        moduleId,
                        privilege,
                        options?.authorizeModuleNamespace,
                    );
                    if (systemCtx?.hasCapability(key)) {
                        throw new Error("module_capability_conflict");
                    }
                    systemCtx?.contributeCapability(key, value);
                    scope.capabilities.push(key);
                },
                get(key) {
                    if (key === "system:ctx") return undefined;
                    return resolveCapability(key);
                },
                has(key) {
                    if (key === "system:ctx") return false;
                    return resolveCapability(key) !== undefined;
                },
                require(key) {
                    if (key === "system:ctx") {
                        throw new Error(
                            'Required capability "system:ctx" is not available.',
                        );
                    }
                    const capability = resolveCapability(key);
                    if (capability === undefined) {
                        throw new Error(
                            `Required capability "${key}" is not available.`,
                        );
                    }
                    return capability;
                },
            },
            contributeCapability(key, value) {
                requireActiveBootstrap();
                if (!moduleEnabled) return;
                assertModuleOwnedCtxRegistration(
                    key,
                    moduleId,
                    privilege,
                    options?.authorizeModuleNamespace,
                );
                if (systemCtx?.hasCapability(key)) {
                    throw new Error("module_capability_conflict");
                }
                systemCtx?.contributeCapability(key, value);
                scope.capabilities.push(key);
            },
            contributePublicCapability(key, value) {
                requireActiveBootstrap();
                if (!moduleEnabled) return;
                assertModuleOwnedCtxRegistration(
                    key,
                    moduleId,
                    privilege,
                    options?.authorizeModuleNamespace,
                );
                if (systemCtx?.hasCapability(key)) {
                    throw new Error("module_capability_conflict");
                }
                systemCtx?.contributePublicCapability(key, value);
                scope.capabilities.push(key);
            },
            registerFlow(flowRegistration) {
                requireActiveBootstrap();
                assertModuleOwnedCtxRegistration(
                    flowRegistration.id,
                    moduleId,
                    moduleEnabled
                        ? privilege
                        : { requested: false, trustedSource: false },
                    options?.authorizeModuleNamespace,
                );
                systemCtx?.registerFlow(flowRegistration);
                scope.flows.push(flowRegistration.id);
            },
            async getModuleAssurance(targetModuleId) {
                const existing = assuranceByModuleId.get(targetModuleId);
                if (existing) return { ...existing };
                const target = (await runtime.listManifests()).find(
                    (candidate) =>
                        candidate.class !== "core" &&
                        candidate.id === targetModuleId,
                );
                if (!target?.uuid) return null;
                const assurance = await resolveModuleAssurance(
                    target,
                    path.resolve(externalModulesRoot, target.uuid),
                );
                assuranceByModuleId.set(targetModuleId, assurance);
                return { ...assurance };
            },
            registerDisposer(dispose) {
                requireActiveBootstrap();
                if (typeof dispose !== "function")
                    throw new TypeError("module_disposer_required");
                scope.disposers.push(dispose);
            },
            getCapability(capabilityId) {
                if (capabilityId === "system:ctx") return undefined;
                return resolveCapability(capabilityId);
            },
            registerApiGet(routePath, handler, routeOptions) {
                registerApiRoute("GET", routePath, handler, routeOptions);
            },
            registerApiPost(routePath, handler, routeOptions) {
                registerApiRoute("POST", routePath, handler, routeOptions);
            },
            registerApiPut(routePath, handler, routeOptions) {
                registerApiRoute("PUT", routePath, handler, routeOptions);
            },
            registerApiPatch(routePath, handler, routeOptions) {
                registerApiRoute("PATCH", routePath, handler, routeOptions);
            },
            registerApiDelete(routePath, handler, routeOptions) {
                registerApiRoute("DELETE", routePath, handler, routeOptions);
            },
            router,
            registerNavbarPlugin(pluginDef) {
                requireActiveBootstrap();
                if (!moduleEnabled) return;
                const pluginConfig =
                    typeof pluginDef === "string"
                        ? { scriptUrl: pluginDef }
                        : pluginDef;
                options?.uiRegistry?.registerNavbarPlugin({
                    scriptUrl: versionModuleUiAssets(
                        pluginConfig.scriptUrl,
                        moduleId,
                        manifest.version,
                    ),
                    access: pluginConfig.access,
                    providesCapabilities: pluginConfig.providesCapabilities,
                    ownerId: moduleId,
                    isEnabled: () => isModuleEnabled(moduleId),
                });
            },
            registerCapabilityProvider(provider) {
                requireActiveBootstrap();
                if (!moduleEnabled) return;
                options?.uiRegistry?.registerCapabilityProvider({
                    ...versionModuleUiAssets(
                        provider,
                        moduleId,
                        manifest.version,
                    ),
                    ownerId: moduleId,
                    isEnabled: () => isModuleEnabled(moduleId),
                });
            },
            registerSpaRoute(route) {
                requireActiveBootstrap();
                if (!moduleEnabled) return;
                options?.uiRegistry?.registerSpaRoute({
                    ...versionModuleUiAssets(route, moduleId, manifest.version),
                    requiredCapabilities:
                        route.requiredCapabilities ??
                        manifest.requiresCapabilities?.filter((capability) =>
                            options?.uiRegistry?.hasActiveCapabilityProvider(
                                capability,
                            ),
                        ),
                    ownerId: moduleId,
                    ownerUuid: manifest.uuid,
                    isEnabled: () => isModuleEnabled(moduleId),
                });
            },
            registerAuthFooterPlugin(plugin) {
                requireActiveBootstrap();
                if (!moduleEnabled) return;
                options?.uiRegistry?.registerAuthFooterPlugin({
                    ...versionModuleUiAssets(
                        plugin,
                        moduleId,
                        manifest.version,
                    ),
                    ownerId: moduleId,
                    isEnabled: () => isModuleEnabled(moduleId),
                });
            },
            registerSettingsSection(section) {
                requireActiveBootstrap();
                if (!moduleEnabled) return;
                options?.uiRegistry?.registerSettingsSection({
                    ...versionModuleUiAssets(
                        section,
                        moduleId,
                        manifest.version,
                    ),
                    ownerId: moduleId,
                    isEnabled: () => isModuleEnabled(moduleId),
                });
            },
            registerPageExtension(pageId, element) {
                requireActiveBootstrap();
                if (!moduleEnabled) return;
                options?.uiRegistry?.registerPageExtension(pageId, {
                    ...versionModuleUiAssets(
                        element,
                        moduleId,
                        manifest.version,
                    ),
                    ownerId: moduleId,
                    isEnabled: () => isModuleEnabled(moduleId),
                });
            },
            registerAdminSection(section) {
                requireActiveBootstrap();
                if (!moduleEnabled) return;
                options?.uiRegistry?.registerAdminSection({
                    ...versionModuleUiAssets(
                        section,
                        moduleId,
                        manifest.version,
                    ),
                    ownerId: moduleId,
                    isEnabled: () => isModuleEnabled(moduleId),
                });
            },
            registerStaticDir(urlPrefix, absoluteDir) {
                requireActiveBootstrap();
                if (!moduleEnabled) return;
                const normalizedPrefix = String(urlPrefix ?? "")
                    .trim()
                    .replace(/^\/+|\/+$/g, "");
                const fullPrefix = normalizedPrefix
                    ? `${moduleId}/${normalizedPrefix}`
                    : moduleId;
                options?.uiRegistry?.registerModuleStaticDir(
                    fullPrefix,
                    absoluteDir,
                );
            },
            registerAuthTypingMessage(message) {
                requireActiveBootstrap();
                if (!moduleEnabled) return;
                options?.uiRegistry?.registerAuthTypingMessage({
                    ...message,
                    ownerType: "module",
                    ownerId: moduleId,
                    isEnabled: () => isModuleEnabled(moduleId),
                });
            },
        };
    }

    function resolveModuleEntrypointPath(
        moduleRoot: string,
        entrypoint: string | undefined,
    ): string | null {
        return entrypoint ? path.join(moduleRoot, entrypoint) : null;
    }

    async function bootstrapWithTimeout(
        plugin: ModuleBootstrapPlugin,
        moduleCtx: ModuleBootstrapCtx,
    ): Promise<void | (() => void | Promise<void>)> {
        let timer: NodeJS.Timeout | undefined;
        try {
            return await runBootstrapScope(
                options.routeContext.getCapability<Ctx>("system:ctx") ??
                    moduleCtx,
                `module:${moduleCtx.moduleId}`,
                () =>
                    Promise.race([
                        plugin.bootstrapModule!(moduleCtx),
                        new Promise<never>((_resolve, reject) => {
                            timer = setTimeout(
                                () =>
                                    reject(
                                        new Error(
                                            `Module bootstrap timed out after ${bootstrapTimeoutMs}ms`,
                                        ),
                                    ),
                                bootstrapTimeoutMs,
                            );
                        }),
                    ]),
                moduleCtx.registerDisposer.bind(moduleCtx),
            );
        } finally {
            if (timer) clearTimeout(timer);
        }
    }

    function removeOwnedContributions(
        moduleId: string,
        scope: ModuleContributions,
    ) {
        const systemCtx =
            options!.routeContext.getCapability<Ctx>("system:ctx");
        for (const hook of scope.hooks)
            systemCtx?.removeFlowStageHook(
                hook.flowId,
                hook.stageId,
                hook.hookId,
            );
        for (const capability of scope.capabilities)
            systemCtx?.removeCapability(capability);
        for (const flowId of scope.flows) systemCtx?.unregisterFlow(flowId);
        options?.uiRegistry?.unregisterModuleContributions(moduleId);
    }

    async function refresh(refreshOptions?: { throwOnFailure?: boolean }) {
        await Promise.allSettled([...activeRequests]);
        for (const [moduleId, loaded] of loadedModules) {
            await disposeModuleResources(
                [
                    loaded.plugin.teardownModule
                        ? () => loaded.plugin.teardownModule?.(loaded.ctx)
                        : undefined,
                    loaded.dispose,
                    ...loaded.disposers,
                ],
                moduleId,
                log,
            );
            removeOwnedContributions(moduleId, loaded);
        }
        loadedModules.clear();
        assuranceByModuleId.clear();
        const nextHandlers: RouteHandler[] = [];
        let refreshFailure: unknown;
        const manifests = await runtime.listManifests();

        for (const manifest of manifests) {
            if (manifest.class === "core") continue;
            const moduleEnabled = isModuleEnabled(manifest.id);
            if (!manifest.uuid) {
                log?.("error", "External module is missing its UUID.", {
                    component: "module-extension-routes",
                    moduleId: manifest.id,
                });
                continue;
            }
            const moduleRoot = path.resolve(externalModulesRoot, manifest.uuid);
            const moduleRootEntry = await stat(moduleRoot).catch(() => null);
            if (!moduleRootEntry?.isDirectory()) {
                log?.("error", "External module directory is unavailable.", {
                    component: "module-extension-routes",
                    moduleId: manifest.id,
                    moduleUuid: manifest.uuid,
                });
                continue;
            }
            const privilege = await resolveModulePrivilege(
                manifest,
                moduleRoot,
            );
            assuranceByModuleId.set(
                manifest.id,
                await resolveModuleAssurance(manifest, moduleRoot),
            );
            if (privilege.requested && !privilege.trustedSource) {
                log?.(
                    "warn",
                    "Untrusted external module requested privileged access.",
                    {
                        component: "module-extension-routes",
                        moduleId: manifest.id,
                        moduleUuid: manifest.uuid,
                        sourceRepository:
                            privilege.sourceRepository || "unknown",
                    },
                );
            }
            options?.uiRegistry?.registerModuleStaticDir(
                manifest.id,
                path.join(moduleRoot, "ui"),
            );
            const scope = {
                active: true,
                hooks: [],
                capabilities: [],
                flows: [],
                disposers: [],
            };
            const moduleCtx = createModuleCtx(
                manifest,
                moduleRoot,
                nextHandlers,
                scope,
                moduleEnabled,
                privilege,
            );
            const entrypoint = resolveModuleEntrypointPath(
                moduleRoot,
                manifest.entrypoints?.bootstrap,
            );
            const disabledApiEntrypoint = resolveModuleEntrypointPath(
                moduleRoot,
                manifest.entrypoints?.disabledApi,
            );
            if (!moduleEnabled) {
                if (!disabledApiEntrypoint) continue;
                try {
                    const plugin = (await import(
                        `${disabledApiEntrypoint}?t=${Date.now()}`
                    )) as ModuleDisabledApiPlugin;
                    await plugin.registerDisabledApiRoutes?.(moduleCtx);
                    scope.active = false;
                    loadedModules.set(manifest.id, {
                        ctx: moduleCtx,
                        plugin: {},
                        ...scope,
                    });
                } catch (error) {
                    scope.active = false;
                    await disposeModuleResources(
                        scope.disposers,
                        manifest.id,
                        log,
                    );
                    removeOwnedContributions(manifest.id, scope);
                    removeModuleRoutes(nextHandlers, manifest.id);
                    log?.("error", "Disabled module API registration failed.", {
                        component: "module-extension-routes",
                        moduleId: manifest.id,
                        error:
                            error instanceof Error
                                ? error.message
                                : String(error),
                    });
                    refreshFailure ??= error;
                }
                continue;
            }
            if (!entrypoint) continue;
            log?.("debug", "Loading module route entrypoint.", {
                component: "module-extension-routes",
                moduleId: manifest.id,
                pluginPath: entrypoint,
            });
            try {
                const plugin = (await import(
                    `${entrypoint}?t=${Date.now()}`
                )) as ModuleBootstrapPlugin;
                if (typeof plugin.bootstrapModule !== "function") {
                    throw new Error("module_bootstrap_export_missing");
                }
                const result = await bootstrapWithTimeout(plugin, moduleCtx);
                scope.active = false;
                loadedModules.set(manifest.id, {
                    ctx: moduleCtx,
                    plugin,
                    dispose: typeof result === "function" ? result : undefined,
                    ...scope,
                });
                log?.("info", "Module runtime contributions registered.", {
                    component: "module-extension-routes",
                    operation: "refresh_module_runtime",
                    moduleId: manifest.id,
                    capabilities: [...scope.capabilities],
                });
            } catch (error) {
                scope.active = false;
                await disposeModuleResources(scope.disposers, manifest.id, log);
                removeOwnedContributions(manifest.id, scope);
                removeModuleRoutes(nextHandlers, manifest.id);
                log?.("error", "Failed to load module API route plugin.", {
                    component: "module-extension-routes",
                    moduleId: manifest.id,
                    pluginPath: entrypoint,
                    error:
                        error instanceof Error ? error.message : String(error),
                });
                await options.onBootstrapFailed?.(manifest.id);
                refreshFailure ??= error;
            }
        }

        handlers = nextHandlers;
        if (refreshOptions?.throwOnFailure && refreshFailure)
            throw refreshFailure;
    }

    async function uninstall(
        moduleId: string,
        uninstallOptions: { deleteContent: boolean },
    ) {
        const manifest = (await runtime.listManifests()).find(
            (entry) => entry.id === moduleId,
        );
        if (!manifest?.uuid) return false;
        const moduleRoot = path.resolve(externalModulesRoot, manifest.uuid);
        const entrypoint = resolveModuleEntrypointPath(
            moduleRoot,
            manifest.entrypoints?.bootstrap,
        );
        if (!entrypoint) return false;
        const plugin = (await import(
            `${entrypoint}?uninstall=${Date.now()}`
        )) as ModuleBootstrapPlugin;
        if (typeof plugin.uninstallModule !== "function") return false;
        await plugin.uninstallModule(
            {
                moduleId,
                moduleRoot,
                getCapability: resolveHostCapability,
                log,
            },
            uninstallOptions,
        );
        return true;
    }

    async function handle(
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> {
        const method = (req.method || "GET").toUpperCase();
        const match = handlers.find(
            (entry) =>
                entry.method === method && entry.routePath === url.pathname,
        );
        if (!match) return false;
        if (!isModuleEnabled(match.moduleId) && !match.allowWhenDisabled) {
            res.writeHead(503, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    error: {
                        code: "module_disabled",
                        message: "Module disabled",
                    },
                }),
            );
            return true;
        }
        if (match.invalidAccessPolicy) {
            res.writeHead(403, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    error: {
                        code: "forbidden",
                        message:
                            "Route denied due to invalid access policy configuration",
                    },
                }),
            );
            return true;
        }
        if (match.access) {
            const claims = requireRoleAccess(req, res, match.access);
            if (!claims) return true;
        }
        await match.handler(req, res);
        return true;
    }

    return {
        uninstall,
        handle(req, res, url) {
            return refreshQueue.then(() => {
                const pending = handle(req, res, url);
                activeRequests.add(pending);
                const remove = () => activeRequests.delete(pending);
                void pending.then(remove, remove);
                return pending;
            });
        },
        refresh(refreshOptions) {
            const pendingRefresh = refreshQueue.then(() =>
                refresh(refreshOptions),
            );
            refreshQueue = pendingRefresh.then(
                () => undefined,
                () => undefined,
            );
            return pendingRefresh;
        },
    };
}

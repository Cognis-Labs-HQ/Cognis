import type { IncomingMessage, ServerResponse } from "node:http";
import type {
    BootstrapLog,
    Ctx,
    FlowRegistration,
    ModuleRuntimeGateway,
    RoleAccessPolicy,
    FlowApi,
} from "@cognis/core";
import path from "node:path";
import { stat } from "node:fs/promises";
import { parseRoleAccessPolicy } from "../../api/reuse/parse-role-access-policy.js";
import type { RouteContext } from "../../api/reuse/route-context.js";
import type { UIRegistry } from "../../api/reuse/ui-registry.js";

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

interface ModuleRouteOptions {
    access?: unknown;
    allowWhenDisabled?: boolean;
}

interface ModuleApiRouter {
    get(
        routePath: string,
        handler: RouteHandler["handler"],
        options?: ModuleRouteOptions,
    ): void;
    post(
        routePath: string,
        handler: RouteHandler["handler"],
        options?: ModuleRouteOptions,
    ): void;
    put(
        routePath: string,
        handler: RouteHandler["handler"],
        options?: ModuleRouteOptions,
    ): void;
    patch(
        routePath: string,
        handler: RouteHandler["handler"],
        options?: ModuleRouteOptions,
    ): void;
    delete(
        routePath: string,
        handler: RouteHandler["handler"],
        options?: ModuleRouteOptions,
    ): void;
}

interface ModuleUiRegistrationContext {
    moduleId: string;
    moduleRoot: string;
    registerNavbarPlugin(
        plugin: { scriptUrl: string; access?: RoleAccessPolicy } | string,
    ): void;
    registerSpaRoute(route: {
        id: string;
        pattern: string;
        base: string;
        scriptUrl: string;
        stylesheets?: string[];
        access?: RoleAccessPolicy;
        requiredCapabilities?: string[];
    }): void;
    registerSettingsSection(section: {
        id: string;
        label: string;
        scriptUrl: string;
        access?: RoleAccessPolicy;
        stringsBaseUrl?: string;
    }): void;
    registerPageExtension(
        pageId: string,
        element: {
            id: string;
            label: string;
            scriptUrl: string;
            access?: RoleAccessPolicy;
        },
    ): void;
    registerAdminSection(section: {
        id: string;
        label: string;
        scriptUrl: string;
        access?: RoleAccessPolicy;
        stringsBaseUrl?: string;
    }): void;
    registerStaticDir(urlPrefix: string, absoluteDir: string): void;
    registerAuthTypingMessage(message: {
        id: string;
        textKey: string;
        access?: RoleAccessPolicy;
    }): void;
}

interface ModuleApiRegistrationContext {
    moduleId: string;
    moduleRoot: string;
    getCapability<T>(capabilityId: string): T | undefined;
    capabilities: {
        contribute(key: string, value: unknown): void;
        get<T>(key: string): T | undefined;
        has(key: string): boolean;
        require<T>(key: string): T;
    };
    log?: BootstrapLog;
}

interface ModulePlugin {
    registerApiRoutes?: (
        router: ModuleApiRouter,
        ctx: ModuleApiRegistrationContext,
    ) => void;
    registerUi?: (ctx: ModuleUiRegistrationContext) => void;
}

interface ModuleBootstrapCtx
    extends ModuleUiRegistrationContext, ModuleApiRegistrationContext {
    flow: FlowApi;
    registerApiGet(
        routePath: string,
        handler: RouteHandler["handler"],
        options?: ModuleRouteOptions,
    ): void;
    registerApiPost(
        routePath: string,
        handler: RouteHandler["handler"],
        options?: ModuleRouteOptions,
    ): void;
    registerApiPut(
        routePath: string,
        handler: RouteHandler["handler"],
        options?: ModuleRouteOptions,
    ): void;
    registerApiPatch(
        routePath: string,
        handler: RouteHandler["handler"],
        options?: ModuleRouteOptions,
    ): void;
    registerApiDelete(
        routePath: string,
        handler: RouteHandler["handler"],
        options?: ModuleRouteOptions,
    ): void;
    router: ModuleApiRouter;
    contributeCapability(key: string, value: unknown): void;
    contributePublicCapability(key: string, value: unknown): void;
    registerFlow(flow: FlowRegistration): void;
}

interface ModuleBootstrapPlugin {
    bootstrapModule?: (
        ctx: ModuleBootstrapCtx,
    ) =>
        | Promise<void | (() => void | Promise<void>)>
        | void
        | (() => void | Promise<void>);
    teardownModule?: (ctx: ModuleBootstrapCtx) => Promise<void> | void;
}

export interface ModuleExtensionOptions {
    uiRegistry?: UIRegistry;
    routeContext: RouteContext;
}

export interface ModuleExtensionRoutes {
    handle(
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean>;
    refresh(): Promise<void>;
}

export function createModuleExtensionRoutes(
    runtime: ModuleRuntimeGateway,
    isModuleEnabled: (moduleId: string) => boolean,
    log?: BootstrapLog,
    options?: ModuleExtensionOptions,
): ModuleExtensionRoutes {
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
        }
    >();
    const modulesRoot =
        process.env.COGNIS_MODULES_ROOT ??
        path.resolve(process.cwd(), "src", "modules");
    const externalModulesRoot =
        process.env.COGNIS_EXTERNAL_MODULES_ROOT ??
        path.resolve(process.cwd(), "external-modules");

    /**
     * Writes a standardized warning when a module declares an invalid access policy.
     */
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
        manifest: { id: string; requiresCapabilities?: string[] },
        moduleRoot: string,
        nextHandlers: RouteHandler[],
        scope: {
            hooks: Array<{ flowId: string; stageId: string; hookId: string }>;
            capabilities: string[];
            flows: string[];
        },
    ): ModuleBootstrapCtx {
        const moduleId = manifest.id;
        function registerApiRoute(
            method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
            routePath: string,
            handler: RouteHandler["handler"],
            routeOptions?: ModuleRouteOptions,
        ) {
            const parsedAccess = parseRoleAccessPolicy(routeOptions?.access);
            if (parsedAccess.invalid) {
                logInvalidAccessPolicy(
                    method,
                    moduleId,
                    routePath,
                    routeOptions?.access,
                );
            }
            nextHandlers.push({
                method,
                routePath,
                moduleId,
                access: parsedAccess.access,
                invalidAccessPolicy: parsedAccess.invalid,
                allowWhenDisabled: Boolean(routeOptions?.allowWhenDisabled),
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
        const baseFlow = options.routeContext.flow;
        const flow: FlowApi = {
            exists: baseFlow.exists.bind(baseFlow),
            run: baseFlow.run.bind(baseFlow),
            extend(flowId, stageId, hook, handler) {
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
            moduleRoot,
            flow,
            log,
            capabilities: {
                contribute(key, value) {
                    systemCtx?.contributeCapability(key, value);
                    scope.capabilities.push(key);
                },
                get: options.routeContext.getCapability,
                has(key) {
                    return systemCtx?.hasCapability(key) ?? false;
                },
                require(key) {
                    if (!systemCtx) {
                        throw new Error(
                            `Required capability "${key}" is not available.`,
                        );
                    }
                    return systemCtx.requireCapability(key);
                },
            },
            contributeCapability(key, value) {
                systemCtx?.contributeCapability(key, value);
                scope.capabilities.push(key);
            },
            contributePublicCapability(key, value) {
                systemCtx?.contributePublicCapability(key, value);
                scope.capabilities.push(key);
            },
            registerFlow(flowRegistration) {
                systemCtx?.registerFlow(flowRegistration);
                scope.flows.push(flowRegistration.id);
            },
            getCapability: options.routeContext.getCapability,
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
                const pluginConfig =
                    typeof pluginDef === "string"
                        ? { scriptUrl: pluginDef }
                        : pluginDef;
                options?.uiRegistry?.registerNavbarPlugin({
                    scriptUrl: pluginConfig.scriptUrl,
                    access: pluginConfig.access,
                    ownerId: moduleId,
                    isEnabled: () => isModuleEnabled(moduleId),
                });
            },
            registerSpaRoute(route) {
                options?.uiRegistry?.registerSpaRoute({
                    ...route,
                    requiredCapabilities:
                        route.requiredCapabilities ??
                        manifest.requiresCapabilities?.filter((capability) =>
                            capability.startsWith("ui:"),
                        ),
                    ownerId: moduleId,
                    isEnabled: () => isModuleEnabled(moduleId),
                });
            },
            registerSettingsSection(section) {
                options?.uiRegistry?.registerSettingsSection({
                    ...section,
                    ownerId: moduleId,
                    isEnabled: () => isModuleEnabled(moduleId),
                });
            },
            registerPageExtension(pageId, element) {
                options?.uiRegistry?.registerPageExtension(pageId, {
                    ...element,
                    ownerId: moduleId,
                    isEnabled: () => isModuleEnabled(moduleId),
                });
            },
            registerAdminSection(section) {
                options?.uiRegistry?.registerAdminSection({
                    ...section,
                    ownerId: moduleId,
                    isEnabled: () => isModuleEnabled(moduleId),
                });
            },
            registerStaticDir(urlPrefix, absoluteDir) {
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
        entrypoints: { bootstrap?: string; api?: string } | undefined,
    ): { path: string; type: "bootstrap" | "legacy-api" } | null {
        if (entrypoints?.bootstrap) {
            return {
                path: path.join(moduleRoot, entrypoints.bootstrap),
                type: "bootstrap",
            };
        }
        if (entrypoints?.api) {
            return {
                path: path.join(moduleRoot, entrypoints.api),
                type: "legacy-api",
            };
        }
        return null;
    }

    async function refresh() {
        for (const [moduleId, loaded] of loadedModules) {
            for (const teardown of [
                loaded.dispose,
                loaded.plugin.teardownModule
                    ? () => loaded.plugin.teardownModule?.(loaded.ctx)
                    : undefined,
            ]) {
                try {
                    await teardown?.();
                } catch (error) {
                    log?.("error", "Module teardown hook failed.", {
                        component: "module-extension-routes",
                        moduleId,
                        error:
                            error instanceof Error
                                ? error.message
                                : String(error),
                    });
                }
            }
            const systemCtx =
                options.routeContext.getCapability<Ctx>("system:ctx");
            for (const hook of loaded.hooks) {
                systemCtx?.removeFlowStageHook(
                    hook.flowId,
                    hook.stageId,
                    hook.hookId,
                );
            }
            for (const capability of loaded.capabilities) {
                systemCtx?.removeCapability(capability);
            }
            for (const flowId of loaded.flows)
                systemCtx?.unregisterFlow(flowId);
            options?.uiRegistry?.unregisterModuleContributions(moduleId);
        }
        loadedModules.clear();
        const nextHandlers: RouteHandler[] = [];
        const manifests = await runtime.listManifests();

        for (const manifest of manifests) {
            if (!isModuleEnabled(manifest.id)) continue;
            const internalRoot = path.resolve(modulesRoot, manifest.id);
            const externalRoot = path.resolve(
                externalModulesRoot,
                manifest.uuid ?? manifest.id,
            );
            const moduleRoot = await stat(externalRoot)
                .then((entry) =>
                    entry.isDirectory() ? externalRoot : internalRoot,
                )
                .catch(() => internalRoot);
            options?.uiRegistry?.registerModuleStaticDir(
                manifest.id,
                path.join(moduleRoot, "ui"),
            );
            const scope = { hooks: [], capabilities: [], flows: [] };
            const moduleCtx = createModuleCtx(
                manifest,
                moduleRoot,
                nextHandlers,
                scope,
            );
            const entrypoint = resolveModuleEntrypointPath(
                moduleRoot,
                manifest.entrypoints,
            );
            if (!entrypoint) continue;
            log?.("debug", "Loading module route entrypoint.", {
                component: "module-extension-routes",
                moduleId: manifest.id,
                entrypoint: entrypoint.type,
                pluginPath: entrypoint.path,
            });
            try {
                const plugin = (await import(
                    `${entrypoint.path}?t=${Date.now()}`
                )) as ModulePlugin & ModuleBootstrapPlugin;
                if (typeof plugin.bootstrapModule === "function") {
                    if (plugin.registerUi || plugin.registerApiRoutes) {
                        log?.(
                            "warn",
                            "Module exports bootstrapModule and legacy route hooks; legacy hooks are ignored.",
                            {
                                component: "module-extension-routes",
                                moduleId: manifest.id,
                            },
                        );
                    }
                    const result = await plugin.bootstrapModule(moduleCtx);
                    loadedModules.set(manifest.id, {
                        ctx: moduleCtx,
                        plugin,
                        dispose:
                            typeof result === "function" ? result : undefined,
                        ...scope,
                    });
                    continue;
                }
                if (plugin.registerUi && options?.uiRegistry) {
                    plugin.registerUi(moduleCtx);
                }
                if (typeof plugin.registerApiRoutes === "function") {
                    plugin.registerApiRoutes(moduleCtx.router, moduleCtx);
                }
                loadedModules.set(manifest.id, {
                    ctx: moduleCtx,
                    plugin,
                    ...scope,
                });
            } catch (error) {
                const systemCtx =
                    options.routeContext.getCapability<Ctx>("system:ctx");
                for (const hook of scope.hooks) {
                    systemCtx?.removeFlowStageHook(
                        hook.flowId,
                        hook.stageId,
                        hook.hookId,
                    );
                }
                for (const capability of scope.capabilities) {
                    systemCtx?.removeCapability(capability);
                }
                for (const flowId of scope.flows) {
                    systemCtx?.unregisterFlow(flowId);
                }
                options?.uiRegistry?.unregisterModuleContributions(manifest.id);
                for (let index = nextHandlers.length - 1; index >= 0; index--) {
                    if (nextHandlers[index].moduleId === manifest.id) {
                        nextHandlers.splice(index, 1);
                    }
                }
                log?.("error", "Failed to load module API route plugin.", {
                    component: "module-extension-routes",
                    moduleId: manifest.id,
                    pluginPath: entrypoint.path,
                    error:
                        error instanceof Error ? error.message : String(error),
                });
            }
        }

        handlers = nextHandlers;
    }

    return {
        async handle(req, res, url) {
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
        },
        refresh,
    };
}

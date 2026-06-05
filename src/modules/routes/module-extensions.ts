import type { IncomingMessage, ServerResponse } from "node:http";
import type {
    BootstrapLog,
    ModuleRuntimeGateway,
    RoleAccessPolicy,
    FlowApi,
} from "@cognis/core";
import path from "node:path";
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
}

interface ModuleApiRegistrationContext {
    moduleId: string;
    moduleRoot: string;
    getCapability<T>(capabilityId: string): T | undefined;
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
    router: ModuleApiRouter;
}

interface ModuleBootstrapPlugin {
    bootstrapModule?: (ctx: ModuleBootstrapCtx) => Promise<void> | void;
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
    const staticDirsRegisteredByModule = new Set<string>();
    const uiHooksRegisteredByModule = new Set<string>();
    const modulesRoot =
        process.env.COGNIS_MODULES_ROOT ??
        path.resolve(process.cwd(), "src", "modules");

    /**
     * Writes a standardized warning when a module declares an invalid access policy.
     */
    function logInvalidAccessPolicy(
        method: "GET" | "POST",
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
        moduleId: string,
        moduleRoot: string,
        nextHandlers: RouteHandler[],
        allowUiRegistration: boolean,
    ): ModuleBootstrapCtx {
        function registerApiRoute(
            method: "GET" | "POST",
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
        };

        const flow: FlowApi = options.routeContext.flow;

        return {
            moduleId,
            moduleRoot,
            flow,
            getCapability: options.routeContext.getCapability,
            registerApiGet(routePath, handler, routeOptions) {
                registerApiRoute("GET", routePath, handler, routeOptions);
            },
            registerApiPost(routePath, handler, routeOptions) {
                registerApiRoute("POST", routePath, handler, routeOptions);
            },
            router,
            registerNavbarPlugin(pluginDef) {
                if (!allowUiRegistration) return;
                const pluginConfig =
                    typeof pluginDef === "string"
                        ? { scriptUrl: pluginDef }
                        : pluginDef;
                options?.uiRegistry?.registerNavbarPlugin({
                    scriptUrl: pluginConfig.scriptUrl,
                    access: pluginConfig.access,
                    isEnabled: () => isModuleEnabled(moduleId),
                });
            },
            registerSpaRoute(route) {
                if (!allowUiRegistration) return;
                options?.uiRegistry?.registerSpaRoute({
                    ...route,
                    isEnabled: () => isModuleEnabled(moduleId),
                });
            },
            registerSettingsSection(section) {
                if (!allowUiRegistration) return;
                options?.uiRegistry?.registerSettingsSection({
                    ...section,
                    isEnabled: () => isModuleEnabled(moduleId),
                });
            },
            registerPageExtension(pageId, element) {
                if (!allowUiRegistration) return;
                options?.uiRegistry?.registerPageExtension(pageId, {
                    ...element,
                    isEnabled: () => isModuleEnabled(moduleId),
                });
            },
            registerAdminSection(section) {
                if (!allowUiRegistration) return;
                options?.uiRegistry?.registerAdminSection({
                    ...section,
                    isEnabled: () => isModuleEnabled(moduleId),
                });
            },
            registerStaticDir(urlPrefix, absoluteDir) {
                if (!allowUiRegistration) return;
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
        const nextHandlers: RouteHandler[] = [];
        const manifests = await runtime.listManifests();

        for (const manifest of manifests) {
            const moduleRoot = path.resolve(modulesRoot, manifest.id);

            if (!staticDirsRegisteredByModule.has(manifest.id)) {
                options?.uiRegistry?.registerModuleStaticDir(
                    manifest.id,
                    path.join(moduleRoot, "ui"),
                );
                staticDirsRegisteredByModule.add(manifest.id);
            }

            const canRegisterUi = !uiHooksRegisteredByModule.has(manifest.id);
            const moduleCtx = createModuleCtx(
                manifest.id,
                moduleRoot,
                nextHandlers,
                canRegisterUi,
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
                    await plugin.bootstrapModule(moduleCtx);
                    if (canRegisterUi) {
                        uiHooksRegisteredByModule.add(manifest.id);
                    }
                    continue;
                }
                if (plugin.registerUi && options?.uiRegistry && canRegisterUi) {
                    plugin.registerUi(moduleCtx);
                    uiHooksRegisteredByModule.add(manifest.id);
                }
                if (typeof plugin.registerApiRoutes === "function") {
                    plugin.registerApiRoutes(moduleCtx.router, moduleCtx);
                }
            } catch (error) {
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

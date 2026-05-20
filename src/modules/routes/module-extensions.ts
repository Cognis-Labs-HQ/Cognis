import type { IncomingMessage, ServerResponse } from "node:http";
import type {
    BootstrapLog,
    ModuleRuntimeGateway,
    RoleAccessPolicy,
} from "@cognis/core";
import path from "node:path";
import { createDefaultRouteContext } from "../../api/reuse/route-context.js";
import { parseRoleAccessPolicy } from "../../api/reuse/parse-role-access-policy.js";
import type { UIRegistry } from "../../api/ui-registry.js";

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
    registerAdminSection(section: {
        id: string;
        label: string;
        scriptUrl: string;
        access?: RoleAccessPolicy;
        stringsBaseUrl?: string;
    }): void;
    registerPageExtension(pageId: string, extension: {
        id: string;
        label: string;
        scriptUrl: string;
        access?: RoleAccessPolicy;
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

export interface ModuleExtensionOptions {
    uiRegistry?: UIRegistry;
    getCapability?: <T>(capabilityId: string) => T | undefined;
    requireRoleAccess?: ReturnType<
        typeof createDefaultRouteContext
    >["requireRoleAccess"];
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
    const requireRoleAccess =
        options?.requireRoleAccess ??
        createDefaultRouteContext().requireRoleAccess;
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

            if (!manifest.entrypoints?.api) continue;

            const pluginPath = path.join(moduleRoot, manifest.entrypoints.api);
            try {
                const plugin = (await import(
                    `${pluginPath}?t=${Date.now()}`
                )) as ModulePlugin;
                if (
                    plugin.registerUi &&
                    options?.uiRegistry &&
                    !uiHooksRegisteredByModule.has(manifest.id)
                ) {
                    plugin.registerUi({
                        moduleId: manifest.id,
                        moduleRoot,
                        registerNavbarPlugin(pluginDef) {
                            const pluginConfig =
                                typeof pluginDef === "string"
                                    ? { scriptUrl: pluginDef }
                                    : pluginDef;
                            options.uiRegistry?.registerNavbarPlugin({
                                scriptUrl: pluginConfig.scriptUrl,
                                access: pluginConfig.access,
                                isEnabled: () => isModuleEnabled(manifest.id),
                            });
                        },
                        registerSpaRoute(route) {
                            options.uiRegistry?.registerSpaRoute({
                                ...route,
                                isEnabled: () => isModuleEnabled(manifest.id),
                            });
                        },
                        registerSettingsSection(section) {
                            options.uiRegistry?.registerSettingsSection({
                                ...section,
                                isEnabled: () => isModuleEnabled(manifest.id),
                            });
                        },
                        registerAdminSection(section) {
                            options.uiRegistry?.registerAdminSection(section);
                        },
                        registerPageExtension(pageId, extension) {
                            options.uiRegistry?.registerPageExtension(pageId, {
                                ...extension,
                                isEnabled: () => isModuleEnabled(manifest.id),
                            });
                        },
                        registerStaticDir(urlPrefix, absoluteDir) {
                            const normalizedPrefix = String(urlPrefix ?? "")
                                .trim()
                                .replace(/^\/+|\/+$/g, "");
                            const fullPrefix = normalizedPrefix
                                ? `${manifest.id}/${normalizedPrefix}`
                                : manifest.id;
                            options.uiRegistry?.registerModuleStaticDir(
                                fullPrefix,
                                absoluteDir,
                            );
                        },
                    });
                    uiHooksRegisteredByModule.add(manifest.id);
                }
                if (typeof plugin.registerApiRoutes === "function") {
                    plugin.registerApiRoutes(
                        {
                            get(
                                routePath: string,
                                handler: RouteHandler["handler"],
                                options?: ModuleRouteOptions,
                            ) {
                                const parsedAccess = parseRoleAccessPolicy(
                                    options?.access,
                                );
                                if (parsedAccess.invalid) {
                                    logInvalidAccessPolicy(
                                        "GET",
                                        manifest.id,
                                        routePath,
                                        options?.access,
                                    );
                                }
                                nextHandlers.push({
                                    method: "GET",
                                    routePath,
                                    moduleId: manifest.id,
                                    access: parsedAccess.access,
                                    invalidAccessPolicy: parsedAccess.invalid,
                                    allowWhenDisabled: Boolean(
                                        options?.allowWhenDisabled,
                                    ),
                                    handler,
                                });
                            },
                            post(
                                routePath: string,
                                handler: RouteHandler["handler"],
                                options?: ModuleRouteOptions,
                            ) {
                                const parsedAccess = parseRoleAccessPolicy(
                                    options?.access,
                                );
                                if (parsedAccess.invalid) {
                                    logInvalidAccessPolicy(
                                        "POST",
                                        manifest.id,
                                        routePath,
                                        options?.access,
                                    );
                                }
                                nextHandlers.push({
                                    method: "POST",
                                    routePath,
                                    moduleId: manifest.id,
                                    access: parsedAccess.access,
                                    invalidAccessPolicy: parsedAccess.invalid,
                                    allowWhenDisabled: Boolean(
                                        options?.allowWhenDisabled,
                                    ),
                                    handler,
                                });
                            },
                        },
                        {
                            moduleId: manifest.id,
                            moduleRoot,
                            getCapability:
                                options?.getCapability ?? (() => undefined),
                        },
                    );
                }
            } catch (error) {
                log?.("error", "Failed to load module API route plugin.", {
                    component: "module-extension-routes",
                    moduleId: manifest.id,
                    pluginPath,
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
                return false;
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

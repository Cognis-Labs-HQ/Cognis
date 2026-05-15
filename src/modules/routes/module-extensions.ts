import type { IncomingMessage, ServerResponse } from "node:http";
import type {
    BootstrapLog,
    ModuleRuntimeGateway,
    RoleAccessPolicy,
} from "@cognis/core";
import path from "node:path";
import { requireRoleAccess } from "../../gateways/auth/guard.js";
import { parseRoleAccessPolicy } from "../../api/reuse/parse-role-access-policy.js";
import type { UIRegistry } from "../../api/ui-registry.js";

interface RouteHandler {
    method: string;
    routePath: string;
    moduleId: string;
    access?: RoleAccessPolicy;
    invalidAccessPolicy: boolean;
    handler: (
        req: IncomingMessage,
        res: ServerResponse,
    ) => Promise<void> | void;
}

interface ModuleRouteOptions {
    access?: unknown;
}

/**
 * Minimal interface for the capability store as seen by module route plugins.
 * Modules call `capabilities.get('db:executor')` etc. to obtain gateway-
 * contributed capabilities without importing any concrete type.
 */
export interface ModuleCapabilityProvider {
    get<T>(key: string): T | undefined;
}

export interface ModuleExtensionOptions {
    /** Provider for gateway-contributed capabilities passed to each module. */
    capabilities?: ModuleCapabilityProvider;
    /**
     * UI registry used to auto-register module static directories, navbar
     * plugins, and admin sections declared in each module's manifest.
     */
    uiRegistry?: UIRegistry;
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
    const modulesRoot =
        process.env.COGNIS_MODULES_ROOT ??
        path.resolve(process.cwd(), "src", "modules");

    /**
     * Tracks module IDs for which UI contributions (static dir, navbar plugin,
     * admin section) have already been registered. UI contributions are
     * registered once at first enable and survive subsequent refresh() calls.
     */
    const registeredModuleUi = new Set<string>();

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
            if (!isModuleEnabled(manifest.id)) continue;

            const moduleRoot = path.resolve(modulesRoot, manifest.id);

            if (options?.uiRegistry && !registeredModuleUi.has(manifest.id)) {
                registeredModuleUi.add(manifest.id);

                if (manifest.ui?.staticDir) {
                    const absoluteStaticDir = path.join(
                        moduleRoot,
                        manifest.ui.staticDir,
                    );
                    options.uiRegistry.registerModuleStaticDir(
                        manifest.id,
                        absoluteStaticDir,
                    );
                    log?.("info", "Module UI static directory registered.", {
                        component: "module-extension-routes",
                        moduleId: manifest.id,
                        dir: absoluteStaticDir,
                    });
                }

                if (manifest.ui?.navbarPlugin) {
                    const scriptUrl = `/static/modules/${manifest.id}/${manifest.ui.navbarPlugin.replace(/^\.\//, "")}`;
                    const moduleIdCapture = manifest.id;
                    options.uiRegistry.registerNavbarPlugin({
                        scriptUrl,
                        isEnabled: () => isModuleEnabled(moduleIdCapture),
                    });
                    log?.("info", "Module navbar plugin registered.", {
                        component: "module-extension-routes",
                        moduleId: manifest.id,
                        scriptUrl,
                    });
                }

                if (manifest.ui?.adminSection) {
                    const scriptUrl = `/static/modules/${manifest.id}/${manifest.ui.adminSection.replace(/^\.\//, "")}`;
                    const stringsBaseUrl = `/static/modules/${manifest.id}/languages`;
                    options.uiRegistry.registerAdminSection({
                        id: `module:${manifest.id}`,
                        label: manifest.name,
                        scriptUrl,
                        stringsBaseUrl,
                    });
                    log?.("info", "Module admin section registered.", {
                        component: "module-extension-routes",
                        moduleId: manifest.id,
                        scriptUrl,
                    });
                }
            }

            if (!manifest.entrypoints?.api) continue;

            const pluginPath = path.join(moduleRoot, manifest.entrypoints.api);
            try {
                const plugin = await import(`${pluginPath}?t=${Date.now()}`);
                if (typeof plugin.registerApiRoutes === "function") {
                    plugin.registerApiRoutes({
                        capabilities: options?.capabilities ?? null,
                        get(
                            routePath: string,
                            handler: RouteHandler["handler"],
                            routeOptions?: ModuleRouteOptions,
                        ) {
                            const parsedAccess = parseRoleAccessPolicy(
                                routeOptions?.access,
                            );
                            if (parsedAccess.invalid) {
                                logInvalidAccessPolicy(
                                    "GET",
                                    manifest.id,
                                    routePath,
                                    routeOptions?.access,
                                );
                            }
                            nextHandlers.push({
                                method: "GET",
                                routePath,
                                moduleId: manifest.id,
                                access: parsedAccess.access,
                                invalidAccessPolicy: parsedAccess.invalid,
                                handler,
                            });
                        },
                        post(
                            routePath: string,
                            handler: RouteHandler["handler"],
                            routeOptions?: ModuleRouteOptions,
                        ) {
                            const parsedAccess = parseRoleAccessPolicy(
                                routeOptions?.access,
                            );
                            if (parsedAccess.invalid) {
                                logInvalidAccessPolicy(
                                    "POST",
                                    manifest.id,
                                    routePath,
                                    routeOptions?.access,
                                );
                            }
                            nextHandlers.push({
                                method: "POST",
                                routePath,
                                moduleId: manifest.id,
                                access: parsedAccess.access,
                                invalidAccessPolicy: parsedAccess.invalid,
                                handler,
                            });
                        },
                    });
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

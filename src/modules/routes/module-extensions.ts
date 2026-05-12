import type { IncomingMessage, ServerResponse } from "node:http";
import type { BootstrapLog, ModuleRuntimeGateway } from "@cognis/core";
import type { CapabilityStore } from "@cognis/core";
import path from "node:path";

interface RouteHandler {
    method: string;
    routePath: string;
    moduleId: string;
    handler: (
        req: IncomingMessage,
        res: ServerResponse,
    ) => Promise<void> | void;
}

export interface ModuleExtensionRoutes {
    handle(
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean>;
    refresh(): Promise<void>;
}

export interface ModuleApiRouteContext {
    capabilities?: CapabilityStore;
    isModuleEnabled?: (moduleId: string) => boolean;
    log?: BootstrapLog;
}

export function createModuleExtensionRoutes(
    runtime: ModuleRuntimeGateway,
    isModuleEnabled: (moduleId: string) => boolean,
    log?: BootstrapLog,
    context: ModuleApiRouteContext = {},
): ModuleExtensionRoutes {
    let handlers: RouteHandler[] = [];
    const modulesRoot =
        process.env.COGNIS_MODULES_ROOT ??
        path.resolve(process.cwd(), "src", "modules");

    async function refresh() {
        const nextHandlers: RouteHandler[] = [];
        const manifests = await runtime.listManifests();

        for (const manifest of manifests) {
            if (!manifest.entrypoints?.api || !isModuleEnabled(manifest.id))
                continue;

            const moduleRoot = path.resolve(modulesRoot, manifest.id);
            const pluginPath = path.join(moduleRoot, manifest.entrypoints.api);
            try {
                const plugin = await import(`${pluginPath}?t=${Date.now()}`);
                if (typeof plugin.registerApiRoutes === "function") {
                    const moduleContext: ModuleApiRouteContext = {
                        ...context,
                        isModuleEnabled,
                        log,
                    };
                    plugin.registerApiRoutes({
                        get(
                            routePath: string,
                            handler: RouteHandler["handler"],
                        ) {
                            nextHandlers.push({
                                method: "GET",
                                routePath,
                                moduleId: manifest.id,
                                handler,
                            });
                        },
                        post(
                            routePath: string,
                            handler: RouteHandler["handler"],
                        ) {
                            nextHandlers.push({
                                method: "POST",
                                routePath,
                                moduleId: manifest.id,
                                handler,
                            });
                        },
                    }, moduleContext);
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
            await match.handler(req, res);
            return true;
        },
        refresh,
    };
}

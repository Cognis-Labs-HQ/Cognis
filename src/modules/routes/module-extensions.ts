import type { IncomingMessage, ServerResponse } from "node:http";
import type {
    BootstrapLog,
    ModuleRuntimeGateway,
    RoleAccessPolicy,
} from "@cognis/core";
import { isAccessRole } from "@cognis/core";
import path from "node:path";
import { requireRoleAccess } from "../../gateways/auth/guard.js";

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
): ModuleExtensionRoutes {
    let handlers: RouteHandler[] = [];
    const modulesRoot =
        process.env.COGNIS_MODULES_ROOT ??
        path.resolve(process.cwd(), "src", "modules");

    function parseRoleAccessPolicy(value: unknown): {
        access?: RoleAccessPolicy;
        invalid: boolean;
    } {
        if (value === undefined) {
            return { access: undefined, invalid: false };
        }
        if (!value || typeof value !== "object" || Array.isArray(value)) {
            return { access: undefined, invalid: true };
        }
        const candidate = value as { minRole?: unknown; onlyRole?: unknown };
        const hasMinRole = "minRole" in candidate;
        const hasOnlyRole = "onlyRole" in candidate;
        if (hasMinRole && !isAccessRole(candidate.minRole)) {
            return { access: undefined, invalid: true };
        }
        if (hasOnlyRole && !isAccessRole(candidate.onlyRole)) {
            return { access: undefined, invalid: true };
        }
        const access: RoleAccessPolicy = {};
        if (isAccessRole(candidate.minRole)) {
            access.minRole = candidate.minRole;
        }
        if (isAccessRole(candidate.onlyRole)) {
            access.onlyRole = candidate.onlyRole;
        }
        if (!access.minRole && !access.onlyRole) {
            return { access: undefined, invalid: true };
        }
        return { access, invalid: false };
    }

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
                    plugin.registerApiRoutes({
                        get(
                            routePath: string,
                            handler: RouteHandler["handler"],
                            options?: ModuleRouteOptions,
                        ) {
                            const parsedAccess = parseRoleAccessPolicy(
                                options?.access,
                            );
                            if (parsedAccess.invalid) {
                                log?.(
                                    "warn",
                                    "Rejected module API route due to invalid access policy.",
                                    {
                                        component: "module-extension-routes",
                                        moduleId: manifest.id,
                                        method: "GET",
                                        routePath,
                                        access: options?.access,
                                    },
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
                            options?: ModuleRouteOptions,
                        ) {
                            const parsedAccess = parseRoleAccessPolicy(
                                options?.access,
                            );
                            if (parsedAccess.invalid) {
                                log?.(
                                    "warn",
                                    "Rejected module API route due to invalid access policy.",
                                    {
                                        component: "module-extension-routes",
                                        moduleId: manifest.id,
                                        method: "POST",
                                        routePath,
                                        access: options?.access,
                                    },
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

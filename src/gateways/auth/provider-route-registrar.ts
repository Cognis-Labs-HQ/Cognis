import type { RouteRegistry } from "../../api/reuse/route-registry.js";
import type {
    AuthProviderAdapter,
    AuthProviderRouteHandler,
    AuthProviderRouteRouter,
} from "./gateway.js";
import { serveAuthCallbackPage } from "./bootstrap/routes/pages.js";

const NAMESPACE_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const RESERVED_NAMESPACES = new Set([
    "adapters",
    "login",
    "login-link",
    "login-methods",
    "login-ui",
    "logout",
    "register",
    "registration-config",
    "security",
    "sso",
    "verify",
]);
const claimedRoutes = new Set<string>();

function normalizeRelativePath(value: string): string {
    const path = String(value ?? "").trim();
    if (
        !path.startsWith("/") ||
        path.startsWith("//") ||
        path.includes("?") ||
        path.includes("#") ||
        path.split("/").includes("..")
    ) {
        throw new Error("auth_provider_route_invalid");
    }
    return path === "/" ? "" : path.replace(/\/$/, "");
}

export function registerAuthProviderRoutes(
    routeRegistry: RouteRegistry,
    provider: AuthProviderAdapter,
    isProviderEnabled: () => boolean,
): () => void {
    if (!provider.registerRoutes) return () => {};
    const namespace = String(provider.routeNamespace ?? provider.id)
        .trim()
        .toLowerCase();
    if (
        !NAMESPACE_PATTERN.test(namespace) ||
        RESERVED_NAMESPACES.has(namespace)
    ) {
        throw new Error("auth_provider_route_namespace_invalid");
    }
    const prefix = `/api/v1/auth/${namespace}`;
    const registeredPaths = new Set<string>();
    const disposers: Array<() => boolean> = [];

    const register = (
        method: "GET" | "POST",
        path: string,
        handler: AuthProviderRouteHandler,
    ) => {
        if (typeof handler !== "function") {
            throw new Error("auth_provider_route_handler_invalid");
        }
        const routePath = `${prefix}${normalizeRelativePath(path)}`;
        const publicRoutePath = `/sso/${namespace}${normalizeRelativePath(path)}`;
        const key = `${method} ${routePath}`;
        if (registeredPaths.has(key) || claimedRoutes.has(key)) {
            throw new Error("auth_provider_route_duplicate");
        }
        registeredPaths.add(key);
        claimedRoutes.add(key);
        disposers.push(
            routeRegistry.register(async (req, res, url) => {
                if (req.method !== method || url.pathname !== routePath) {
                    return false;
                }
                if (!isProviderEnabled()) {
                    res.writeHead(503, { "content-type": "application/json" });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "provider_unavailable",
                                message: "Auth provider not available",
                            },
                        }),
                    );
                    return true;
                }
                try {
                    await handler(req, res, url);
                } catch {
                    if (!res.headersSent) {
                        res.writeHead(500, {
                            "content-type": "application/json",
                        });
                        res.end(
                            JSON.stringify({
                                error: {
                                    code: "sso_callback_failed",
                                    message:
                                        "The authentication callback could not be completed.",
                                },
                            }),
                        );
                    } else if (!res.writableEnded) {
                        res.end();
                    }
                }
                return true;
            }, "auth"),
        );
        if (method === "GET") {
            const publicKey = `${method} ${publicRoutePath}`;
            if (claimedRoutes.has(publicKey)) {
                throw new Error("auth_provider_route_duplicate");
            }
            claimedRoutes.add(publicKey);
            registeredPaths.add(publicKey);
            disposers.push(
                routeRegistry.register(async (req, res, url) => {
                    if (
                        req.method !== method ||
                        url.pathname !== publicRoutePath
                    ) {
                        return false;
                    }
                    if (!isProviderEnabled()) {
                        res.writeHead(302, {
                            location: "/login?reason=sso_provider_unavailable",
                        });
                        res.end();
                        return true;
                    }
                    if (path === "/callback" && !url.search) {
                        await serveAuthCallbackPage(res);
                        return true;
                    }
                    try {
                        await handler(req, res, url);
                    } catch {
                        if (!res.headersSent) {
                            res.writeHead(302, {
                                location: "/login?reason=sso_callback_failed",
                            });
                            res.end();
                        } else if (!res.writableEnded) {
                            res.end();
                        }
                    }
                    return true;
                }, "auth"),
            );
        }
    };
    const router: AuthProviderRouteRouter = {
        get: (path, handler) => register("GET", path, handler),
        post: (path, handler) => register("POST", path, handler),
    };
    try {
        provider.registerRoutes(router);
    } catch (error) {
        for (const dispose of disposers.reverse()) dispose();
        for (const key of registeredPaths) claimedRoutes.delete(key);
        throw error;
    }
    return () => {
        for (const dispose of disposers.reverse()) dispose();
        for (const key of registeredPaths) claimedRoutes.delete(key);
    };
}

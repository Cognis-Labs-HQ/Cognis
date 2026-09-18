import type { RouteRegistry } from "../../api/reuse/route-registry.js";
import type {
    AuthProviderAdapter,
    AuthProviderRouteHandler,
    AuthProviderRouteRouter,
} from "./gateway.js";

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
                await handler(req, res, url);
                return true;
            }, "auth"),
        );
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

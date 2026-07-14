import type { IncomingMessage, ServerResponse } from "node:http";
import { readJson, readRawBody } from "../../../api/reuse/read-json.js";
import {
    resolveRouteContext,
    type RouteContext,
} from "../../../api/reuse/route-context.js";
import {
    AccessDeniedError,
    QuotaExceededError,
    type NamespaceFileService,
} from "../reuse/namespace-file-service.js";
import { AclCeilingViolationError } from "../reuse/acl.js";
import type { NamespaceRegistry } from "../reuse/namespace-registry.js";
import type { FileQuotaStore } from "../reuse/quota-store-contract.js";

function writeJson(
    res: ServerResponse,
    status: number,
    body: Record<string, unknown>,
): void {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(body));
}

function writeError(res: ServerResponse, status: number, code: string, message: string): void {
    writeJson(res, status, { error: { code, message } });
}

function mapServiceError(res: ServerResponse, error: unknown): boolean {
    if (error instanceof AccessDeniedError) {
        writeError(res, 403, "forbidden", error.message);
        return true;
    }
    if (error instanceof QuotaExceededError) {
        writeError(res, 413, "quota_exceeded", error.message);
        return true;
    }
    if (error instanceof AclCeilingViolationError) {
        writeError(res, 400, "acl_ceiling_violation", error.message);
        return true;
    }
    return false;
}

/**
 * Namespace-scoped HTTP surface for the files gateway:
 *   PUT/GET/DELETE /api/v1/files/:namespace/*key
 *   GET            /api/v1/files/:namespace  (list)
 *
 * Every request is authenticated; the acting user becomes the FileAccessContext
 * actor and "core" is the calling component (this is core-owned HTTP traffic,
 * not an internal cross-component capability call).
 */
export function createFileRoutes(
    service: NamespaceFileService,
    routeContext?: RouteContext,
) {
    const ctx = resolveRouteContext(routeContext);
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        const listMatch = url.pathname.match(/^\/api\/v1\/files\/([^/]+)$/);
        if (listMatch && req.method === "GET") {
            const claims = ctx.requireAuth(req, res, "user");
            if (!claims) return true;
            const namespaceId = decodeURIComponent(listMatch[1]);
            const prefix = url.searchParams.get("prefix") ?? undefined;
            try {
                const entries = await service.list(
                    namespaceId,
                    {
                        actorId: claims.sub,
                        role: claims.role,
                        callerComponent: "core",
                    },
                    prefix,
                );
                writeJson(res, 200, { data: entries });
            } catch (error) {
                if (!mapServiceError(res, error)) throw error;
            }
            return true;
        }

        const objectMatch = url.pathname.match(
            /^\/api\/v1\/files\/([^/]+)\/(.+)$/,
        );
        if (!objectMatch) return false;

        const claims = ctx.requireAuth(req, res, "user");
        if (!claims) return true;
        const namespaceId = decodeURIComponent(objectMatch[1]);
        const key = decodeURIComponent(objectMatch[2]);
        const access = {
            actorId: claims.sub,
            role: claims.role,
            callerComponent: "core",
        };

        try {
            if (req.method === "PUT") {
                const body = await readRawBody(req);
                const contentType =
                    (req.headers["content-type"] ?? "")
                        .split(";")[0]
                        .trim() || undefined;
                const publicRead =
                    url.searchParams.get("publicRead") === "true";
                const stored = await service.put(namespaceId, access, key, body, {
                    contentType,
                    publicRead,
                });
                writeJson(res, 201, {
                    data: {
                        key: stored.key,
                        size: stored.size,
                        contentType: stored.contentType,
                    },
                });
                return true;
            }

            if (req.method === "GET") {
                const content = await service.get(namespaceId, access, key);
                if (!content) {
                    writeError(res, 404, "not_found", "File not found.");
                    return true;
                }
                res.writeHead(200, {
                    "content-type": "application/octet-stream",
                });
                res.end(Buffer.from(content));
                return true;
            }

            if (req.method === "DELETE") {
                const deleted = await service.delete(namespaceId, access, key);
                writeJson(res, 200, { data: { deleted } });
                return true;
            }
        } catch (error) {
            if (!mapServiceError(res, error)) throw error;
            return true;
        }

        return false;
    };
}

/**
 * Admin routes for tuning namespace default quotas and the global default,
 * plus per-user quota overrides. Requires admin role.
 */
export function createQuotaAdminRoutes(
    registry: NamespaceRegistry,
    getQuotaStore: () => FileQuotaStore | undefined,
    routeContext?: RouteContext,
) {
    const ctx = resolveRouteContext(routeContext);
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        const quotaStore = getQuotaStore();
        if (!quotaStore) return false;

        if (
            url.pathname === "/api/v1/files/admin/namespace-defaults" &&
            req.method === "GET"
        ) {
            if (!ctx.requireAuth(req, res, "admin")) return true;
            for (const namespace of registry.list()) {
                await quotaStore.ensureNamespaceDefault(namespace.id);
            }
            const defaults = await quotaStore.listNamespaceDefaults();
            const defaultsById = new Map(
                defaults.map((entry) => [entry.namespaceId, entry.quotaBytes]),
            );
            const namespaces = registry.list().map((namespace) => ({
                namespaceId: namespace.id,
                ownerComponent: namespace.ownerComponent,
                visibility: namespace.acl.visibility,
                quotaBytes: defaultsById.get(namespace.id),
            }));
            const globalDefault = await quotaStore.getGlobalDefault();
            writeJson(res, 200, { data: { namespaces, globalDefault } });
            return true;
        }

        const namespaceDefaultMatch = url.pathname.match(
            /^\/api\/v1\/files\/admin\/namespace-defaults\/([^/]+)$/,
        );
        if (namespaceDefaultMatch && req.method === "PUT") {
            if (!ctx.requireAuth(req, res, "admin")) return true;
            const namespaceId = decodeURIComponent(namespaceDefaultMatch[1]);
            const body = await readJson(req);
            const quotaBytes = Number(body.quotaBytes);
            if (!Number.isInteger(quotaBytes) || quotaBytes <= 0) {
                writeError(
                    res,
                    400,
                    "bad_request",
                    "quotaBytes must be a positive integer.",
                );
                return true;
            }
            await quotaStore.setNamespaceDefault(namespaceId, quotaBytes);
            writeJson(res, 200, { data: { namespaceId, quotaBytes } });
            return true;
        }

        if (
            url.pathname === "/api/v1/files/admin/global-default" &&
            req.method === "PUT"
        ) {
            if (!ctx.requireAuth(req, res, "admin")) return true;
            const body = await readJson(req);
            const quotaBytes = Number(body.quotaBytes);
            if (!Number.isInteger(quotaBytes) || quotaBytes <= 0) {
                writeError(
                    res,
                    400,
                    "bad_request",
                    "quotaBytes must be a positive integer.",
                );
                return true;
            }
            await quotaStore.setGlobalDefault(quotaBytes);
            writeJson(res, 200, { data: { quotaBytes } });
            return true;
        }

        const userQuotasMatch = url.pathname.match(
            /^\/api\/v1\/files\/admin\/users\/([^/]+)\/quotas$/,
        );
        if (userQuotasMatch && req.method === "GET") {
            if (!ctx.requireAuth(req, res, "admin")) return true;
            const username = decodeURIComponent(userQuotasMatch[1]);
            const namespaces = await quotaStore.listUserQuotas(username);
            const globalQuota = await quotaStore.getUserGlobalQuota(username);
            writeJson(res, 200, { data: { namespaces, globalQuota } });
            return true;
        }

        const userNamespaceQuotaMatch = url.pathname.match(
            /^\/api\/v1\/files\/admin\/users\/([^/]+)\/quotas\/([^/]+)$/,
        );
        if (userNamespaceQuotaMatch && req.method === "PUT") {
            if (!ctx.requireAuth(req, res, "admin")) return true;
            const username = decodeURIComponent(userNamespaceQuotaMatch[1]);
            const namespaceId = decodeURIComponent(userNamespaceQuotaMatch[2]);
            const body = await readJson(req);
            const quotaBytes = Number(body.quotaBytes);
            if (!Number.isInteger(quotaBytes) || quotaBytes <= 0) {
                writeError(
                    res,
                    400,
                    "bad_request",
                    "quotaBytes must be a positive integer.",
                );
                return true;
            }
            if (namespaceId === "global") {
                await quotaStore.setUserGlobalQuota(username, quotaBytes);
            } else {
                await quotaStore.setUserNamespaceQuota(
                    username,
                    namespaceId,
                    quotaBytes,
                );
            }
            writeJson(res, 200, { data: { username, namespaceId, quotaBytes } });
            return true;
        }

        return false;
    };
}

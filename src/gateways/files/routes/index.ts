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
    response: ServerResponse,
    status: number,
    body: Record<string, unknown>,
): void {
    response.writeHead(status, { "content-type": "application/json" });
    response.end(JSON.stringify(body));
}

function writeError(
    response: ServerResponse,
    status: number,
    code: string,
    message: string,
): void {
    writeJson(response, status, { error: { code, message } });
}

function mapServiceError(response: ServerResponse, error: unknown): boolean {
    if (error instanceof AccessDeniedError) {
        writeError(response, 403, "forbidden", error.message);
        return true;
    }
    if (error instanceof QuotaExceededError) {
        writeError(response, 413, "quota_exceeded", error.message);
        return true;
    }
    if (error instanceof AclCeilingViolationError) {
        writeError(response, 400, "acl_ceiling_violation", error.message);
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
        request: IncomingMessage,
        response: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        const listMatch = url.pathname.match(/^\/api\/v1\/files\/([^/]+)$/);
        if (listMatch && request.method === "GET") {
            const claims = ctx.requireAuth(request, response, "user");
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
                writeJson(response, 200, { data: entries });
            } catch (error) {
                if (!mapServiceError(response, error)) throw error;
            }
            return true;
        }

        const objectMatch = url.pathname.match(
            /^\/api\/v1\/files\/([^/]+)\/(.+)$/,
        );
        if (!objectMatch) return false;

        const claims = ctx.requireAuth(request, response, "user");
        if (!claims) return true;
        const namespaceId = decodeURIComponent(objectMatch[1]);
        const key = decodeURIComponent(objectMatch[2]);
        const access = {
            actorId: claims.sub,
            role: claims.role,
            callerComponent: "core",
        };

        try {
            if (request.method === "PUT") {
                const body = await readRawBody(request);
                const contentType =
                    (request.headers["content-type"] ?? "")
                        .split(";")[0]
                        .trim() || undefined;
                const publicRead =
                    url.searchParams.get("publicRead") === "true";
                const stored = await service.put(
                    namespaceId,
                    access,
                    key,
                    body,
                    {
                        contentType,
                        publicRead,
                    },
                );
                writeJson(response, 201, {
                    data: {
                        key: stored.key,
                        size: stored.size,
                        contentType: stored.contentType,
                    },
                });
                return true;
            }

            if (request.method === "GET") {
                const content = await service.get(namespaceId, access, key);
                if (!content) {
                    writeError(response, 404, "not_found", "File not found.");
                    return true;
                }
                response.writeHead(200, {
                    "content-type": "application/octet-stream",
                });
                response.end(Buffer.from(content));
                return true;
            }

            if (request.method === "DELETE") {
                const deleted = await service.delete(namespaceId, access, key);
                writeJson(response, 200, { data: { deleted } });
                return true;
            }
        } catch (error) {
            if (!mapServiceError(response, error)) throw error;
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
        request: IncomingMessage,
        response: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        const quotaStore = getQuotaStore();
        if (!quotaStore) return false;

        if (
            url.pathname === "/api/v1/files/admin/namespace-defaults" &&
            request.method === "GET"
        ) {
            if (!ctx.requireAuth(request, response, "admin")) return true;
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
            writeJson(response, 200, { data: { namespaces, globalDefault } });
            return true;
        }

        const namespaceDefaultMatch = url.pathname.match(
            /^\/api\/v1\/files\/admin\/namespace-defaults\/([^/]+)$/,
        );
        if (namespaceDefaultMatch && request.method === "PUT") {
            if (!ctx.requireAuth(request, response, "admin")) return true;
            const namespaceId = decodeURIComponent(namespaceDefaultMatch[1]);
            const body = await readJson(request);
            const quotaBytes = Number(body.quotaBytes);
            if (!Number.isInteger(quotaBytes) || quotaBytes <= 0) {
                writeError(
                    response,
                    400,
                    "bad_request",
                    "quotaBytes must be a positive integer.",
                );
                return true;
            }
            await quotaStore.setNamespaceDefault(namespaceId, quotaBytes);
            writeJson(response, 200, { data: { namespaceId, quotaBytes } });
            return true;
        }

        if (
            url.pathname === "/api/v1/files/admin/global-default" &&
            request.method === "PUT"
        ) {
            if (!ctx.requireAuth(request, response, "admin")) return true;
            const body = await readJson(request);
            const quotaBytes = Number(body.quotaBytes);
            if (!Number.isInteger(quotaBytes) || quotaBytes <= 0) {
                writeError(
                    response,
                    400,
                    "bad_request",
                    "quotaBytes must be a positive integer.",
                );
                return true;
            }
            await quotaStore.setGlobalDefault(quotaBytes);
            writeJson(response, 200, { data: { quotaBytes } });
            return true;
        }

        const userQuotasMatch = url.pathname.match(
            /^\/api\/v1\/files\/admin\/users\/([^/]+)\/quotas$/,
        );
        if (userQuotasMatch && request.method === "GET") {
            if (!ctx.requireAuth(request, response, "admin")) return true;
            const username = decodeURIComponent(userQuotasMatch[1]);
            const namespaces = await quotaStore.listUserQuotas(username);
            const globalQuota = await quotaStore.getUserGlobalQuota(username);
            writeJson(response, 200, { data: { namespaces, globalQuota } });
            return true;
        }

        const userNamespaceQuotaMatch = url.pathname.match(
            /^\/api\/v1\/files\/admin\/users\/([^/]+)\/quotas\/([^/]+)$/,
        );
        if (userNamespaceQuotaMatch && request.method === "PUT") {
            if (!ctx.requireAuth(request, response, "admin")) return true;
            const username = decodeURIComponent(userNamespaceQuotaMatch[1]);
            const namespaceId = decodeURIComponent(userNamespaceQuotaMatch[2]);
            const body = await readJson(request);
            const quotaBytes = Number(body.quotaBytes);
            if (!Number.isInteger(quotaBytes) || quotaBytes <= 0) {
                writeError(
                    response,
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
            writeJson(response, 200, {
                data: { username, namespaceId, quotaBytes },
            });
            return true;
        }

        return false;
    };
}

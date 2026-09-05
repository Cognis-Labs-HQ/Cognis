import type { IncomingMessage, ServerResponse } from "node:http";
import { readJson } from "../../../api/reuse/read-json.js";
import {
    resolveRouteContext,
    type RouteContext,
} from "../../../api/reuse/route-context.js";
import type { NamespaceRegistry } from "../reuse/namespace-registry.js";
import type { FileLibraryService } from "../reuse/library-service.js";

function json(res: ServerResponse, status: number, data: unknown): void {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify({ data }));
}

export function createFileLibraryRoutes(
    library: FileLibraryService,
    namespaces: NamespaceRegistry,
    routeContext?: RouteContext,
) {
    const ctx = resolveRouteContext(routeContext);
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (!url.pathname.startsWith("/api/v1/files/library")) return false;
        const claims = ctx.requireAuth(
            req,
            res,
            url.pathname.includes("/admin/") ? "admin" : "guest",
        );
        if (!claims) return true;

        if (url.pathname === "/api/v1/files/library" && req.method === "GET") {
            const namespaceIds = url.searchParams.getAll("namespace");
            const selected = namespaceIds.length
                ? namespaceIds
                : namespaces.list().map(({ id }) => id);
            json(res, 200, {
                entries: await library.list(claims.sub, claims.role, selected),
                folders: await library.listFolders(claims.sub, claims.role),
                namespaces: namespaces.list(),
                providers: [{ id: "local", name: "Local" }],
                defaultProviderId: library.getDefaultProvider(claims.sub),
            });
            return true;
        }
        if (
            url.pathname === "/api/v1/files/library/folders" &&
            req.method === "POST"
        ) {
            const body = await readJson(req);
            const name = String(body.name ?? "").trim();
            const namespaceId = String(body.namespaceId ?? "user").trim();
            if (!name || !namespaces.get(namespaceId)) {
                json(res, 400, { error: "invalid_folder" });
                return true;
            }
            json(
                res,
                201,
                library.createFolder(claims.sub, { name, namespaceId }),
            );
            return true;
        }
        const entryMatch = url.pathname.match(
            /^\/api\/v1\/files\/library\/entries\/([^/]+)\/(.+)$/,
        );
        if (entryMatch && req.method === "PATCH") {
            const body = await readJson(req);
            library.updateEntry(
                claims.sub,
                decodeURIComponent(entryMatch[1]),
                decodeURIComponent(entryMatch[2]),
                {
                    favorite:
                        typeof body.favorite === "boolean"
                            ? body.favorite
                            : undefined,
                    folderId:
                        body.folderId === null
                            ? null
                            : String(body.folderId ?? "") || undefined,
                    lastOpenedAt: body.opened
                        ? new Date().toISOString()
                        : undefined,
                },
            );
            json(res, 200, { updated: true });
            return true;
        }
        const preferenceMatch = url.pathname.match(
            /^\/api\/v1\/files\/library\/admin\/users\/([^/]+)\/provider$/,
        );
        if (preferenceMatch && req.method === "PUT") {
            const body = await readJson(req);
            const providerId = String(body.providerId ?? "").trim();
            if (providerId !== "local") {
                json(res, 400, { error: "unknown_provider" });
                return true;
            }
            library.setDefaultProvider(
                decodeURIComponent(preferenceMatch[1]),
                providerId,
            );
            json(res, 200, { providerId });
            return true;
        }
        return false;
    };
}

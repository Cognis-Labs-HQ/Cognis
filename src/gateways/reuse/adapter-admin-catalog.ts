import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { RouteContext } from "../../api/reuse/route-context.js";
import { resolveRouteContext } from "../../api/reuse/route-context.js";

interface AdapterManifest {
    id: string;
    name: string;
    version: string;
    publisher: string;
    locked?: boolean;
}

export async function loadAdapterAdminCatalog(
    adaptersRoot: string,
    adapterFamily: string,
): Promise<AdapterManifest[]> {
    const gatewayAdaptersRoot = path.join(adaptersRoot, adapterFamily);
    const entries = await readdir(gatewayAdaptersRoot, { withFileTypes: true });
    const manifests = await Promise.all(
        entries
            .filter((entry) => entry.isDirectory())
            .map(async (entry) => {
                const raw = await readFile(
                    path.join(gatewayAdaptersRoot, entry.name, "manifest.json"),
                    "utf8",
                );
                return JSON.parse(raw) as AdapterManifest;
            }),
    );
    return manifests.sort((left, right) => left.name.localeCompare(right.name));
}

export function createLockedAdapterAdminRoutes(
    gatewayId: string,
    adapters: AdapterManifest[],
    routeContext?: RouteContext,
    activeAdapterId?: string,
) {
    const ctx = resolveRouteContext(routeContext);
    const base = `/api/v1/gateways/${gatewayId}/adapters`;
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (!url.pathname.startsWith(base)) return false;
        if (!ctx.requireAuth(req, res, "admin")) return true;
        if (url.pathname === base && req.method === "GET") {
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: adapters.map((adapter) => ({
                        ...adapter,
                        active:
                            activeAdapterId === undefined ||
                            adapter.id === activeAdapterId,
                        locked: true,
                        config: {},
                        schema: [],
                        controls: {
                            config: `${base}/${encodeURIComponent(adapter.id)}/config`,
                            enable: `${base}/${encodeURIComponent(adapter.id)}/enable`,
                            disable: `${base}/${encodeURIComponent(adapter.id)}/disable`,
                        },
                    })),
                }),
            );
            return true;
        }
        const configMatch = url.pathname.match(
            new RegExp(`^${base}/([^/]+)/config$`),
        );
        if (configMatch && adapters.some(({ id }) => id === configMatch[1])) {
            if (req.method === "GET") {
                res.writeHead(200, { "content-type": "application/json" });
                res.end(JSON.stringify({ data: {}, schema: [] }));
                return true;
            }
            if (req.method === "PUT") {
                res.writeHead(204);
                res.end();
                return true;
            }
        }
        const toggleMatch = url.pathname.match(
            new RegExp(`^${base}/([^/]+)/(enable|disable)$`),
        );
        if (
            toggleMatch &&
            req.method === "POST" &&
            adapters.some(({ id }) => id === toggleMatch[1])
        ) {
            res.writeHead(409, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    error: {
                        code: "adapter_locked",
                        message: "Adapter is managed by its gateway",
                    },
                }),
            );
            return true;
        }
        return false;
    };
}

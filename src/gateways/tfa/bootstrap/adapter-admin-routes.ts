import type { IncomingMessage, ServerResponse } from "node:http";
import {
    getAuthClaims,
    readJson,
    requireAuth,
    type GatewayBootstrapContext,
} from "../../shared.js";
import { CoreTfaGateway } from "../gateway.js";

export function createTfaAdapterAdminRoutes(
    gateway: CoreTfaGateway,
    log?: GatewayBootstrapContext["log"],
) {
    const base = "/api/v1/gateways/tfa/adapters";
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        const claims = getAuthClaims(req);
        const logMeta = {
            component: "tfa-gateway",
            method: req.method ?? "GET",
            path: url.pathname,
            accountId: claims?.sub,
        };

        if (url.pathname === base && req.method === "GET") {
            if (!requireAuth(req, res, "admin")) return true;
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: gateway.listAdapters() }));
            return true;
        }

        const configMatch = url.pathname.match(
            new RegExp(`^${base}/([^/]+)/config$`),
        );
        if (configMatch) {
            if (!requireAuth(req, res, "admin")) return true;
            const adapterId = decodeURIComponent(configMatch[1]);
            const adapter = gateway.getAdapter(adapterId);
            if (!adapter) {
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "not_found",
                            message: "Adapter not found",
                        },
                    }),
                );
                return true;
            }
            if (req.method === "GET") {
                const adapterConfig = await gateway.getAdapterConfig(adapterId);
                const schema = adapter.getConfigSchema();
                const configData: Record<string, unknown> = {};
                for (const field of schema) {
                    configData[field.key] = adapterConfig[field.key] ?? null;
                }
                res.writeHead(200, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        data: configData,
                        envValues: {},
                        requiredFields: schema
                            .filter((field) => field.required)
                            .map((field) => field.key),
                        schema,
                        supportsTest: false,
                    }),
                );
                return true;
            }
            if (req.method === "PUT") {
                const body = await readJson(req);
                await gateway.saveAdapterConfig(adapterId, body);
                res.writeHead(200, { "content-type": "application/json" });
                res.end(JSON.stringify({ data: { saved: true } }));
                log?.("info", "Saved TFA adapter config.", {
                    ...logMeta,
                    adapterId,
                });
                return true;
            }
            return false;
        }

        const stateMatch = url.pathname.match(
            new RegExp(`^${base}/([^/]+)/(enable|disable)$`),
        );
        if (stateMatch && req.method === "POST") {
            if (!requireAuth(req, res, "admin")) return true;
            const adapterId = decodeURIComponent(stateMatch[1]);
            const action = stateMatch[2];
            const adapter = gateway.getAdapter(adapterId);
            if (!adapter) {
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "not_found",
                            message: "Adapter not found",
                        },
                    }),
                );
                return true;
            }
            if (action === "enable") {
                await gateway.enableAdapter(adapterId);
            } else {
                await gateway.disableAdapter(adapterId);
            }
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { updated: true } }));
            log?.("warn", "Changed TFA adapter state.", {
                ...logMeta,
                adapterId,
                action,
            });
            return true;
        }

        return false;
    };
}

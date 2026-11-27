import { buildGatewayAdapterAdminControls } from "../../../api/reuse/adapter-admin-controls.js";
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
        request: IncomingMessage,
        response: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        const claims = getAuthClaims(request);
        const logMetadata = {
            component: "tfa-gateway",
            method: request.method ?? "GET",
            path: url.pathname,
            accountId: claims?.sub,
        };

        if (url.pathname === base && request.method === "GET") {
            if (!requireAuth(request, response, "admin")) return true;
            response.writeHead(200, { "content-type": "application/json" });
            response.end(
                JSON.stringify({
                    data: gateway.listAdapters().map((adapter) => ({
                        ...adapter,
                        controls: buildGatewayAdapterAdminControls(
                            base,
                            adapter.id,
                        ),
                    })),
                }),
            );
            return true;
        }

        const configMatch = url.pathname.match(
            new RegExp(`^${base}/([^/]+)/config$`),
        );
        if (configMatch) {
            if (!requireAuth(request, response, "admin")) return true;
            const adapterId = decodeURIComponent(configMatch[1]);
            const adapter = gateway.getAdapter(adapterId);
            if (!adapter) {
                response.writeHead(404, { "content-type": "application/json" });
                response.end(
                    JSON.stringify({
                        error: {
                            code: "not_found",
                            message: "Adapter not found",
                        },
                    }),
                );
                return true;
            }
            if (request.method === "GET") {
                const adapterConfig = await gateway.getAdapterConfig(adapterId);
                const schema = adapter.getConfigSchema();
                const configData: Record<string, unknown> = {};
                for (const field of schema) {
                    configData[field.key] = adapterConfig[field.key] ?? null;
                }
                response.writeHead(200, { "content-type": "application/json" });
                response.end(
                    JSON.stringify({
                        data: configData,
                        envValues: {},
                        requiredFields: schema
                            .filter((field) => field.required)
                            .map((field) => field.key),
                        schema,
                        stringsBaseUrl: adapter.stringsBaseUrl,
                        supportsTest: false,
                    }),
                );
                return true;
            }
            if (request.method === "PUT") {
                const body = await readJson(request);
                await gateway.saveAdapterConfig(adapterId, body);
                response.writeHead(200, { "content-type": "application/json" });
                response.end(JSON.stringify({ data: { saved: true } }));
                log?.("info", "Saved TFA adapter config.", {
                    ...logMetadata,
                    adapterId,
                });
                return true;
            }
            return false;
        }

        const stateMatch = url.pathname.match(
            new RegExp(`^${base}/([^/]+)/(enable|disable)$`),
        );
        if (stateMatch && request.method === "POST") {
            if (!requireAuth(request, response, "admin")) return true;
            const adapterId = decodeURIComponent(stateMatch[1]);
            const action = stateMatch[2];
            const adapter = gateway.getAdapter(adapterId);
            if (!adapter) {
                response.writeHead(404, { "content-type": "application/json" });
                response.end(
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
            response.writeHead(200, { "content-type": "application/json" });
            response.end(JSON.stringify({ data: { updated: true } }));
            log?.("warn", "Changed TFA adapter state.", {
                ...logMetadata,
                adapterId,
                action,
            });
            return true;
        }

        return false;
    };
}

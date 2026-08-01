import type { IncomingMessage, ServerResponse } from "node:http";
import {
    getAuthClaims,
    readJson,
    requireAuth,
    type GatewayBootstrapContext,
} from "../../shared.js";
import type { CoreAuthGateway } from "../gateway.js";
import { buildGatewayAdapterAdminControls } from "../../../api/reuse/adapter-admin-controls.js";

export function createAdapterAdminRoutes(
    gatewayId: string,
    authGateway: CoreAuthGateway,
    log?: GatewayBootstrapContext["log"],
) {
    const base = `/api/v1/gateways/${gatewayId}/adapters`;

    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        const claims = getAuthClaims(req);
        const logMeta = {
            component: "auth-gateway",
            method: req.method ?? "GET",
            path: url.pathname,
            accountId: claims?.sub,
        };
        if (url.pathname === base && req.method === "GET") {
            if (!requireAuth(req, res, "admin")) return true;
            log?.("debug", "Listed auth adapters.", {
                ...logMeta,
                count: authGateway.listAdapters().length,
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: authGateway.listAdapters().map((adapter) => ({
                        ...adapter,
                        active: adapter.enabled,
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
            const adapterId = decodeURIComponent(configMatch[1]);
            const configContract =
                authGateway.getAdapterConfigContract(adapterId);

            if (req.method === "GET") {
                if (!requireAuth(req, res, "admin")) return true;
                if (!configContract) {
                    log?.(
                        "warn",
                        "Auth adapter config lookup failed because adapter was not found.",
                        {
                            ...logMeta,
                            adapterId,
                        },
                    );
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
                const storedConfig =
                    await authGateway.getPersistedConfig(adapterId);
                const redactedConfig = authGateway.redactAdapterConfig(
                    adapterId,
                    storedConfig,
                );
                const schema = configContract.schema;
                const requiredFields = schema
                    .filter((field) => field.required)
                    .map((field) => field.key);
                log?.("debug", "Read auth adapter config.", {
                    ...logMeta,
                    adapterId,
                    requiredFieldCount: requiredFields.length,
                });
                res.writeHead(200, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        data: redactedConfig.data,
                        configuredSecretFields:
                            redactedConfig.configuredSecretFields,
                        schema,
                        requiredFields,
                        configured: authGateway.isAdapterConfigured(adapterId),
                        configPopupScriptUrl:
                            configContract.configPopupScriptUrl,
                    }),
                );
                return true;
            }

            if (req.method === "PUT") {
                if (!requireAuth(req, res, "admin")) return true;
                if (!configContract) {
                    log?.(
                        "warn",
                        "Auth adapter config update failed because adapter was not found.",
                        {
                            ...logMeta,
                            adapterId,
                        },
                    );
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
                const body = await readJson(req);
                await authGateway.saveAdapterConfig(
                    adapterId,
                    body as Record<string, unknown>,
                );
                log?.("info", "Saved auth adapter config.", {
                    ...logMeta,
                    adapterId,
                    fieldCount: Object.keys(body as Record<string, unknown>)
                        .length,
                });
                res.writeHead(200, { "content-type": "application/json" });
                res.end(JSON.stringify({ data: { saved: true } }));
                return true;
            }
        }

        const testMatch = url.pathname.match(
            new RegExp(`^${base}/([^/]+)/test$`),
        );
        if (testMatch && req.method === "POST") {
            if (!requireAuth(req, res, "admin")) return true;
            const adapterId = decodeURIComponent(testMatch[1]);
            const configContract =
                authGateway.getAdapterConfigContract(adapterId);
            if (!configContract || !configContract.supportsTest) {
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
            const body = (await readJson(req)) as Record<string, unknown>;
            try {
                const data = await authGateway.testAdapterConfiguration(
                    adapterId,
                    body,
                );
                res.writeHead(200, { "content-type": "application/json" });
                res.end(JSON.stringify({ data }));
            } catch (error) {
                log?.("error", "Auth adapter configuration test failed.", {
                    ...logMeta,
                    adapterId,
                    operation: "test_adapter_configuration",
                    error:
                        error instanceof Error ? error.message : String(error),
                    cause:
                        error instanceof Error && error.cause instanceof Error
                            ? error.cause.message
                            : undefined,
                });
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: `${adapterId}_test_failed`,
                            message:
                                error instanceof Error
                                    ? error.message
                                    : "LDAP test failed",
                        },
                    }),
                );
            }
            return true;
        }

        const enableMatch = url.pathname.match(
            new RegExp(`^${base}/([^/]+)/(enable|disable)$`),
        );
        if (enableMatch && req.method === "POST") {
            if (!requireAuth(req, res, "admin")) return true;
            const adapterId = decodeURIComponent(enableMatch[1]);
            const action = enableMatch[2];
            const configContract =
                authGateway.getAdapterConfigContract(adapterId);
            if (authGateway.isAdapterLocked(adapterId)) {
                log?.(
                    "warn",
                    "Blocked attempt to disable locked auth adapter.",
                    {
                        ...logMeta,
                        adapterId,
                    },
                );
                res.writeHead(403, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "locked_adapter",
                            message:
                                "This authentication adapter is always on and cannot be toggled",
                        },
                    }),
                );
                return true;
            }
            if (!configContract) {
                log?.(
                    "warn",
                    "Auth adapter toggle failed because adapter was not found.",
                    {
                        ...logMeta,
                        adapterId,
                        action,
                    },
                );
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
                if (!authGateway.isAdapterConfigured(adapterId)) {
                    res.writeHead(409, {
                        "content-type": "application/json",
                    });
                    res.end(
                        JSON.stringify({
                            error: {
                                code: "setup_required",
                                message:
                                    "This adapter must be configured before it can be enabled.",
                            },
                        }),
                    );
                    return true;
                }
                await authGateway.enableAdapter(adapterId);
            } else {
                await authGateway.disableAdapter(adapterId);
            }
            log?.("info", `Auth adapter ${action}d.`, {
                ...logMeta,
                adapterId,
            });
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { ok: true } }));
            return true;
        }

        return false;
    };
}

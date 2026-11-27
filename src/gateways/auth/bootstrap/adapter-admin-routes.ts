import type { IncomingMessage, ServerResponse } from "node:http";
import {
    getAuthClaims,
    readJson,
    requireAuth,
    type GatewayBootstrapContext,
} from "../../shared.js";
import type { CoreAuthGateway } from "../gateway.js";
import { buildGatewayAdapterAdminControls } from "../../../api/reuse/adapter-admin-controls.js";
import type { FlowApi } from "@cognis/core";

export function createAdapterAdminRoutes(
    gatewayId: string,
    authGateway: CoreAuthGateway,
    flow: FlowApi,
    log?: GatewayBootstrapContext["log"],
) {
    const base = `/api/v1/gateways/${gatewayId}/adapters`;

    return async (
        request: IncomingMessage,
        response: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        const claims = getAuthClaims(request);
        const logMetadata = {
            component: "auth-gateway",
            method: request.method ?? "GET",
            path: url.pathname,
            accountId: claims?.sub,
        };
        if (url.pathname === base && request.method === "GET") {
            if (!requireAuth(request, response, "admin")) return true;
            log?.("debug", "Listed auth adapters.", {
                ...logMetadata,
                count: authGateway.listAdapters().length,
            });
            response.writeHead(200, { "content-type": "application/json" });
            response.end(
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

            if (request.method === "GET") {
                if (!requireAuth(request, response, "admin")) return true;
                if (!configContract) {
                    log?.(
                        "warn",
                        "Auth adapter config lookup failed because adapter was not found.",
                        {
                            ...logMetadata,
                            adapterId,
                        },
                    );
                    response.writeHead(404, {
                        "content-type": "application/json",
                    });
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
                    ...logMetadata,
                    adapterId,
                    requiredFieldCount: requiredFields.length,
                });
                response.writeHead(200, { "content-type": "application/json" });
                response.end(
                    JSON.stringify({
                        data: redactedConfig.data,
                        configuredSecretFields:
                            redactedConfig.configuredSecretFields,
                        schema,
                        requiredFields,
                        configured: authGateway.isAdapterConfigured(adapterId),
                        configPopupScriptUrl:
                            configContract.configPopupScriptUrl,
                        stringsBaseUrl: configContract.stringsBaseUrl,
                    }),
                );
                return true;
            }

            if (request.method === "PUT") {
                if (!requireAuth(request, response, "admin")) return true;
                if (!configContract) {
                    log?.(
                        "warn",
                        "Auth adapter config update failed because adapter was not found.",
                        {
                            ...logMetadata,
                            adapterId,
                        },
                    );
                    response.writeHead(404, {
                        "content-type": "application/json",
                    });
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
                const body = await readJson(request);
                const previousConfig =
                    await authGateway.getPersistedConfig(adapterId);
                await flow.run("reconcile-auth-sources", {
                    adapterId,
                    previousConfig,
                    nextConfig: body,
                    disabled: false,
                });
                await authGateway.saveAdapterConfig(
                    adapterId,
                    body as Record<string, unknown>,
                );
                log?.("info", "Saved auth adapter config.", {
                    ...logMetadata,
                    adapterId,
                    fieldCount: Object.keys(body as Record<string, unknown>)
                        .length,
                });
                response.writeHead(200, { "content-type": "application/json" });
                response.end(JSON.stringify({ data: { saved: true } }));
                return true;
            }
        }

        const testMatch = url.pathname.match(
            new RegExp(`^${base}/([^/]+)/test$`),
        );
        if (testMatch && request.method === "POST") {
            if (!requireAuth(request, response, "admin")) return true;
            const adapterId = decodeURIComponent(testMatch[1]);
            const configContract =
                authGateway.getAdapterConfigContract(adapterId);
            if (!configContract || !configContract.supportsTest) {
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
            const body = (await readJson(request)) as Record<string, unknown>;
            try {
                const data = await authGateway.testAdapterConfiguration(
                    adapterId,
                    body,
                );
                response.writeHead(200, { "content-type": "application/json" });
                response.end(JSON.stringify({ data }));
            } catch (error) {
                const fieldErrors =
                    error instanceof Error &&
                    "fieldErrors" in error &&
                    error.fieldErrors &&
                    typeof error.fieldErrors === "object"
                        ? error.fieldErrors
                        : undefined;
                log?.("error", "Auth adapter configuration test failed.", {
                    ...logMetadata,
                    adapterId,
                    operation: "test_adapter_configuration",
                    error:
                        error instanceof Error ? error.message : String(error),
                    cause:
                        error instanceof Error && error.cause instanceof Error
                            ? error.cause.message
                            : undefined,
                });
                response.writeHead(400, { "content-type": "application/json" });
                response.end(
                    JSON.stringify({
                        error: {
                            code: `${adapterId}_test_failed`,
                            message:
                                error instanceof Error
                                    ? error.message
                                    : "LDAP test failed",
                            ...(fieldErrors ? { fieldErrors } : {}),
                        },
                    }),
                );
            }
            return true;
        }

        const enableMatch = url.pathname.match(
            new RegExp(`^${base}/([^/]+)/(enable|disable)$`),
        );
        if (enableMatch && request.method === "POST") {
            if (!requireAuth(request, response, "admin")) return true;
            const adapterId = decodeURIComponent(enableMatch[1]);
            const action = enableMatch[2];
            const configContract =
                authGateway.getAdapterConfigContract(adapterId);
            if (authGateway.isAdapterLocked(adapterId)) {
                log?.(
                    "warn",
                    "Blocked attempt to disable locked auth adapter.",
                    {
                        ...logMetadata,
                        adapterId,
                    },
                );
                response.writeHead(403, { "content-type": "application/json" });
                response.end(
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
                        ...logMetadata,
                        adapterId,
                        action,
                    },
                );
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
                if (!authGateway.isAdapterConfigured(adapterId)) {
                    response.writeHead(409, {
                        "content-type": "application/json",
                    });
                    response.end(
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
                const previousConfig =
                    await authGateway.getPersistedConfig(adapterId);
                await authGateway.disableAdapter(adapterId);
                await flow.run("reconcile-auth-sources", {
                    adapterId,
                    previousConfig,
                    nextConfig: previousConfig,
                    disabled: true,
                });
            }
            log?.("info", `Auth adapter ${action}d.`, {
                ...logMetadata,
                adapterId,
            });
            response.writeHead(200, { "content-type": "application/json" });
            response.end(JSON.stringify({ data: { ok: true } }));
            return true;
        }

        return false;
    };
}

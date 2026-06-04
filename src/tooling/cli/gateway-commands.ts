import { mergePayloadFields, requireArgs } from "./command-utils.ts";
import { renderGatewayMutation, renderGatewaysList } from "./formatters.ts";
import { apiGet, apiPost } from "./http.ts";
import { register } from "./registry.ts";

export function registerGatewayCommands(): void {
    register(
        "gateway:list",
        async ({ apiBaseUrl, getApiToken }) => {
            return apiGet(apiBaseUrl, "/api/v1/gateways", await getApiToken());
        },
        {
            usage: "cognisctl gateway:list",
            description: "List all registered gateways with their status.",
            render: renderGatewaysList,
        },
    );

    register(
        "gateway:enable",
        async ({ args, apiBaseUrl, getApiToken }) => {
            const [gatewayId] = args;
            requireArgs(
                args,
                ["gatewayId"],
                "cognisctl gateway:enable <gatewayId>",
            );

            const payload = await apiPost(
                apiBaseUrl,
                `/api/v1/gateways/${encodeURIComponent(gatewayId)}/enable`,
                undefined,
                await getApiToken(),
            );

            return mergePayloadFields(payload, { gatewayId });
        },
        {
            usage: "cognisctl gateway:enable <gatewayId>",
            description: "Enable a gateway by ID.",
            render: (payload) =>
                renderGatewayMutation("Gateway Enabled", payload),
        },
    );

    register(
        "gateway:disable",
        async ({ args, apiBaseUrl, getApiToken }) => {
            const [gatewayId] = args;
            requireArgs(
                args,
                ["gatewayId"],
                "cognisctl gateway:disable <gatewayId>",
            );

            const payload = await apiPost(
                apiBaseUrl,
                `/api/v1/gateways/${encodeURIComponent(gatewayId)}/disable`,
                undefined,
                await getApiToken(),
            );

            return mergePayloadFields(payload, { gatewayId });
        },
        {
            usage: "cognisctl gateway:disable <gatewayId>",
            description: "Disable a gateway by ID.",
            render: (payload) =>
                renderGatewayMutation("Gateway Disabled", payload),
        },
    );
}

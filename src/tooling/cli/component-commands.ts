import { ensureBooleanAcknowledgement, requireArgs } from "./command-utils.ts";
import {
    formatStructured,
    renderComponentMutation,
    renderComponentsList,
} from "./formatters.ts";
import { apiGet, apiPost } from "./http.ts";
import { register } from "./registry.ts";

export function registerComponentCommands(): void {
    register(
        "component:list",
        async ({ apiBaseUrl, getApiToken }) => {
            const payload = (await apiGet(
                apiBaseUrl,
                "/api/v1/modules",
                await getApiToken(),
            )) as {
                data: Array<{ id: string; version: string; class: string }>;
            };

            const data = payload.data.map((moduleEntry) => ({
                ...moduleEntry,
                status: moduleEntry.class === "core" ? "enabled" : "available",
            }));

            return { data };
        },
        {
            usage: "cognisctl component:list",
            description: "List available modules from the API with status.",
            render: renderComponentsList,
        },
    );

    register(
        "component:import-github",
        async ({ args, apiBaseUrl, getApiToken }) => {
            const [repositoryUrl, versionTag] = args;
            requireArgs(
                args,
                ["repositoryUrl", "versionTag"],
                "cognisctl component:import-github <repositoryUrl> <versionTag>",
            );

            return apiPost(
                apiBaseUrl,
                "/api/v1/modules/import/github",
                { repositoryUrl, versionTag },
                await getApiToken(),
            );
        },
        {
            usage: "cognisctl component:import-github <repositoryUrl> <versionTag>",
            description:
                "Import a module release from a GitHub repository tag.",
            render: formatStructured,
        },
    );

    register(
        "component:enable",
        async ({ args, apiBaseUrl, getApiToken }) => {
            const [componentType, moduleId] = args;
            requireArgs(
                args,
                ["componentType", "moduleId"],
                "cognisctl component:enable module <moduleId>",
            );

            if (componentType === "module") {
                const acknowledge = args.includes("--ack-external-disclaimer");
                const route = `/api/v1/modules/${encodeURIComponent(moduleId)}/enable${acknowledge ? "?acknowledgeExternalDisclaimer=true" : ""}`;
                const payload = await apiPost(
                    apiBaseUrl,
                    route,
                    undefined,
                    await getApiToken(),
                );

                ensureBooleanAcknowledgement(
                    payload,
                    "enabled",
                    true,
                    `Module "${moduleId}" was not enabled`,
                );

                return payload;
            }

            if (componentType === "gateway") {
                return apiPost(
                    apiBaseUrl,
                    `/api/v1/gateways/${encodeURIComponent(moduleId)}/enable`,
                    undefined,
                    await getApiToken(),
                );
            }

            if (componentType === "adapter") {
                const adapterId = args[2];
                requireArgs(
                    args,
                    ["componentType", "gatewayId", "adapterId"],
                    "cognisctl component:enable adapter <gatewayId> <adapterId>",
                );
                return apiPost(
                    apiBaseUrl,
                    `/api/v1/gateways/${encodeURIComponent(moduleId)}/adapters/${encodeURIComponent(adapterId)}/enable`,
                    undefined,
                    await getApiToken(),
                );
            }

            throw new Error(
                'Expected component type "module", "gateway", or "adapter".',
            );
        },
        {
            usage: "cognisctl component:enable <module|gateway|adapter> <id> [adapterId]",
            description:
                "Enable a module, gateway, or adapter component by ID.",
            render: (payload) =>
                renderComponentMutation("Component Enabled", payload),
        },
    );

    register(
        "component:disable",
        async ({ args, apiBaseUrl, getApiToken }) => {
            const [componentType, moduleId] = args;
            requireArgs(
                args,
                ["componentType", "moduleId"],
                "cognisctl component:disable module <moduleId>",
            );

            if (componentType === "module") {
                const payload = await apiPost(
                    apiBaseUrl,
                    `/api/v1/modules/${encodeURIComponent(moduleId)}/disable`,
                    undefined,
                    await getApiToken(),
                );

                ensureBooleanAcknowledgement(
                    payload,
                    "enabled",
                    false,
                    `Module "${moduleId}" was not disabled`,
                );

                return payload;
            }

            if (componentType === "gateway") {
                return apiPost(
                    apiBaseUrl,
                    `/api/v1/gateways/${encodeURIComponent(moduleId)}/disable`,
                    undefined,
                    await getApiToken(),
                );
            }

            if (componentType === "adapter") {
                const adapterId = args[2];
                requireArgs(
                    args,
                    ["componentType", "gatewayId", "adapterId"],
                    "cognisctl component:disable adapter <gatewayId> <adapterId>",
                );
                return apiPost(
                    apiBaseUrl,
                    `/api/v1/gateways/${encodeURIComponent(moduleId)}/adapters/${encodeURIComponent(adapterId)}/disable`,
                    undefined,
                    await getApiToken(),
                );
            }

            throw new Error(
                'Expected component type "module", "gateway", or "adapter".',
            );
        },
        {
            usage: "cognisctl component:disable <module|gateway|adapter> <id> [adapterId]",
            description:
                "Disable a module, gateway, or adapter component by ID.",
            render: (payload) =>
                renderComponentMutation("Component Disabled", payload),
        },
    );
}

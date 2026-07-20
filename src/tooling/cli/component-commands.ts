import {
    ensureBooleanAcknowledgement,
    mergePayloadFields,
    requireArgs,
} from "./command-utils.ts";
import {
    formatStructured,
    renderComponentMutation,
    renderComponentsList,
} from "./formatters.ts";
import { ApiRequestError, apiGet, apiPost, apiPut } from "./http.ts";
import { register } from "./registry.ts";

type ComponentType = "module" | "gateway" | "adapter";

interface ComponentListEntry {
    id: string;
    type: ComponentType;
    version?: string;
    status?: string;
    gatewayId?: string;
}

interface GatewayListEntry {
    id: string;
    version?: string;
    status?: string;
}

interface AdapterListEntry {
    id?: string;
    adapterId?: string;
    senderId?: string;
    name?: string;
    version?: string;
    status?: string;
    enabled?: boolean;
    active?: boolean;
}

function encodePath(value: string): string {
    return encodeURIComponent(value);
}

function normalizeAdapterId(adapter: AdapterListEntry): string {
    return (
        adapter.adapterId ??
        adapter.senderId ??
        adapter.id ??
        adapter.name ??
        "adapter"
    );
}

function normalizeAdapterStatus(adapter: AdapterListEntry): string | undefined {
    if (typeof adapter.enabled === "boolean") {
        return adapter.enabled ? "enabled" : "disabled";
    }
    if (typeof adapter.active === "boolean") {
        return adapter.active ? "enabled" : "disabled";
    }
    return adapter.status;
}

interface AdapterConfigPayload {
    data?: Record<string, unknown>;
    schema?: Array<{ key?: string }>;
}

function getUserConfigKeys(payload: AdapterConfigPayload): Set<string> {
    return new Set(
        (payload.schema ?? [])
            .map((field) => field.key)
            .filter(
                (key): key is string =>
                    typeof key === "string" && key.length > 0,
            ),
    );
}

function filterUserConfigPayload(
    payload: AdapterConfigPayload,
): AdapterConfigPayload {
    const userKeys = getUserConfigKeys(payload);
    const data = payload.data ?? {};
    return {
        ...payload,
        data: Object.fromEntries(
            Object.entries(data).filter(([key]) => userKeys.has(key)),
        ),
    };
}

function validateUserConfigUpdate(
    config: unknown,
    currentConfig: AdapterConfigPayload,
): Record<string, unknown> {
    if (config == null || typeof config !== "object" || Array.isArray(config)) {
        throw new Error("Expected config JSON to be an object.");
    }
    const userKeys = getUserConfigKeys(currentConfig);
    const configRecord = config as Record<string, unknown>;
    const unsupportedKeys = Object.keys(configRecord).filter(
        (key) => !userKeys.has(key),
    );
    if (unsupportedKeys.length > 0) {
        throw new Error(
            `Config field(s) are not user-configurable: ${unsupportedKeys.join(", ")}`,
        );
    }
    return configRecord;
}

function parseJsonArgument(value: string | undefined): unknown {
    if (!value) return {};
    return JSON.parse(value) as unknown;
}

function adapterRoute(
    gatewayId: string,
    adapterId: string,
    suffix: string,
): string {
    return `/api/v1/gateways/${encodePath(gatewayId)}/adapters/${encodePath(adapterId)}${suffix}`;
}

async function loadAdapterComponents(
    apiBaseUrl: string,
    token: string,
    gateway: GatewayListEntry,
): Promise<ComponentListEntry[]> {
    let payload: { data?: AdapterListEntry[] };

    try {
        payload = (await apiGet(
            apiBaseUrl,
            `/api/v1/gateways/${encodePath(gateway.id)}/adapters`,
            token,
        )) as { data?: AdapterListEntry[] };
    } catch (error) {
        if (error instanceof ApiRequestError && error.status === 404) {
            return [];
        }
        throw error;
    }

    return (payload.data ?? []).map((adapter) => ({
        id: normalizeAdapterId(adapter),
        type: "adapter",
        version: adapter.version,
        status: normalizeAdapterStatus(adapter),
        gatewayId: gateway.id,
    }));
}

async function loadComponentList(
    apiBaseUrl: string,
    token: string,
): Promise<ComponentListEntry[]> {
    const [modulePayload, gatewayPayload] = (await Promise.all([
        apiGet(apiBaseUrl, "/api/v1/modules", token),
        apiGet(apiBaseUrl, "/api/v1/gateways", token),
    ])) as [
        { data?: Array<{ id: string; version?: string; status?: string }> },
        { data?: GatewayListEntry[] },
    ];
    const gateways = gatewayPayload.data ?? [];
    const adapterComponents = await Promise.all(
        gateways.map((gateway) =>
            loadAdapterComponents(apiBaseUrl, token, gateway),
        ),
    );

    return [
        ...(modulePayload.data ?? []).map((moduleEntry) => ({
            id: moduleEntry.id,
            type: "module" as const,
            version: moduleEntry.version,
            status: moduleEntry.status,
        })),
        ...gateways.map((gateway) => ({
            id: gateway.id,
            type: "gateway" as const,
            version: gateway.version,
            status: gateway.status,
        })),
        ...adapterComponents.flat(),
    ];
}

export function registerComponentCommands(): void {
    register(
        "component:list",
        async ({ apiBaseUrl, getApiToken }) => {
            return {
                data: await loadComponentList(apiBaseUrl, await getApiToken()),
            };
        },
        {
            usage: "cognisctl component:list",
            description: "List modules, gateways, and adapters with status.",
            render: renderComponentsList,
        },
    );

    register(
        "component:import",
        async ({ args, apiBaseUrl, getApiToken }) => {
            const [repositoryUrl, versionTag] = args;
            requireArgs(
                args,
                ["repositoryUrl", "versionTag"],
                "cognisctl component:import <repositoryUrl> <versionTag>",
            );

            return apiPost(
                apiBaseUrl,
                "/api/v1/modules/import/github",
                { repositoryUrl, versionTag },
                await getApiToken(),
            );
        },
        {
            usage: "cognisctl component:import <repositoryUrl> <versionTag>",
            description:
                "Import a module release from a GitHub repository tag.",
            render: formatStructured,
        },
    );

    register(
        "component:config:get",
        async ({ args, apiBaseUrl, getApiToken }) => {
            const [componentType, gatewayId, adapterId] = args;
            requireArgs(
                args,
                ["componentType", "gatewayId", "adapterId"],
                "cognisctl component:config:get adapter <gatewayId> <adapterId>",
            );
            if (componentType !== "adapter") {
                throw new Error('Expected component type "adapter".');
            }
            const token = await getApiToken();
            return filterUserConfigPayload(
                (await apiGet(
                    apiBaseUrl,
                    adapterRoute(gatewayId, adapterId, "/config"),
                    token,
                )) as AdapterConfigPayload,
            );
        },
        {
            usage: "cognisctl component:config:get adapter <gatewayId> <adapterId>",
            description: "Read an adapter component configuration.",
            render: formatStructured,
        },
    );

    register(
        "component:config:set",
        async ({ args, apiBaseUrl, getApiToken }) => {
            const [componentType, gatewayId, adapterId, configJson] = args;
            requireArgs(
                args,
                ["componentType", "gatewayId", "adapterId", "configJson"],
                "cognisctl component:config:set adapter <gatewayId> <adapterId> <config-json>",
            );
            if (componentType !== "adapter") {
                throw new Error('Expected component type "adapter".');
            }
            const token = await getApiToken();
            const currentConfig = (await apiGet(
                apiBaseUrl,
                adapterRoute(gatewayId, adapterId, "/config"),
                token,
            )) as AdapterConfigPayload;
            return apiPut(
                apiBaseUrl,
                adapterRoute(gatewayId, adapterId, "/config"),
                validateUserConfigUpdate(
                    parseJsonArgument(configJson),
                    currentConfig,
                ),
                token,
            );
        },
        {
            usage: "cognisctl component:config:set adapter <gatewayId> <adapterId> <config-json>",
            description: "Update an adapter component configuration.",
            render: formatStructured,
        },
    );

    register(
        "component:test",
        async ({ args, apiBaseUrl, getApiToken }) => {
            const [componentType, gatewayId, adapterId, bodyJson] = args;
            requireArgs(
                args,
                ["componentType", "gatewayId", "adapterId"],
                "cognisctl component:test adapter <gatewayId> <adapterId> [body-json]",
            );
            if (componentType !== "adapter") {
                throw new Error('Expected component type "adapter".');
            }
            return apiPost(
                apiBaseUrl,
                adapterRoute(gatewayId, adapterId, "/test"),
                parseJsonArgument(bodyJson),
                await getApiToken(),
            );
        },
        {
            usage: "cognisctl component:test adapter <gatewayId> <adapterId> [body-json]",
            description: "Run an adapter component test endpoint.",
            render: formatStructured,
        },
    );

    register(
        "component:enable",
        async ({ args, apiBaseUrl, getApiToken }) => {
            const [componentType, componentId] = args;
            requireArgs(
                args,
                ["componentType", "componentId"],
                "cognisctl component:enable module <moduleId>",
            );

            if (componentType === "module") {
                const acknowledge = args.includes("--ack-external-disclaimer");
                const route = `/api/v1/modules/${encodePath(componentId)}/enable${acknowledge ? "?acknowledgeExternalDisclaimer=true" : ""}`;
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
                    `Module "${componentId}" was not enabled`,
                );

                return mergePayloadFields(payload, {
                    componentId,
                    componentType,
                });
            }

            if (componentType === "gateway") {
                const payload = await apiPost(
                    apiBaseUrl,
                    `/api/v1/gateways/${encodePath(componentId)}/enable`,
                    undefined,
                    await getApiToken(),
                );
                return mergePayloadFields(payload, {
                    componentId,
                    componentType,
                });
            }

            if (componentType === "adapter") {
                const adapterId = args[2];
                requireArgs(
                    args,
                    ["componentType", "gatewayId", "adapterId"],
                    "cognisctl component:enable adapter <gatewayId> <adapterId>",
                );
                const payload = await apiPost(
                    apiBaseUrl,
                    adapterRoute(componentId, adapterId, "/enable"),
                    undefined,
                    await getApiToken(),
                );
                return mergePayloadFields(payload, {
                    componentId: adapterId,
                    componentType,
                    gatewayId: componentId,
                });
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
            const [componentType, componentId] = args;
            requireArgs(
                args,
                ["componentType", "componentId"],
                "cognisctl component:disable module <moduleId>",
            );

            if (componentType === "module") {
                const payload = await apiPost(
                    apiBaseUrl,
                    `/api/v1/modules/${encodePath(componentId)}/disable`,
                    undefined,
                    await getApiToken(),
                );

                ensureBooleanAcknowledgement(
                    payload,
                    "enabled",
                    false,
                    `Module "${componentId}" was not disabled`,
                );

                return mergePayloadFields(payload, {
                    componentId,
                    componentType,
                });
            }

            if (componentType === "gateway") {
                const payload = await apiPost(
                    apiBaseUrl,
                    `/api/v1/gateways/${encodePath(componentId)}/disable`,
                    undefined,
                    await getApiToken(),
                );
                return mergePayloadFields(payload, {
                    componentId,
                    componentType,
                });
            }

            if (componentType === "adapter") {
                const adapterId = args[2];
                requireArgs(
                    args,
                    ["componentType", "gatewayId", "adapterId"],
                    "cognisctl component:disable adapter <gatewayId> <adapterId>",
                );
                const payload = await apiPost(
                    apiBaseUrl,
                    adapterRoute(componentId, adapterId, "/disable"),
                    undefined,
                    await getApiToken(),
                );
                return mergePayloadFields(payload, {
                    componentId: adapterId,
                    componentType,
                    gatewayId: componentId,
                });
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

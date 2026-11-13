import { registerComponentOperations } from "./components/commands.ts";
import { requireArgs } from "./command-utils.ts";
import { renderStructuredSummary, renderComponentsList } from "./formatters.ts";
import { apiGet, apiPost, apiPut } from "./http.ts";
import { register } from "./registry.ts";

function encodePath(value: string): string {
    return encodeURIComponent(value);
}

interface ComponentConfigPayload {
    data?: Record<string, unknown>;
    schema?: Array<{ key?: string }>;
}

interface ConfigTarget {
    route: string;
    configJson?: string;
    schemaRequired: boolean;
    writeMethod: "POST" | "PUT";
}

function getUserConfigKeys(payload: ComponentConfigPayload): Set<string> {
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
    payload: ComponentConfigPayload,
    schemaRequired: boolean,
): ComponentConfigPayload {
    const userKeys = getUserConfigKeys(payload);
    if (!schemaRequired && userKeys.size === 0) {
        return payload;
    }
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
    currentConfig: ComponentConfigPayload,
    schemaRequired: boolean,
): Record<string, unknown> {
    if (config == null || typeof config !== "object" || Array.isArray(config)) {
        throw new Error("Expected config JSON to be an object.");
    }
    const userKeys = getUserConfigKeys(currentConfig);
    const configRecord = config as Record<string, unknown>;
    if (!schemaRequired && userKeys.size === 0) {
        return configRecord;
    }
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

function moduleRoute(moduleId: string, suffix: string): string {
    return `/api/v1/modules/${encodePath(moduleId)}${suffix}`;
}

function gatewayRoute(gatewayId: string, suffix: string): string {
    return `/api/v1/gateways/${encodePath(gatewayId)}${suffix}`;
}

function resolveConfigTarget(
    args: string[],
    expectsConfigJson: boolean,
): ConfigTarget {
    const [componentType, firstId, secondId, adapterConfigJson] = args;
    const usage = expectsConfigJson
        ? "cognisctl component:config:set <module|gateway|adapter> <componentId> [adapterId] <config-json>"
        : "cognisctl component:config:get <module|gateway|adapter> <componentId> [adapterId]";

    if (componentType === "module") {
        requireArgs(
            args,
            expectsConfigJson
                ? ["componentType", "moduleId", "configJson"]
                : ["componentType", "moduleId"],
            usage,
        );
        return {
            route: moduleRoute(firstId, "/config"),
            configJson: expectsConfigJson ? secondId : undefined,
            schemaRequired: false,
            writeMethod: "POST",
        };
    }

    if (componentType === "gateway") {
        requireArgs(
            args,
            expectsConfigJson
                ? ["componentType", "gatewayId", "configJson"]
                : ["componentType", "gatewayId"],
            usage,
        );
        return {
            route: gatewayRoute(firstId, "/config"),
            configJson: expectsConfigJson ? secondId : undefined,
            schemaRequired: false,
            writeMethod: "PUT",
        };
    }

    if (componentType === "adapter") {
        requireArgs(
            args,
            expectsConfigJson
                ? ["componentType", "gatewayId", "adapterId", "configJson"]
                : ["componentType", "gatewayId", "adapterId"],
            usage,
        );
        return {
            route: adapterRoute(firstId, secondId, "/config"),
            configJson: expectsConfigJson ? adapterConfigJson : undefined,
            schemaRequired: true,
            writeMethod: "PUT",
        };
    }

    throw new Error(
        'Expected component type "module", "gateway", or "adapter".',
    );
}

export function registerComponentCommands(): void {
    register(
        "component:list",
        async ({ apiBaseUrl, getApiToken }) => {
            return apiGet(
                apiBaseUrl,
                "/api/v1/components",
                await getApiToken(),
            );
        },
        {
            usage: "cognisctl component:list",
            description: "List modules, gateways, and adapters with status.",
            section: "Components",
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
            section: "Components",
            render: renderStructuredSummary,
        },
    );

    register(
        "component:config:get",
        async ({ args, apiBaseUrl, getApiToken }) => {
            const target = resolveConfigTarget(args, false);
            const token = await getApiToken();
            return filterUserConfigPayload(
                (await apiGet(
                    apiBaseUrl,
                    target.route,
                    token,
                )) as ComponentConfigPayload,
                target.schemaRequired,
            );
        },
        {
            usage: "cognisctl component:config:get <module|gateway|adapter> <componentId> [adapterId]",
            description: "Read a module, gateway, or adapter configuration.",
            section: "Components",
            render: renderStructuredSummary,
        },
    );

    register(
        "component:config:set",
        async ({ args, apiBaseUrl, getApiToken }) => {
            const target = resolveConfigTarget(args, true);
            const token = await getApiToken();
            const currentConfig = (await apiGet(
                apiBaseUrl,
                target.route,
                token,
            )) as ComponentConfigPayload;
            const nextConfig = validateUserConfigUpdate(
                parseJsonArgument(target.configJson),
                currentConfig,
                target.schemaRequired,
            );

            if (target.writeMethod === "POST") {
                return apiPost(apiBaseUrl, target.route, nextConfig, token);
            }

            return apiPut(apiBaseUrl, target.route, nextConfig, token);
        },
        {
            usage: "cognisctl component:config:set <module|gateway|adapter> <componentId> [adapterId] <config-json>",
            description: "Update a module, gateway, or adapter configuration.",
            section: "Components",
            render: renderStructuredSummary,
        },
    );

    registerComponentOperations();
}

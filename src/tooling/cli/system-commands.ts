import { renderSystemHealth } from "./formatters.ts";
import { apiGet } from "./http.ts";
import { register } from "./registry.ts";

function filterHealthContribution(
    payload: unknown,
    componentId: string,
): unknown {
    const response = payload as {
        data?: { contributions?: Array<{ componentId?: string }> };
    };
    const contributions = response.data?.contributions ?? [];
    return {
        ...response,
        data: {
            ...(response.data ?? {}),
            contributions: contributions.filter(
                (contribution) => contribution.componentId === componentId,
            ),
        },
    };
}

export function registerSystemCommands(): void {
    register(
        "system:health",
        async ({ apiBaseUrl, getApiToken }) => {
            return apiGet(
                apiBaseUrl,
                "/api/v1/system/health",
                await getApiToken(),
            );
        },
        {
            usage: "cognisctl system:health",
            description: "Check the API system health endpoint.",
            render: renderSystemHealth,
        },
    );

    register(
        "component:health",
        async ({ args, apiBaseUrl, getApiToken }) => {
            const payload = await apiGet(
                apiBaseUrl,
                "/api/v1/system/health",
                await getApiToken(),
            );
            const componentId = args[0];
            return componentId
                ? filterHealthContribution(payload, componentId)
                : payload;
        },
        {
            usage: "cognisctl component:health [componentId]",
            description: "Show health snippets contributed by components.",
            render: renderSystemHealth,
        },
    );
}

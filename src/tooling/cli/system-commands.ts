import { renderSystemHealth } from "./formatters.ts";
import { apiGet } from "./http.ts";
import { register } from "./registry.ts";

export function registerSystemCommands(): void {
    register(
        "system:capabilities",
        async ({ apiBaseUrl, getApiToken }) =>
            apiGet(
                apiBaseUrl,
                "/api/v1/system/capabilities",
                await getApiToken(),
            ),
        {
            usage: "cognisctl system:capabilities",
            description: "List every registered runtime capability.",
        },
    );
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
}

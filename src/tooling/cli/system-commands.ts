import { renderSystemHealth } from "./formatters.ts";
import { apiGet } from "./http.ts";
import { register } from "./registry.ts";

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
}

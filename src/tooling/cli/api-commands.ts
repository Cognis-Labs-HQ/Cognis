import { apiPost } from "./http.ts";
import { renderApiToken } from "./formatters.ts";
import { register } from "./registry.ts";

export function registerApiCommands(): void {
    register(
        "api:token",
        async ({ apiBaseUrl, getApiToken }) => {
            return apiPost(
                apiBaseUrl,
                "/api/v1/auth/emergency-token",
                undefined,
                await getApiToken(),
            );
        },
        {
            usage: "cognisctl api:token",
            description:
                "Generate a temporary privileged API token (1h) for emergency curl use.",
            render: renderApiToken,
        },
    );
}

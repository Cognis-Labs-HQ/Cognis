export function registerCommands({ register, apiGet }) {
    register(
        "analytics:metrics",
        async ({ apiBaseUrl, getApiToken }) => {
            const payload = await apiGet(
                apiBaseUrl,
                "/api/v1/modules/analytics/metrics",
                await getApiToken(),
            );
            console.log(JSON.stringify(payload, null, 2));
        },
        {
            usage: "cognisctl analytics:metrics",
            description: "Show analytics metrics from module API.",
        },
    );
}

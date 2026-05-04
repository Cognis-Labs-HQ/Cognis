export function registerCommands({ register, apiGet }) {
    register(
        "sample-analytics:metrics",
        async ({ apiBaseUrl, getApiToken }) => {
            const payload = await apiGet(
                apiBaseUrl,
                "/api/v1/modules/sample-analytics/metrics",
                await getApiToken(),
            );
            console.log(JSON.stringify(payload, null, 2));
        },
        {
            usage: "cognisctl sample-analytics:metrics",
            description: "Show sample analytics metrics from module API.",
        },
    );
}

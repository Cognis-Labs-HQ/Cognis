export function registerCommands({ register, apiGet, apiPost }) {
    register(
        "analytics:metrics",
        async ({ apiBaseUrl, getApiToken }) => {
            return apiGet(
                apiBaseUrl,
                "/api/v1/modules/analytics/metrics",
                await getApiToken(),
            );
        },
        {
            usage: "cognisctl analytics:metrics",
            description: "Show analytics metrics from module API.",
        },
    );
    registerActivityCommands({ register, apiGet, apiPost });
}

export function registerActivityCommands({ register, apiGet, apiPost }) {
    register(
        "analytics:series",
        async ({ args, apiBaseUrl, getApiToken }) => {
            const days = args[0] ? `?days=${encodeURIComponent(args[0])}` : "";
            return apiGet(
                apiBaseUrl,
                `/api/v1/modules/analytics/series${days}`,
                await getApiToken(),
            );
        },
        {
            usage: "cognisctl analytics:series [days]",
            description: "Show analytics registration series from module API.",
        },
    );

    register(
        "analytics:activity-log",
        async ({ args, apiBaseUrl, getApiToken }) => {
            const limit = args[0]
                ? `?limit=${encodeURIComponent(args[0])}`
                : "";
            return apiGet(
                apiBaseUrl,
                `/api/v1/modules/analytics/activity-log${limit}`,
                await getApiToken(),
            );
        },
        {
            usage: "cognisctl analytics:activity-log [limit]",
            description:
                "Show recent analytics activity events from module API.",
        },
    );

    register(
        "analytics:activity-log:record",
        async ({ args, apiBaseUrl, getApiToken }) => {
            if (!args[0]) {
                throw new Error(
                    "Not enough arguments (missing: event-type)\n\nUsage:\n  cognisctl analytics:activity-log:record <event-type> [meta-json]",
                );
            }
            const meta = args[1] ? JSON.parse(args[1]) : null;
            return apiPost(
                apiBaseUrl,
                "/api/v1/modules/analytics/activity-log",
                { eventType: args[0], meta },
                await getApiToken(),
            );
        },
        {
            usage: "cognisctl analytics:activity-log:record <event-type> [meta-json]",
            description:
                "Record an analytics activity event through the module API.",
        },
    );
}

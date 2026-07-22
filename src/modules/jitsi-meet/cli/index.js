function requireArgs(args, names, usage) {
    const missing = names.filter((_, index) => !args[index]);
    if (missing.length === 0) return;
    throw new Error(
        `Not enough arguments (missing: ${missing.join(", ")})\n\nUsage:\n  ${usage}`,
    );
}

function queryString(params) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== "") query.set(key, value);
    }
    const serialized = query.toString();
    return serialized ? `?${serialized}` : "";
}

export function registerCommands({ register, apiGet }) {
    register(
        "jitsi-meet:ping",
        async ({ apiBaseUrl, getApiToken }) => {
            return apiGet(
                apiBaseUrl,
                "/api/v1/modules/jitsi-meet/ping",
                await getApiToken(),
            );
        },
        {
            usage: "cognisctl jitsi-meet:ping",
            description: "Check whether the Jitsi Meet module is ready.",
        },
    );

    register(
        "jitsi-meet:meetings",
        async ({ apiBaseUrl, getApiToken }) => {
            return apiGet(
                apiBaseUrl,
                "/api/v1/modules/jitsi-meet/admin/meetings",
                await getApiToken(),
            );
        },
        {
            usage: "cognisctl jitsi-meet:meetings",
            description: "List all active Jitsi Meet meetings.",
        },
    );

    register(
        "jitsi-meet:meetings:upcoming",
        async ({ apiBaseUrl, getApiToken }) => {
            return apiGet(
                apiBaseUrl,
                "/api/v1/modules/jitsi-meet/admin/meetings/upcoming",
                await getApiToken(),
            );
        },
        {
            usage: "cognisctl jitsi-meet:meetings:upcoming",
            description: "List upcoming Jitsi Meet meetings.",
        },
    );

    register(
        "jitsi-meet:participants",
        async ({ args, apiBaseUrl, getApiToken }) => {
            const usage = "cognisctl jitsi-meet:participants <meeting-id>";
            requireArgs(args, ["meeting-id"], usage);
            return apiGet(
                apiBaseUrl,
                `/api/v1/modules/jitsi-meet/participants${queryString({ meetingId: args[0] })}`,
                await getApiToken(),
            );
        },
        {
            usage: "cognisctl jitsi-meet:participants <meeting-id>",
            description: "List participants for a Jitsi Meet meeting.",
        },
    );
}

function printJson(payload) {
    console.log(JSON.stringify(payload, null, 2));
}

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

export function registerCommands({ register, apiGet, apiPost }) {
    register(
        "jitsi-meet:ping",
        async ({ apiBaseUrl, getApiToken }) => {
            printJson(
                await apiGet(
                    apiBaseUrl,
                    "/api/v1/modules/jitsi-meet/ping",
                    await getApiToken(),
                ),
            );
        },
        {
            usage: "cognisctl jitsi-meet:ping",
            description: "Check whether the Jitsi Meet module is ready.",
        },
    );

    register(
        "jitsi-meet:config:get",
        async ({ apiBaseUrl, getApiToken }) => {
            printJson(
                await apiGet(
                    apiBaseUrl,
                    "/api/v1/modules/jitsi-meet/config",
                    await getApiToken(),
                ),
            );
        },
        {
            usage: "cognisctl jitsi-meet:config:get",
            description: "Show the Jitsi Meet module configuration.",
        },
    );

    register(
        "jitsi-meet:config:set",
        async ({ args, apiBaseUrl, getApiToken }) => {
            const usage =
                "cognisctl jitsi-meet:config:set <instance-url> [meeting-prefix]";
            requireArgs(args, ["instance-url"], usage);
            printJson(
                await apiPost(
                    apiBaseUrl,
                    "/api/v1/modules/jitsi-meet/config",
                    {
                        instanceUrl: args[0],
                        meetingPrefix: args[1] ?? "",
                    },
                    await getApiToken(),
                ),
            );
        },
        {
            usage: "cognisctl jitsi-meet:config:set <instance-url> [meeting-prefix]",
            description: "Update the Jitsi Meet instance URL and room prefix.",
        },
    );

    register(
        "jitsi-meet:admin:meetings",
        async ({ apiBaseUrl, getApiToken }) => {
            printJson(
                await apiGet(
                    apiBaseUrl,
                    "/api/v1/modules/jitsi-meet/admin/meetings",
                    await getApiToken(),
                ),
            );
        },
        {
            usage: "cognisctl jitsi-meet:admin:meetings",
            description: "List active Jitsi Meet meetings for administrators.",
        },
    );

    register(
        "jitsi-meet:admin:meetings:upcoming",
        async ({ apiBaseUrl, getApiToken }) => {
            printJson(
                await apiGet(
                    apiBaseUrl,
                    "/api/v1/modules/jitsi-meet/admin/meetings/upcoming",
                    await getApiToken(),
                ),
            );
        },
        {
            usage: "cognisctl jitsi-meet:admin:meetings:upcoming",
            description:
                "List upcoming Jitsi Meet meetings for administrators.",
        },
    );

    register(
        "jitsi-meet:participants",
        async ({ args, apiBaseUrl, getApiToken }) => {
            const usage = "cognisctl jitsi-meet:participants <meeting-id>";
            requireArgs(args, ["meeting-id"], usage);
            printJson(
                await apiGet(
                    apiBaseUrl,
                    `/api/v1/modules/jitsi-meet/participants${queryString({ meetingId: args[0] })}`,
                    await getApiToken(),
                ),
            );
        },
        {
            usage: "cognisctl jitsi-meet:participants <meeting-id>",
            description: "List participants for a Jitsi Meet meeting.",
        },
    );
}

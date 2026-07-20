function requireArgs(args, names, usage) {
    const missing = names.filter((_, index) => !args[index]);
    if (missing.length === 0) return;
    throw new Error(
        `Not enough arguments (missing: ${missing.join(", ")})\n\nUsage:\n  ${usage}`,
    );
}

export function registerCommands({ register, apiGet, apiPost }) {
    register(
        "nextcloud-whiteboard:ping",
        async ({ apiBaseUrl, getApiToken }) => {
            return apiGet(
                apiBaseUrl,
                "/api/v1/modules/nextcloud-whiteboard/ping",
                await getApiToken(),
            );
        },
        {
            usage: "cognisctl nextcloud-whiteboard:ping",
            description:
                "Check whether the Nextcloud Whiteboard module is ready.",
        },
    );

    register(
        "nextcloud-whiteboard:config:get",
        async ({ apiBaseUrl, getApiToken }) => {
            return apiGet(
                apiBaseUrl,
                "/api/v1/modules/nextcloud-whiteboard/config",
                await getApiToken(),
            );
        },
        {
            usage: "cognisctl nextcloud-whiteboard:config:get",
            description: "Show the Nextcloud Whiteboard module configuration.",
        },
    );

    register(
        "nextcloud-whiteboard:config:set",
        async ({ args, apiBaseUrl, getApiToken }) => {
            const usage =
                "cognisctl nextcloud-whiteboard:config:set <server-url> <api-key> [image-upload-max-bytes]";
            requireArgs(args, ["server-url", "api-key"], usage);
            const imageUploadMaxBytes = args[2]
                ? Number.parseInt(args[2], 10)
                : undefined;
            return apiPost(
                apiBaseUrl,
                "/api/v1/modules/nextcloud-whiteboard/config",
                {
                    serverUrl: args[0],
                    apiKey: args[1],
                    imageUploadMaxBytes,
                },
                await getApiToken(),
            );
        },
        {
            usage: "cognisctl nextcloud-whiteboard:config:set <server-url> <api-key> [image-upload-max-bytes]",
            description: "Update the Nextcloud Whiteboard server settings.",
        },
    );

    register(
        "nextcloud-whiteboard:whiteboards",
        async ({ apiBaseUrl, getApiToken }) => {
            return apiGet(
                apiBaseUrl,
                "/api/v1/modules/nextcloud-whiteboard/whiteboards",
                await getApiToken(),
            );
        },
        {
            usage: "cognisctl nextcloud-whiteboard:whiteboards",
            description: "List whiteboards visible to the current account.",
        },
    );
}

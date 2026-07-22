export function registerCommands({ register, apiGet }) {
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
        "nextcloud-whiteboard:whiteboards",
        async ({ apiBaseUrl, getApiToken }) => {
            return apiGet(
                apiBaseUrl,
                "/api/v1/modules/nextcloud-whiteboard/whiteboards?scope=all",
                await getApiToken(),
            );
        },
        {
            usage: "cognisctl nextcloud-whiteboard:whiteboards",
            description: "List all Nextcloud Whiteboards for administrators.",
        },
    );
}

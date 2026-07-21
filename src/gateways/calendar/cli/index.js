import { registerHttpCommands } from "../../../tooling/cli/http-command-plugin.ts";

const jsonBody = { name: "payload", type: "json" };
const notifySendFields = [
    {
        name: "category",
        required: true,
        description: "Notification category, for example system or security.",
    },
    {
        name: "recipientUsername",
        required: true,
        description: "Target username for this notification.",
    },
    { name: "recipientEmail", description: "Optional direct recipient email." },
    { name: "subject", required: true },
    { name: "body", required: true },
    {
        name: "senderName",
        description: "Optional display name for the sender.",
    },
    { name: "actionUrl", description: "Optional in-app action URL." },
    {
        name: "metadata",
        type: "json",
        description: "Optional JSON object with additional metadata.",
    },
];

export function registerCommands({ register, apiGet }) {
    registerHttpCommands(
        [
            {
                name: "calendar:list",
                method: "GET",
                path: "/api/v1/calendar/calendars?accountId=:username",
                params: ["username"],
                description: "List calendars for a user.",
            },

            {
                name: "calendar:events",
                method: "GET",
                path: "/api/v1/calendar/calendars/:calendarId/events",
                params: ["calendarId"],
                description: "List calendar events.",
            },

            {
                name: "calendar:invitations",
                method: "GET",
                path: "/api/v1/calendar/invitations?accountId=:username",
                params: ["username"],
                description: "List calendar invitations for a user.",
            },
            {
                name: "calendar:share:users",
                method: "GET",
                path: "/api/v1/calendar/calendars/:calendarId/share/users",
                params: ["calendarId"],
                description: "List calendar user shares.",
            },

            {
                name: "calendar:adapters",
                method: "GET",
                path: "/api/v1/gateways/calendar/adapters",
                description: "List calendar adapters for ICS/WebDAV links.",
            },
        ],
        register,
    );

    register(
        "calendar:overview",
        async ({ args, apiBaseUrl, getApiToken }) => {
            const username = args[0];
            if (!username) {
                throw new Error("Missing required argument: username");
            }
            const targetQuery = `?accountId=${encodeURIComponent(username)}`;
            const apiToken = await getApiToken();
            const [calendarPayload, invitationPayload] = await Promise.all([
                apiGet(
                    apiBaseUrl,
                    `/api/v1/calendar/calendars${targetQuery}`,
                    apiToken,
                ),
                apiGet(
                    apiBaseUrl,
                    `/api/v1/calendar/invitations${targetQuery}`,
                    apiToken,
                ),
            ]);
            return {
                data: [
                    {
                        section: "Calendars",
                        count: calendarPayload.data?.length ?? 0,
                    },
                    {
                        section: "Pending invitations",
                        count: invitationPayload.data?.length ?? 0,
                    },
                ],
                meta: {
                    calendars: calendarPayload.data ?? [],
                    invitations: invitationPayload.data ?? [],
                },
            };
        },
        {
            usage: "cognisctl calendar:overview <username>",
            description:
                "Summarize calendars and pending calendar invitations for a user.",
        },
    );
}

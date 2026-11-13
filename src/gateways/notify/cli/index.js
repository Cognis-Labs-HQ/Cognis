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

export function registerCommands({ register }) {
    registerHttpCommands(
        [
            {
                name: "notify:send",
                method: "POST",
                path: "/api/v1/notify/send",
                bodyFields: notifySendFields,
                description: "Send a notification message.",
            },
            {
                name: "notify:providers",
                method: "GET",
                path: "/api/v1/notify/providers",
                description: "List notification providers.",
            },
            {
                name: "notify:categories",
                method: "GET",
                path: "/api/v1/notify/categories",
                description: "List notification categories.",
            },
            {
                name: "notify:queue",
                method: "GET",
                path: "/api/v1/notify/queue",
                description: "List notification queue entries.",
            },
            {
                name: "notify:queue:get",
                method: "GET",
                path: "/api/v1/notify/queue/:notificationId",
                params: ["notificationId"],
                description: "View a notification queue entry.",
            },
            {
                name: "notify:broadcasts:create",
                method: "POST",
                path: "/api/v1/notify/broadcasts",
                bodyFields: [jsonBody],
                description: "Create a broadcast notification.",
            },

            {
                name: "notify:broadcasts:states",
                method: "GET",
                path: "/api/v1/notify/broadcasts/:broadcastId/states",
                params: ["broadcastId"],
                description: "List broadcast acknowledgement states.",
            },
        ],
        register,
    );
}

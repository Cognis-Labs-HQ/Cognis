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
                name: "social:user:profile",
                method: "GET",
                path: "/api/v1/social/users/:username/profile",
                params: ["username"],
                description: "Show another user's public social profile.",
            },
            {
                name: "social:users:search",
                method: "GET",
                path: "/api/v1/social/users/search",
                queryFields: [{ name: "q", required: true }],
                description: "Search social profiles.",
            },
            {
                name: "social:posts",
                method: "GET",
                path: "/api/v1/social/users/:username/posts",
                params: ["username"],
                description: "List social posts for a user.",
            },
        ],
        register,
    );
}

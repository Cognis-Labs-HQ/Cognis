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
                name: "search:query",
                method: "GET",
                path: "/api/v1/search",
                queryFields: [{ name: "q", required: true }, { name: "type" }],
                description: "Search across users and indexed resources.",
            },
            {
                name: "docs:list",
                method: "GET",
                path: "/api/v1/docs",
                queryFields: [{ name: "langs" }],
                description: "List available documentation entries.",
            },
            {
                name: "docs:get",
                method: "GET",
                path: "/api/v1/docs/:slug",
                params: ["slug"],
                queryFields: [{ name: "langs" }],
                description: "Read a documentation entry by slug.",
            },
            {
                name: "ui:routes",
                method: "GET",
                path: "/api/v1/ui/app-routes",
                description:
                    "List dashboard app routes available to the caller.",
            },
            {
                name: "ui:settings-sections",
                method: "GET",
                path: "/api/v1/ui/settings-sections",
                description: "List settings sections available to the caller.",
            },
            {
                name: "ui:navbar-plugins",
                method: "GET",
                path: "/api/v1/ui/navbar-plugins",
                description: "List navbar plugin contributions.",
            },
            {
                name: "ui:auth-messages",
                method: "GET",
                path: "/api/v1/ui/auth-typing-messages",
                description: "List auth page typing-message contributions.",
            },
        ],
        register,
    );
}

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
                name: "share:tokens",
                method: "GET",
                path: "/api/v1/share/tokens",
                queryFields: [{ name: "resourceType" }, { name: "resourceId" }],
                description: "List share tokens.",
            },

            {
                name: "share:resolve",
                method: "GET",
                path: "/api/v1/share/resolve/:token",
                params: ["token"],
                description: "Resolve a share token.",
            },
            {
                name: "share:recipients:users",
                method: "GET",
                path: "/api/v1/share/recipients/users",
                queryFields: [{ name: "q" }],
                description: "Search share recipient users.",
            },
            {
                name: "share:approvals:pending",
                method: "GET",
                path: "/api/v1/share/approvals/pending",
                description: "List pending share approvals.",
            },
        ],
        register,
    );
}

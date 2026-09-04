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
                name: "files:quota:defaults",
                method: "GET",
                path: "/api/v1/files/admin/namespace-defaults",
                description: "List file namespace quota defaults.",
            },
            {
                name: "files:quota:namespace:set",
                method: "PUT",
                path: "/api/v1/files/admin/namespace-defaults/:namespaceId",
                params: ["namespaceId"],
                bodyFields: [
                    { name: "quotaBytes", type: "number", required: true },
                ],
                description: "Set the default quota for a file namespace.",
            },
            {
                name: "files:quota:global:set",
                method: "PUT",
                path: "/api/v1/files/admin/global-default",
                bodyFields: [
                    { name: "quotaBytes", type: "number", required: true },
                ],
                description: "Set the global default file quota.",
            },
            {
                name: "files:quota:user",
                method: "GET",
                path: "/api/v1/files/admin/users/:username/quotas",
                params: ["username"],
                description: "List file quotas for a user.",
            },
            {
                name: "files:quota:user:set",
                method: "PUT",
                path: "/api/v1/files/admin/users/:username/quotas/:namespaceId",
                params: ["username", "namespaceId"],
                bodyFields: [
                    { name: "quotaBytes", type: "number", required: true },
                ],
                description: "Set a user file quota for a namespace or global.",
            },
        ],
        register,
    );
}

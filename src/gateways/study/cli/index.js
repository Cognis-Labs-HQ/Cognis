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
                name: "study:languages",
                method: "GET",
                path: "/api/v1/study/registered-languages",
                description: "List registered study languages.",
            },
            {
                name: "study:language:modules",
                method: "GET",
                path: "/api/v1/study/languages/:languageCode/modules",
                params: ["languageCode"],
                description: "List enabled study language child modules.",
            },
        ],
        register,
    );
}

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
                name: "tfa:status",
                method: "GET",
                path: "/api/v1/tfa/status",
                description: "View TFA status for the authenticated user.",
            },
            {
                name: "tfa:methods",
                method: "GET",
                path: "/api/v1/tfa/methods",
                description:
                    "Inspect TFA methods configured for the authenticated user.",
            },

            {
                name: "tfa:method:enable",
                method: "POST",
                path: "/api/v1/tfa/methods/:methodId/enable",
                params: ["methodId"],
                description:
                    "Enable an already configured TFA method for the authenticated user.",
            },
            {
                name: "tfa:method:disable",
                method: "POST",
                path: "/api/v1/tfa/methods/:methodId/disable",
                params: ["methodId"],
                description:
                    "Disable a configured TFA method for the authenticated user.",
            },
            {
                name: "tfa:preferences:set",
                method: "PUT",
                path: "/api/v1/tfa/methods/preferences",
                bodyFields: [
                    { name: "methodIds", type: "string[]", required: true },
                ],
                description:
                    "Set the authenticated user's preferred TFA method order.",
            },
            {
                name: "tfa:recovery-codes",
                method: "GET",
                path: "/api/v1/tfa/recovery-codes",
                description:
                    "List recovery-code status for the authenticated user.",
            },
            {
                name: "tfa:recovery-codes:status",
                method: "GET",
                path: "/api/v1/tfa/recovery-codes/status",
                description: "View recovery-code status.",
            },
            {
                name: "tfa:recovery-codes:rotate",
                method: "POST",
                path: "/api/v1/tfa/recovery-codes/rotate",
                description:
                    "Generate a fresh recovery-code set for the authenticated user.",
            },
            {
                name: "tfa:enforcement:get",
                method: "GET",
                path: "/api/v1/tfa/enforcement",
                description: "View TFA enforcement policy.",
            },
            {
                name: "tfa:enforcement:set",
                method: "PUT",
                path: "/api/v1/tfa/enforcement",
                bodyFields: [jsonBody],
                description: "Update TFA enforcement policy.",
            },
        ],
        register,
    );
}

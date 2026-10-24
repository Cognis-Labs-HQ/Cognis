import { registerHttpCommands } from "../../../../tooling/cli/http-command-plugin.ts";

const emailCommandSection = "SMTP Adapter";

export function registerCommands({ register }) {
    registerHttpCommands(
        [
            {
                name: "email:list",
                method: "GET",
                path: "/api/v1/notify/users/:username/emails",
                params: ["username"],
                section: emailCommandSection,
                description: "List SMTP-managed user email addresses.",
            },
            {
                name: "email:add",
                method: "POST",
                path: "/api/v1/notify/users/:username/emails",
                params: ["username"],
                bodyFields: [{ name: "email", required: true }],
                section: emailCommandSection,
                description: "Add an SMTP-managed user email address.",
            },
            {
                name: "email:remove",
                method: "DELETE",
                path: "/api/v1/notify/users/:username/emails/:email",
                params: ["username", "email"],
                section: emailCommandSection,
                description: "Remove an SMTP-managed user email address.",
            },
            {
                name: "email:primary",
                method: "PUT",
                path: "/api/v1/notify/users/:username/emails/:email/primary",
                params: ["username", "email"],
                section: emailCommandSection,
                description: "Set an SMTP-managed primary user email address.",
            },
            {
                name: "email:verify:send",
                method: "POST",
                path: "/api/v1/notify/users/:username/emails/:email/verify",
                params: ["username", "email"],
                section: emailCommandSection,
                description: "Send an SMTP email verification message.",
            },
        ],
        register,
    );
}

import {
    ensureBooleanAcknowledgement,
    ensureUserExists,
    mergePayloadFields,
    requireArgs,
} from "./command-utils.ts";
import {
    formatBoolean,
    formatField,
    formatStatus,
    renderUserCreate,
    renderUserMutation,
    renderUsersList,
} from "./formatters.ts";
import { apiGet, apiPost, apiRequest } from "./http.ts";
import { register } from "./registry.ts";

export function registerUserCommands(): void {
    register(
        "user:list",
        async ({ apiBaseUrl, getApiToken }) => {
            return apiGet(apiBaseUrl, "/api/v1/users", await getApiToken());
        },
        {
            usage: "cognisctl user:list",
            description: "List users.",
            render: renderUsersList,
        },
    );

    register(
        "user:create",
        async ({ args, apiBaseUrl, getApiToken }) => {
            const [username, password, role] = args;
            requireArgs(
                args,
                ["username", "password", "role"],
                "cognisctl user:create <username> <password> <role>",
            );

            return apiPost(
                apiBaseUrl,
                `/api/v1/users/${encodeURIComponent(username)}`,
                { password, role },
                await getApiToken(),
            );
        },
        {
            usage: "cognisctl user:create <username> <password> <role>",
            description: "Create a user.",
            render: renderUserCreate,
        },
    );

    register(
        "user:role",
        async ({ args, apiBaseUrl, getApiToken }) => {
            const [username, role] = args;
            requireArgs(
                args,
                ["username", "role"],
                "cognisctl user:role <username> <role>",
            );

            await ensureUserExists(apiBaseUrl, getApiToken, username);
            const payload = await apiPost(
                apiBaseUrl,
                `/api/v1/users/${encodeURIComponent(username)}/role`,
                { role },
                await getApiToken(),
            );

            ensureBooleanAcknowledgement(
                payload,
                "updated",
                true,
                `User "${username}" role update failed`,
            );

            return mergePayloadFields(payload, { username, role });
        },
        {
            usage: "cognisctl user:role <username> <role>",
            description: "Update a user role.",
            render: (payload) =>
                renderUserMutation("User Role Updated", payload, (response) => [
                    formatField("Role", response.role),
                ]),
        },
    );

    register(
        "user:set-password",
        async ({ args, apiBaseUrl, getApiToken }) => {
            const [username, password] = args;
            requireArgs(
                args,
                ["username", "password"],
                "cognisctl user:set-password <username> <password>",
            );

            await ensureUserExists(apiBaseUrl, getApiToken, username);
            const payload = await apiPost(
                apiBaseUrl,
                `/api/v1/users/${encodeURIComponent(username)}/password`,
                { password },
                await getApiToken(),
            );

            ensureBooleanAcknowledgement(
                payload,
                "updated",
                true,
                `User "${username}" password update failed`,
            );

            return mergePayloadFields(payload, { username });
        },
        {
            usage: "cognisctl user:set-password <username> <password>",
            description: "Set a user password.",
            render: (payload) =>
                renderUserMutation("User Password Updated", payload),
        },
    );

    register(
        "user:disable",
        async ({ args, apiBaseUrl, getApiToken }) => {
            const [username] = args;
            requireArgs(
                args,
                ["username"],
                "cognisctl user:disable <username>",
            );

            await ensureUserExists(apiBaseUrl, getApiToken, username);
            const payload = await apiPost(
                apiBaseUrl,
                `/api/v1/users/${encodeURIComponent(username)}/disable`,
                undefined,
                await getApiToken(),
            );

            ensureBooleanAcknowledgement(
                payload,
                "updated",
                true,
                `User "${username}" disable failed`,
            );

            return mergePayloadFields(payload, { username });
        },
        {
            usage: "cognisctl user:disable <username>",
            description: "Disable a user.",
            render: (payload) =>
                renderUserMutation("User Disabled", payload, () => [
                    formatField("Status", formatStatus("disabled")),
                ]),
        },
    );

    register(
        "user:enable",
        async ({ args, apiBaseUrl, getApiToken }) => {
            const [username] = args;
            requireArgs(args, ["username"], "cognisctl user:enable <username>");

            await ensureUserExists(apiBaseUrl, getApiToken, username);
            const payload = await apiPost(
                apiBaseUrl,
                `/api/v1/users/${encodeURIComponent(username)}/enable`,
                undefined,
                await getApiToken(),
            );

            ensureBooleanAcknowledgement(
                payload,
                "updated",
                true,
                `User "${username}" enable failed`,
            );

            return mergePayloadFields(payload, { username });
        },
        {
            usage: "cognisctl user:enable <username>",
            description: "Enable a user.",
            render: (payload) =>
                renderUserMutation("User Enabled", payload, () => [
                    formatField("Status", formatStatus("enabled")),
                ]),
        },
    );

    register(
        "user:isfounder",
        async ({ args, apiBaseUrl, getApiToken }) => {
            const [username, value] = args;
            requireArgs(
                args,
                ["username", "isFounder"],
                "cognisctl user:isfounder <username> <true|false>",
            );

            if (value !== "true" && value !== "false") {
                throw new Error("isFounder must be true or false");
            }

            await ensureUserExists(apiBaseUrl, getApiToken, username);
            const payload = await apiPost(
                apiBaseUrl,
                `/api/v1/users/${encodeURIComponent(username)}/isfounder`,
                { isFounder: value === "true" },
                await getApiToken(),
            );

            ensureBooleanAcknowledgement(
                payload,
                "updated",
                true,
                `User "${username}" founder update failed`,
            );

            return mergePayloadFields(payload, {
                username,
                isFounder: value === "true",
            });
        },
        {
            usage: "cognisctl user:isfounder <username> <true|false>",
            description: "Set whether a user is marked as founder.",
            render: (payload) =>
                renderUserMutation(
                    "User Founder Flag Updated",
                    payload,
                    (response) => [
                        formatField(
                            "Founder",
                            formatBoolean(
                                Boolean(response.isFounder),
                                "true",
                                "false",
                            ),
                        ),
                    ],
                ),
        },
    );

    register(
        "user:delete",
        async ({ args, apiBaseUrl, getApiToken }) => {
            const [username] = args;
            requireArgs(args, ["username"], "cognisctl user:delete <username>");

            await ensureUserExists(apiBaseUrl, getApiToken, username);
            const payload = await apiRequest(
                apiBaseUrl,
                `/api/v1/users/${encodeURIComponent(username)}`,
                { method: "DELETE", apiToken: await getApiToken() },
            );

            ensureBooleanAcknowledgement(
                payload,
                "deleted",
                true,
                `User "${username}" deletion failed`,
            );

            return mergePayloadFields(payload, { username });
        },
        {
            usage: "cognisctl user:delete <username>",
            description: "Delete a user.",
            render: (payload) => renderUserMutation("User Deleted", payload),
        },
    );

    register(
        "user:preferences:clear",
        async ({ args, apiBaseUrl, getApiToken }) => {
            const [username] = args;
            requireArgs(
                args,
                ["username"],
                "cognisctl user:preferences:clear <username>",
            );

            await ensureUserExists(apiBaseUrl, getApiToken, username);
            const payload = await apiPost(
                apiBaseUrl,
                `/api/v1/social/users/${encodeURIComponent(username)}/preferences/clear`,
                undefined,
                await getApiToken(),
            );

            ensureBooleanAcknowledgement(
                payload,
                "cleared",
                true,
                `User "${username}" preferences clear failed`,
            );

            return mergePayloadFields(payload, { username });
        },
        {
            usage: "cognisctl user:preferences:clear <username>",
            description: "Clear saved user preferences.",
            render: (payload) =>
                renderUserMutation("User Preferences Cleared", payload),
        },
    );
}

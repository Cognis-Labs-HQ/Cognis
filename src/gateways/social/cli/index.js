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
                name: "messages:rooms",
                method: "GET",
                path: "/api/v1/social/messages/rooms",
                description: "List message conversations.",
            },
            {
                name: "messages:room:create",
                method: "POST",
                path: "/api/v1/social/messages/rooms",
                bodyFields: [jsonBody],
                description: "Create a message conversation.",
            },
            {
                name: "messages:send",
                method: "POST",
                path: "/api/v1/social/messages/rooms/:roomId/messages",
                params: ["roomId"],
                bodyFields: [jsonBody],
                description: "Send a message to a conversation.",
            },
            {
                name: "messages:requests",
                method: "GET",
                path: "/api/v1/social/messages/requests",
                description: "List message requests.",
            },
            {
                name: "messages:request:approve",
                method: "POST",
                path: "/api/v1/social/messages/requests/:requestId/approve",
                params: ["requestId"],
                description: "Approve a message request.",
            },
            {
                name: "messages:request:reject",
                method: "POST",
                path: "/api/v1/social/messages/requests/:requestId/reject",
                params: ["requestId"],
                description: "Reject a message request.",
            },
            {
                name: "social:profile",
                method: "GET",
                path: "/api/v1/social/profile",
                description: "Show the current user's social profile.",
            },
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
                path: "/api/v1/social/posts",
                description: "List the current user's social posts.",
            },
            {
                name: "social:post:create",
                method: "POST",
                path: "/api/v1/social/posts",
                bodyFields: [{ name: "content", required: true }],
                description: "Create a social post.",
            },
            {
                name: "social:post:delete",
                method: "DELETE",
                path: "/api/v1/social/posts/:postId",
                params: ["postId"],
                description: "Delete a social post.",
            },
        ],
        register,
    );
}

import { apiRequest } from "./http.ts";
import { renderStructuredSummary } from "./formatters.ts";
import { register } from "./registry.ts";
import { collectWizardFields, type WizardField } from "./wizard.ts";

interface FeatureCommandDefinition {
    name: string;
    method: "GET" | "POST" | "PUT" | "DELETE";
    path: string;
    description: string;
    params?: string[];
    bodyFields?: WizardField[];
    queryFields?: WizardField[];
}

function encodePathValue(value: unknown): string {
    return encodeURIComponent(String(value ?? ""));
}

function parseJsonObject(value: string | undefined): Record<string, unknown> {
    if (!value) return {};
    const parsed = JSON.parse(value) as unknown;
    if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Expected JSON object.");
    }
    return compactRecord(parsed as Record<string, unknown>);
}

function compactRecord(
    record: Record<string, unknown>,
): Record<string, unknown> {
    return Object.fromEntries(
        Object.entries(record).filter(([, value]) => value !== undefined),
    );
}

function buildPath(template: string, values: Record<string, unknown>): string {
    return template.replace(/:([A-Za-z0-9_]+)/g, (_, key: string) =>
        encodePathValue(values[key]),
    );
}

function appendQuery(path: string, query: Record<string, unknown>): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null || value === "") continue;
        params.set(key, String(value));
    }
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
}

async function collectCommandInput(
    definition: FeatureCommandDefinition,
    args: string[],
): Promise<{
    pathValues: Record<string, unknown>;
    body: Record<string, unknown>;
    query: Record<string, unknown>;
}> {
    const params = definition.params ?? [];
    const hasRequiredWizardInput =
        params.length > 0 ||
        definition.method === "POST" ||
        definition.method === "PUT" ||
        (definition.bodyFields ?? []).some((field) => field.required);
    if (args.length === 0 && hasRequiredWizardInput) {
        const fields = [
            ...params.map((name): WizardField => ({ name, required: true })),
            ...(definition.queryFields ?? []),
            ...(definition.bodyFields ?? []),
        ];
        const values = await collectWizardFields(definition.name, fields);
        const pathValues = Object.fromEntries(
            params.map((name) => [name, values[name]]),
        );
        const query = Object.fromEntries(
            (definition.queryFields ?? []).map((field) => [
                field.name,
                values[field.name],
            ]),
        );
        const wizardBodyFields = definition.bodyFields ?? [];
        const payloadValue = values.payload;
        const body =
            wizardBodyFields.length === 1 &&
            wizardBodyFields[0]?.name === "payload" &&
            payloadValue != null &&
            typeof payloadValue === "object" &&
            !Array.isArray(payloadValue)
                ? compactRecord(payloadValue as Record<string, unknown>)
                : compactRecord(
                      Object.fromEntries(
                          wizardBodyFields.map((field) => [
                              field.name,
                              values[field.name],
                          ]),
                      ),
                  );
        return { pathValues, query, body };
    }

    const pathValues = Object.fromEntries(
        params.map((name, index) => [name, args[index]]),
    );
    const missingParam = params.find((name) => !pathValues[name]);
    if (missingParam)
        throw new Error(`Missing required argument: ${missingParam}`);
    const payloadArg = args[params.length];
    const body =
        definition.method === "GET" || definition.method === "DELETE"
            ? {}
            : parseJsonObject(payloadArg);
    const query =
        definition.method === "GET" || definition.method === "DELETE"
            ? parseJsonObject(payloadArg)
            : {};
    return { pathValues, query, body };
}

function registerFeatureCommand(definition: FeatureCommandDefinition): void {
    const params = definition.params ?? [];
    const payloadUsage =
        definition.method === "GET" || definition.method === "DELETE"
            ? "[query-json]"
            : "[body-json]";
    const usage = `cognisctl ${definition.name}${params.map((param) => ` <${param}>`).join("")}${definition.bodyFields || definition.queryFields ? ` ${payloadUsage}` : ""}`;
    register(
        definition.name,
        async ({ args, apiBaseUrl, getApiToken }) => {
            const inputValues = await collectCommandInput(definition, args);
            const path = appendQuery(
                buildPath(definition.path, inputValues.pathValues),
                inputValues.query,
            );
            const body =
                Object.keys(inputValues.body).length > 0
                    ? inputValues.body
                    : undefined;
            return apiRequest(apiBaseUrl, path, {
                method: definition.method,
                body,
                apiToken: await getApiToken(),
            });
        },
        {
            usage,
            description: definition.description,
            render: renderStructuredSummary,
        },
    );
}

const jsonBody: WizardField = { name: "payload", type: "json" };
const notifySendFields: WizardField[] = [
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

const commands: FeatureCommandDefinition[] = [
    {
        name: "tfa:status",
        method: "GET",
        path: "/api/v1/tfa/status",
        description: "View the current user TFA status.",
    },
    {
        name: "tfa:methods",
        method: "GET",
        path: "/api/v1/tfa/methods",
        description: "List available TFA methods.",
    },
    {
        name: "tfa:method:details",
        method: "GET",
        path: "/api/v1/tfa/methods/:methodId/details",
        params: ["methodId"],
        description: "View configured TFA method details.",
    },
    {
        name: "tfa:method:setup:begin",
        method: "POST",
        path: "/api/v1/tfa/methods/:methodId/setup/begin",
        params: ["methodId"],
        bodyFields: [jsonBody],
        description: "Begin TFA method setup.",
    },
    {
        name: "tfa:method:setup:verify",
        method: "POST",
        path: "/api/v1/tfa/methods/:methodId/setup/verify",
        params: ["methodId"],
        bodyFields: [jsonBody],
        description: "Verify TFA method setup.",
    },
    {
        name: "tfa:method:setup:cancel",
        method: "POST",
        path: "/api/v1/tfa/methods/:methodId/setup/cancel",
        params: ["methodId"],
        description: "Cancel TFA method setup.",
    },
    {
        name: "tfa:method:enable",
        method: "POST",
        path: "/api/v1/tfa/methods/:methodId/enable",
        params: ["methodId"],
        description: "Enable a configured TFA method.",
    },
    {
        name: "tfa:method:disable",
        method: "POST",
        path: "/api/v1/tfa/methods/:methodId/disable",
        params: ["methodId"],
        description: "Disable a TFA method.",
    },
    {
        name: "tfa:preferences:set",
        method: "PUT",
        path: "/api/v1/tfa/methods/preferences",
        bodyFields: [{ name: "methodIds", type: "string[]", required: true }],
        description: "Set preferred TFA method order.",
    },
    {
        name: "tfa:recovery-codes",
        method: "GET",
        path: "/api/v1/tfa/recovery-codes",
        description: "List recovery codes for the current user.",
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
        description: "Rotate recovery codes.",
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
        name: "notify:broadcasts:active",
        method: "GET",
        path: "/api/v1/notify/broadcasts/active",
        description: "List active broadcasts for the current user.",
    },
    {
        name: "notify:broadcasts:states",
        method: "GET",
        path: "/api/v1/notify/broadcasts/:broadcastId/states",
        params: ["broadcastId"],
        description: "List broadcast acknowledgement states.",
    },
    {
        name: "notify:broadcasts:acknowledge",
        method: "POST",
        path: "/api/v1/notify/broadcasts/:broadcastId/acknowledge",
        params: ["broadcastId"],
        description: "Acknowledge a broadcast.",
    },
    {
        name: "notify:broadcasts:dismiss",
        method: "POST",
        path: "/api/v1/notify/broadcasts/:broadcastId/dismiss",
        params: ["broadcastId"],
        description: "Dismiss a broadcast.",
    },
    {
        name: "email:list",
        method: "GET",
        path: "/api/v1/notify/users/:username/emails",
        params: ["username"],
        description: "List user email addresses.",
    },
    {
        name: "email:add",
        method: "POST",
        path: "/api/v1/notify/users/:username/emails",
        params: ["username"],
        bodyFields: [{ name: "email", required: true }],
        description: "Add a user email address.",
    },
    {
        name: "email:remove",
        method: "DELETE",
        path: "/api/v1/notify/users/:username/emails/:email",
        params: ["username", "email"],
        description: "Remove a user email address.",
    },
    {
        name: "email:primary",
        method: "PUT",
        path: "/api/v1/notify/users/:username/emails/:email/primary",
        params: ["username", "email"],
        description: "Set a primary user email address.",
    },
    {
        name: "email:verify:send",
        method: "POST",
        path: "/api/v1/notify/users/:username/emails/:email/verify",
        params: ["username", "email"],
        description: "Send an email verification message.",
    },
    {
        name: "invite:create",
        method: "POST",
        path: "/api/v1/registration/tokens",
        bodyFields: [jsonBody],
        description: "Create a registration invite token.",
    },
    {
        name: "invite:list",
        method: "GET",
        path: "/api/v1/registration/tokens",
        description: "List registration invite tokens.",
    },
    {
        name: "invite:state",
        method: "GET",
        path: "/api/v1/registration/state",
        description: "View registration state.",
    },
    {
        name: "calendar:list",
        method: "GET",
        path: "/api/v1/calendar/calendars",
        queryFields: [{ name: "accountId" }],
        description:
            "List calendars for the current user or an admin-selected account.",
    },
    {
        name: "calendar:create",
        method: "POST",
        path: "/api/v1/calendar/calendars",
        bodyFields: [jsonBody],
        description: "Create a calendar.",
    },
    {
        name: "calendar:update",
        method: "PUT",
        path: "/api/v1/calendar/calendars/:calendarId",
        params: ["calendarId"],
        bodyFields: [jsonBody],
        description: "Update a calendar.",
    },
    {
        name: "calendar:delete",
        method: "DELETE",
        path: "/api/v1/calendar/calendars/:calendarId",
        params: ["calendarId"],
        description: "Delete a calendar.",
    },
    {
        name: "calendar:events",
        method: "GET",
        path: "/api/v1/calendar/calendars/:calendarId/events",
        params: ["calendarId"],
        description: "List calendar events.",
    },
    {
        name: "calendar:event:create",
        method: "POST",
        path: "/api/v1/calendar/calendars/:calendarId/events",
        params: ["calendarId"],
        bodyFields: [jsonBody],
        description: "Create a calendar event.",
    },
    {
        name: "calendar:event:update",
        method: "PUT",
        path: "/api/v1/calendar/calendars/:calendarId/events/:eventId",
        params: ["calendarId", "eventId"],
        bodyFields: [jsonBody],
        description: "Update a calendar event.",
    },
    {
        name: "calendar:event:delete",
        method: "DELETE",
        path: "/api/v1/calendar/calendars/:calendarId/events/:eventId",
        params: ["calendarId", "eventId"],
        description: "Delete a calendar event.",
    },
    {
        name: "calendar:invitations",
        method: "GET",
        path: "/api/v1/calendar/invitations",
        description: "List calendar invitations.",
    },
    {
        name: "calendar:share:users",
        method: "GET",
        path: "/api/v1/calendar/calendars/:calendarId/share/users",
        params: ["calendarId"],
        description: "List calendar user shares.",
    },
    {
        name: "calendar:share:user:add",
        method: "POST",
        path: "/api/v1/calendar/calendars/:calendarId/share/users",
        params: ["calendarId"],
        bodyFields: [jsonBody],
        description: "Share a calendar with a user.",
    },
    {
        name: "calendar:share:user:remove",
        method: "DELETE",
        path: "/api/v1/calendar/calendars/:calendarId/share/users/:shareId",
        params: ["calendarId", "shareId"],
        description: "Remove a calendar user share.",
    },
    {
        name: "calendar:adapters",
        method: "GET",
        path: "/api/v1/gateways/calendar/adapters",
        description: "List calendar adapters for ICS/WebDAV links.",
    },
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
        name: "share:tokens",
        method: "GET",
        path: "/api/v1/share/tokens",
        queryFields: [{ name: "resourceType" }, { name: "resourceId" }],
        description: "List share tokens.",
    },
    {
        name: "share:token:create",
        method: "POST",
        path: "/api/v1/share/tokens",
        bodyFields: [jsonBody],
        description: "Create a share token.",
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
        description: "List dashboard app routes available to the caller.",
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
        bodyFields: [{ name: "quotaBytes", type: "number", required: true }],
        description: "Set the default quota for a file namespace.",
    },
    {
        name: "files:quota:global:set",
        method: "PUT",
        path: "/api/v1/files/admin/global-default",
        bodyFields: [{ name: "quotaBytes", type: "number", required: true }],
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
        bodyFields: [{ name: "quotaBytes", type: "number", required: true }],
        description: "Set a user file quota for a namespace or global.",
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
];

export function registerFeatureCommands(): void {
    for (const command of commands) registerFeatureCommand(command);

    register(
        "calendar:overview",
        async ({ apiBaseUrl, getApiToken }) => {
            const apiToken = await getApiToken();
            const [calendarPayload, invitationPayload] = await Promise.all([
                apiRequest(apiBaseUrl, "/api/v1/calendar/calendars", {
                    method: "GET",
                    apiToken,
                }),
                apiRequest(apiBaseUrl, "/api/v1/calendar/invitations", {
                    method: "GET",
                    apiToken,
                }),
            ]);
            const calendars = calendarPayload as { data?: unknown[] };
            const invitations = invitationPayload as { data?: unknown[] };
            return {
                data: [
                    {
                        section: "Calendars",
                        count: calendars.data?.length ?? 0,
                    },
                    {
                        section: "Pending invitations",
                        count: invitations.data?.length ?? 0,
                    },
                ],
                meta: {
                    calendars: calendars.data ?? [],
                    invitations: invitations.data ?? [],
                },
            };
        },
        {
            usage: "cognisctl calendar:overview",
            description:
                "Summarize calendars and pending calendar invitations.",
            render: renderStructuredSummary,
        },
    );
}

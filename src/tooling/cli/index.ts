#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

interface CommandContext {
    args: string[];
    apiBaseUrl: string;
    getApiToken: () => Promise<string>;
}

interface CommandExecutionOptions {
    apiBaseUrl: string;
    getApiToken: () => Promise<string>;
}

type CommandHandler = (ctx: CommandContext) => Promise<unknown>;
type CommandRenderer = (payload: unknown) => string;

interface CommandSpec {
    name: string;
    usage: string;
    description: string;
    section: string;
    handler: CommandHandler;
    render?: CommandRenderer;
}

const registry = new Map<string, CommandSpec>();
const FIELD_EMPTY_PLACEHOLDER = "—";

/**
 * Represents a failed API request with structured HTTP context.
 *
 * @param status - HTTP response status code from the failed request.
 * @param statusText - HTTP response status text from the failed request.
 * @param payload - Parsed response payload (JSON or text) returned by the API.
 */
class ApiRequestError extends Error {
    constructor(
        readonly status: number,
        readonly statusText: string,
        readonly payload: unknown,
    ) {
        super(
            `API request failed (${status} ${statusText}): ${typeof payload === "string" ? payload : JSON.stringify(payload)}`,
        );
    }
}

function inferSection(name: string): string {
    if (name.startsWith("user:")) return "User";
    if (name.startsWith("system:")) return "System";
    if (name.startsWith("modules:")) return "Modules";
    if (name.startsWith("gateway:")) return "Gateways";
    if (name.startsWith("api:")) return "API";
    if (name === "help") return "General";
    return "Extensions";
}

function register(
    name: string,
    handler: CommandHandler,
    options?: {
        usage?: string;
        description?: string;
        section?: string;
        render?: CommandRenderer;
    },
) {
    registry.set(name, {
        name,
        handler,
        usage: options?.usage ?? `cognisctl ${name}`,
        description: options?.description ?? "No description provided.",
        section: options?.section ?? inferSection(name),
        render: options?.render,
    });
}

function failMissingArgs(missing: string[], usage: string) {
    const names = missing.map((name) => `"${name}"`).join(", ");
    throw new Error(`Not enough arguments (missing: ${names})\n\nUsage:
  ${usage}`);
}

function requireArgs(args: string[], names: string[], usage: string) {
    const missing = names.filter((_, idx) => !args[idx]);
    if (missing.length > 0) failMissingArgs(missing, usage);
}

function buildHeaders(apiToken?: string, includeJsonContentType = false) {
    const headers: Record<string, string> = {};
    if (includeJsonContentType) headers["content-type"] = "application/json";
    if (apiToken) headers.authorization = `Bearer ${apiToken}`;
    return Object.keys(headers).length > 0 ? headers : undefined;
}

async function apiRequest(
    apiBaseUrl: string,
    route: string,
    options?: { method?: string; body?: unknown; apiToken?: string },
) {
    const method = options?.method ?? "GET";
    const body = options?.body;
    const response = await fetch(`${apiBaseUrl}${route}`, {
        method,
        headers: buildHeaders(options?.apiToken, body !== undefined),
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const contentType = response.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json")
        ? await response.json()
        : await response.text();

    if (!response.ok)
        throw new ApiRequestError(
            response.status,
            response.statusText,
            payload,
        );

    return payload;
}

async function apiGet(apiBaseUrl: string, route: string, apiToken?: string) {
    return apiRequest(apiBaseUrl, route, { method: "GET", apiToken });
}

async function apiPost(
    apiBaseUrl: string,
    route: string,
    body?: unknown,
    apiToken?: string,
) {
    return apiRequest(apiBaseUrl, route, { method: "POST", body, apiToken });
}

function shouldUseAnsiColors() {
    return process.stdout.isTTY && !("NO_COLOR" in process.env);
}

function colorize(
    value: string,
    color:
        | "red"
        | "green"
        | "yellow"
        | "blue"
        | "magenta"
        | "cyan"
        | "gray"
        | "bold",
) {
    if (!shouldUseAnsiColors()) return value;
    const code =
        color === "red"
            ? "\u001b[31m"
            : color === "green"
              ? "\u001b[32m"
              : color === "yellow"
                ? "\u001b[33m"
                : color === "blue"
                  ? "\u001b[34m"
                  : color === "magenta"
                    ? "\u001b[35m"
                    : color === "cyan"
                      ? "\u001b[36m"
                      : color === "gray"
                        ? "\u001b[90m"
                        : "\u001b[1m";
    return `${code}${value}\u001b[0m`;
}

function statusColor(status: string) {
    const normalized = status.toLowerCase();
    if (
        normalized === "ok" ||
        normalized === "active" ||
        normalized === "enabled" ||
        normalized === "verified"
    ) {
        return "green" as const;
    }
    if (normalized === "available") return "cyan" as const;
    if (normalized === "disabled" || normalized === "missing") {
        return "yellow" as const;
    }
    if (normalized === "mismatch" || normalized === "error") {
        return "red" as const;
    }
    return "blue" as const;
}

function formatHeading(title: string, color: Parameters<typeof colorize>[1]) {
    return colorize(colorize(title, color), "bold");
}

function formatStatus(status: unknown) {
    return colorize(String(status), statusColor(String(status)));
}

function formatField(label: string, value: unknown) {
    return `${colorize(`${label}:`, "gray")} ${value === undefined || value === null ? FIELD_EMPTY_PLACEHOLDER : String(value)}`;
}

function formatBoolean(value: boolean, yes = "Yes", no = "No") {
    return colorize(value ? yes : no, value ? "green" : "yellow");
}

function formatDurationMs(value: unknown) {
    if (typeof value !== "number" || !Number.isFinite(value))
        return String(value);
    if (value < 1000) return `${value} ms`;
    const seconds = value / 1000;
    if (seconds < 60) return `${seconds.toFixed(2)} s`;
    return `${(seconds / 60).toFixed(2)} min`;
}

function parseJsonLikeString(value: string) {
    const trimmed = value.trim();
    const appearsToBeJson = trimmed.startsWith("{") || trimmed.startsWith("[");
    if (appearsToBeJson) {
        try {
            return JSON.parse(trimmed);
        } catch {
            return value;
        }
    }
    return value;
}

/**
 * Formats CLI output as a string.
 *
 * If the input is a JSON-looking string, it is parsed and pretty-printed.
 * Plain strings are returned unchanged. Non-string values are stringified as
 * indented JSON for readable terminal output.
 *
 * @param value - The value to render for terminal output.
 * @returns A formatted string suitable for writing to stdout.
 */
export function formatStructured(value: unknown): string {
    const normalized =
        typeof value === "string" ? parseJsonLikeString(value) : value;
    if (typeof normalized === "string") return normalized;
    return JSON.stringify(normalized, null, 2);
}

function formatTable(
    columns: Array<{ key: string; label: string }>,
    rows: Array<Record<string, unknown>>,
    options?: { emptyMessage?: string },
) {
    if (rows.length === 0) {
        return colorize(options?.emptyMessage ?? "No entries found.", "gray");
    }

    const widths = columns.map(({ key, label }) =>
        rows.reduce(
            (width, row) =>
                Math.max(
                    width,
                    String(row[key] ?? FIELD_EMPTY_PLACEHOLDER).length,
                ),
            label.length,
        ),
    );
    const header = columns
        .map(({ label }, index) =>
            colorize(label.padEnd(widths[index]), "bold"),
        )
        .join("  ");
    const body = rows.map((row) =>
        columns
            .map(({ key }, index) =>
                String(row[key] ?? FIELD_EMPTY_PLACEHOLDER).padEnd(
                    widths[index],
                ),
            )
            .join("  "),
    );
    return [header, ...body].join("\n");
}

function formatCommandGroupSummary(commandCount: number) {
    return `${commandCount} command${commandCount === 1 ? "" : "s"} available.`;
}

function formatSuccessBlock(
    title: string,
    color: Parameters<typeof colorize>[1],
    fields: string[],
) {
    return [formatHeading(title, color), ...fields].join("\n");
}

function mergePayloadFields(
    payload: unknown,
    fields: Record<string, unknown>,
): Record<string, unknown> {
    const base =
        typeof payload === "object" && payload !== null
            ? (payload as Record<string, unknown>)
            : {};
    return { ...fields, ...base };
}

function asRecord(value: unknown): Record<string, unknown> | null {
    if (typeof value !== "object" || value === null) return null;
    return value as Record<string, unknown>;
}

function readMessageFromPayload(payload: unknown): string | null {
    const response = asRecord(normalizeResponse(payload));
    if (!response) return null;
    const responseMessage = response.message;
    if (typeof responseMessage === "string" && responseMessage.trim()) {
        return responseMessage;
    }
    const data = asRecord(response.data);
    const dataMessage = data?.message;
    if (typeof dataMessage === "string" && dataMessage.trim()) {
        return dataMessage;
    }
    const error = asRecord(response.error);
    const errorMessage = error?.message;
    if (typeof errorMessage === "string" && errorMessage.trim()) {
        return errorMessage;
    }
    return null;
}

function ensureBooleanAcknowledgement(
    payload: unknown,
    key: string,
    expectedValue: boolean,
    failurePrefix: string,
) {
    const response = asRecord(normalizeResponse(payload));
    const data = asRecord(response?.data);
    if (!data || !(key in data)) return;
    if (data[key] === expectedValue) return;
    const message = readMessageFromPayload(payload);
    if (message) throw new Error(`${failurePrefix}: ${message}`);
    throw new Error(failurePrefix);
}

/**
 * Ensures a target user exists before executing user-mutation commands.
 *
 * Throws a user-friendly not-found error for missing users (404) and rethrows
 * all other request failures unchanged.
 *
 * @param apiBaseUrl - Base API URL for command requests.
 * @param getApiToken - Lazy API-token resolver for authenticated calls.
 * @param username - Username to validate.
 * @throws {Error} When the user is missing or another API request error occurs.
 */
async function ensureUserExists(
    apiBaseUrl: string,
    getApiToken: () => Promise<string>,
    username: string,
) {
    try {
        await apiGet(
            apiBaseUrl,
            `/api/v1/users/${encodeURIComponent(username)}/info`,
            await getApiToken(),
        );
    } catch (error) {
        if (error instanceof ApiRequestError && error.status === 404) {
            throw new Error(`User "${username}" not found.`);
        }
        throw error;
    }
}

function normalizeResponse(payload: unknown) {
    return typeof payload === "string" ? parseJsonLikeString(payload) : payload;
}

function renderApiToken(payload: unknown) {
    const response = normalizeResponse(payload) as {
        data?: {
            token?: string;
            role?: string;
            ttlSeconds?: number;
            expiresAt?: string;
        };
    };
    const data = response.data ?? {};
    return [
        formatHeading("Emergency API Token", "magenta"),
        formatField("Role", data.role),
        formatField(
            "TTL",
            data.ttlSeconds ? `${data.ttlSeconds} seconds` : "—",
        ),
        formatField("Expires", data.expiresAt),
        formatField("Token", data.token),
    ].join("\n");
}

function renderSystemHealth(payload: unknown) {
    const response = normalizeResponse(payload) as {
        data?: {
            status?: string;
            timestamp?: string;
            startedAt?: string;
            uptimeMs?: number;
        };
    };
    const data = response.data ?? {};
    return [
        formatHeading("System Health", "cyan"),
        formatField("Status", formatStatus(data.status ?? "unknown")),
        formatField("Checked", data.timestamp),
        formatField("Started", data.startedAt),
        formatField("Uptime", formatDurationMs(data.uptimeMs)),
    ].join("\n");
}

function renderModulesList(payload: unknown) {
    const response = normalizeResponse(payload) as {
        data?: Array<{
            id?: string;
            version?: string;
            class?: string;
            status?: string;
        }>;
    };
    const data = response.data ?? [];
    return [
        formatHeading("Modules", "cyan"),
        formatTable(
            [
                { key: "id", label: "ID" },
                { key: "version", label: "Version" },
                { key: "class", label: "Class" },
                { key: "status", label: "Status" },
            ],
            data.map((module) => ({
                id: module.id ?? FIELD_EMPTY_PLACEHOLDER,
                version: module.version ?? FIELD_EMPTY_PLACEHOLDER,
                class: module.class ?? FIELD_EMPTY_PLACEHOLDER,
                status: module.status ?? FIELD_EMPTY_PLACEHOLDER,
            })),
            { emptyMessage: "No modules found." },
        ),
    ].join("\n\n");
}

function renderGatewaysList(payload: unknown) {
    const response = normalizeResponse(payload) as {
        data?: Array<{
            id?: string;
            name?: string;
            version?: string;
            status?: string;
            required?: boolean;
        }>;
    };
    const data = response.data ?? [];
    return [
        formatHeading("Gateways", "cyan"),
        formatTable(
            [
                { key: "id", label: "ID" },
                { key: "name", label: "Name" },
                { key: "version", label: "Version" },
                { key: "status", label: "Status" },
                { key: "required", label: "Required" },
            ],
            data.map((gateway) => ({
                id: gateway.id ?? FIELD_EMPTY_PLACEHOLDER,
                name: gateway.name ?? FIELD_EMPTY_PLACEHOLDER,
                version: gateway.version ?? FIELD_EMPTY_PLACEHOLDER,
                status: gateway.status ?? FIELD_EMPTY_PLACEHOLDER,
                required:
                    typeof gateway.required === "boolean"
                        ? gateway.required
                            ? "yes"
                            : "no"
                        : "no",
            })),
            { emptyMessage: "No gateways found." },
        ),
    ].join("\n\n");
}

function renderUsersList(payload: unknown) {
    const response = normalizeResponse(payload) as {
        data?: Array<{
            username?: string;
            isAdmin?: boolean;
            enabled?: boolean;
            isFounder?: boolean;
        }>;
    };
    const data = response.data ?? [];
    return [
        formatHeading("Users", "cyan"),
        formatTable(
            [
                { key: "username", label: "Username" },
                { key: "role", label: "Role" },
                { key: "status", label: "Status" },
                { key: "founder", label: "Founder" },
            ],
            data.map((user) => ({
                username: user.username ?? FIELD_EMPTY_PLACEHOLDER,
                role: user.isAdmin ? "admin" : "user",
                status: user.enabled ? "enabled" : "disabled",
                founder: user.isFounder ? "yes" : "no",
            })),
            { emptyMessage: "No users found." },
        ),
    ].join("\n\n");
}

function renderUserCreate(payload: unknown) {
    const response = normalizeResponse(payload) as {
        data?: { username?: string; isAdmin?: boolean; enabled?: boolean };
    };
    const data = response.data ?? {};
    return formatSuccessBlock("User Created", "green", [
        formatField("Username", data.username),
        formatField("Role", data.isAdmin ? "admin" : "user"),
        formatField("Status", data.enabled ? "enabled" : "disabled"),
    ]);
}

function renderUserMutation(
    title: string,
    payload: unknown,
    extraFields?: (normalizedPayload: Record<string, unknown>) => string[],
) {
    const normalizedPayload = normalizeResponse(payload) as Record<
        string,
        unknown
    >;
    return formatSuccessBlock(title, "green", [
        formatField("Username", normalizedPayload.username),
        ...(extraFields ? extraFields(normalizedPayload) : []),
    ]);
}

function renderGatewayMutation(title: string, payload: unknown) {
    const response = normalizeResponse(payload) as {
        gatewayId?: string;
        data?: { status?: string };
    };
    return formatSuccessBlock(title, "green", [
        formatField("Gateway", response.gatewayId),
        formatField("Status", formatStatus(response.data?.status ?? "unknown")),
    ]);
}

function renderModuleMutation(title: string, payload: unknown) {
    const response = normalizeResponse(payload) as {
        data?: { moduleId?: string; enabled?: boolean };
    };
    return formatSuccessBlock(title, "green", [
        formatField("Module", response.data?.moduleId),
        formatField(
            "Status",
            formatStatus(response.data?.enabled ? "enabled" : "disabled"),
        ),
    ]);
}

function printOutput(text: string) {
    process.stdout.write(text.endsWith("\n") ? text : `${text}\n`);
}

/**
 * Formats the output for a named CLI command.
 *
 * When a command registers a custom renderer, that renderer is used to produce
 * human-friendly terminal output such as headings, aligned fields, or tables.
 * Commands without a custom renderer fall back to {@link formatStructured}.
 *
 * @param commandName - The registered command name to resolve a renderer for.
 * @param payload - The payload returned by the command handler.
 * @returns A formatted string ready to write to stdout.
 */
export function formatCommandOutput(
    commandName: string,
    payload: unknown,
): string {
    const spec = registry.get(commandName);
    if (spec?.render) return spec.render(payload);
    return formatStructured(payload);
}

/**
 * Executes a registered CLI command by name.
 *
 * This export supports test coverage for command handlers without invoking the
 * full process-level CLI entrypoint.
 *
 * @param command - Registered CLI command name.
 * @param args - Positional command arguments.
 * @param options - Command execution dependencies.
 * @returns The command handler result payload.
 * @throws {Error} When the command is not registered.
 */
export async function executeRegisteredCommand(
    command: string,
    args: string[],
    options: CommandExecutionOptions,
): Promise<unknown> {
    const spec = registry.get(command);
    if (!spec) {
        throw new Error(`Unknown command: ${command}`);
    }
    return spec.handler({
        args,
        apiBaseUrl: options.apiBaseUrl,
        getApiToken: options.getApiToken,
    });
}

function printCommandGroupHelp(commandGroupName: string): boolean {
    const normalized = commandGroupName.endsWith(":")
        ? commandGroupName.slice(0, -1)
        : commandGroupName;
    if (!normalized) return false;
    const groupPrefix = `${normalized}:`;
    const commands = [...registry.values()]
        .filter((command) => command.name.startsWith(groupPrefix))
        .sort((a, b) => a.name.localeCompare(b.name));
    if (commands.length === 0) return false;

    const maxNameLength = commands.reduce(
        (acc, command) => Math.max(acc, command.name.length),
        0,
    );
    printOutput(formatHeading(`Command Group: ${groupPrefix}`, "cyan"));
    printOutput(
        `${formatField("Description", formatCommandGroupSummary(commands.length))}\n${formatField("Usage", "cognisctl <command> --help")}\n`,
    );
    printOutput("Commands:");
    for (const command of commands) {
        printOutput(
            `  ${command.name.padEnd(maxNameLength + 2)}${command.description}`,
        );
    }
    return true;
}

async function resolveCliToken() {
    const tokenPath =
        process.env.COGNIS_CLI_TOKEN_PATH ?? "/app/config/cli-access.token";
    const token = (await readFile(tokenPath, "utf8")).trim();
    if (!token) throw new Error("CLI access token file is empty");
    return token;
}

function printGlobalHelp() {
    console.log("Cognis CLI (cognisctl)");
    console.log("");
    console.log("Usage:");
    console.log("  cognisctl <command> [args]");
    console.log("");
    console.log("Global options:");
    console.log(
        "  -h, --help               Show global help or command help (e.g. cognisctl user:create --help)",
    );
    console.log("  -v, --version            Show CLI version");
    console.log("");
    console.log("Environment:");
    console.log(
        "  COGNIS_API_URL           API base URL (default: http://localhost:3000)",
    );
    console.log("");
    console.log("Commands:");

    const commands = [...registry.values()].sort((a, b) =>
        a.name.localeCompare(b.name),
    );
    const maxName = commands.reduce(
        (acc, item) => Math.max(acc, item.name.length),
        0,
    );
    const grouped = new Map<string, CommandSpec[]>();

    for (const command of commands) {
        const bucket = grouped.get(command.section) ?? [];
        bucket.push(command);
        grouped.set(command.section, bucket);
    }

    const sectionOrder = [
        "General",
        "System",
        "Gateways",
        "Modules",
        "User",
        "API",
        "Extensions",
    ];
    for (const sectionName of sectionOrder) {
        const sectionCommands = grouped.get(sectionName);
        if (!sectionCommands || sectionCommands.length === 0) continue;

        console.log(`\n  ${sectionName}:`);
        for (const command of sectionCommands) {
            console.log(
                `    ${command.name.padEnd(maxName + 2)}${command.description}`,
            );
        }
    }
}

function printCommandHelp(commandName: string) {
    const command = registry.get(commandName);
    if (!command) {
        if (printCommandGroupHelp(commandName)) return;
        console.error(`Unknown command: ${commandName}`);
        process.exit(1);
    }

    console.log(`Command: ${command.name}`);
    console.log(`Description: ${command.description}`);
    console.log(`Usage: ${command.usage}`);
}

register(
    "help",
    async ({ args }) => {
        const [commandName] = args;
        if (commandName) {
            printCommandHelp(commandName);
            return;
        }
        printGlobalHelp();
    },
    {
        usage: "cognisctl help [command]",
        description: "Show global help or help for a specific command.",
    },
);

register(
    "api:token",
    async ({ apiBaseUrl, getApiToken }) => {
        return apiPost(
            apiBaseUrl,
            "/api/v1/auth/emergency-token",
            undefined,
            await getApiToken(),
        );
    },
    {
        usage: "cognisctl api:token",
        description:
            "Generate a temporary privileged API token (1h) for emergency curl use.",
        render: renderApiToken,
    },
);

register(
    "system:health",
    async ({ apiBaseUrl, getApiToken }) => {
        return apiGet(apiBaseUrl, "/api/v1/system/health", await getApiToken());
    },
    {
        usage: "cognisctl system:health",
        description: "Check the API system health endpoint.",
        render: renderSystemHealth,
    },
);

register(
    "modules:list",
    async ({ apiBaseUrl, getApiToken }) => {
        const payload = (await apiGet(
            apiBaseUrl,
            "/api/v1/modules",
            await getApiToken(),
        )) as { data: Array<{ id: string; version: string; class: string }> };
        const data = payload.data.map((module) => ({
            ...module,
            status: module.class === "core" ? "enabled" : "available",
        }));
        return { data };
    },
    {
        usage: "cognisctl modules:list",
        description: "List available modules from the API with status.",
        render: renderModulesList,
    },
);

register(
    "modules:enable",
    async ({ args, apiBaseUrl, getApiToken }) => {
        const [moduleId] = args;
        requireArgs(args, ["moduleId"], "cognisctl modules:enable <moduleId>");
        const acknowledge = args.includes("--ack-external-disclaimer");
        const route = `/api/v1/modules/${encodeURIComponent(moduleId)}/enable${acknowledge ? "?acknowledgeExternalDisclaimer=true" : ""}`;
        const payload = await apiPost(
            apiBaseUrl,
            route,
            undefined,
            await getApiToken(),
        );
        ensureBooleanAcknowledgement(
            payload,
            "enabled",
            true,
            `Module "${moduleId}" was not enabled`,
        );
        return payload;
    },
    {
        usage: "cognisctl modules:enable <moduleId> [--ack-external-disclaimer]",
        description: "Enable a module by ID.",
        render: (payload) => renderModuleMutation("Module Enabled", payload),
    },
);

register(
    "modules:disable",
    async ({ args, apiBaseUrl, getApiToken }) => {
        const [moduleId] = args;
        requireArgs(args, ["moduleId"], "cognisctl modules:disable <moduleId>");
        const payload = await apiPost(
            apiBaseUrl,
            `/api/v1/modules/${encodeURIComponent(moduleId)}/disable`,
            undefined,
            await getApiToken(),
        );
        ensureBooleanAcknowledgement(
            payload,
            "enabled",
            false,
            `Module "${moduleId}" was not disabled`,
        );
        return payload;
    },
    {
        usage: "cognisctl modules:disable <moduleId>",
        description: "Disable a module by ID.",
        render: (payload) => renderModuleMutation("Module Disabled", payload),
    },
);

register(
    "gateway:list",
    async ({ apiBaseUrl, getApiToken }) => {
        return apiGet(apiBaseUrl, "/api/v1/gateways", await getApiToken());
    },
    {
        usage: "cognisctl gateway:list",
        description: "List all registered gateways with their status.",
        render: renderGatewaysList,
    },
);

register(
    "gateway:enable",
    async ({ args, apiBaseUrl, getApiToken }) => {
        const [gatewayId] = args;
        requireArgs(
            args,
            ["gatewayId"],
            "cognisctl gateway:enable <gatewayId>",
        );
        const payload = await apiPost(
            apiBaseUrl,
            `/api/v1/gateways/${encodeURIComponent(gatewayId)}/enable`,
            undefined,
            await getApiToken(),
        );
        return mergePayloadFields(payload, { gatewayId });
    },
    {
        usage: "cognisctl gateway:enable <gatewayId>",
        description: "Enable a gateway by ID.",
        render: (payload) => renderGatewayMutation("Gateway Enabled", payload),
    },
);

register(
    "gateway:disable",
    async ({ args, apiBaseUrl, getApiToken }) => {
        const [gatewayId] = args;
        requireArgs(
            args,
            ["gatewayId"],
            "cognisctl gateway:disable <gatewayId>",
        );
        const payload = await apiPost(
            apiBaseUrl,
            `/api/v1/gateways/${encodeURIComponent(gatewayId)}/disable`,
            undefined,
            await getApiToken(),
        );
        return mergePayloadFields(payload, { gatewayId });
    },
    {
        usage: "cognisctl gateway:disable <gatewayId>",
        description: "Disable a gateway by ID.",
        render: (payload) => renderGatewayMutation("Gateway Disabled", payload),
    },
);

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
        requireArgs(args, ["username"], "cognisctl user:disable <username>");
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
            `/api/v1/users/${encodeURIComponent(username)}/preferences/clear`,
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

async function loadModuleCliPlugins(options?: { refresh?: boolean }) {
    if (options?.refresh) {
        for (const [name, spec] of registry.entries()) {
            if (spec.section === "Extensions") registry.delete(name);
        }
    }
    const configured =
        process.env.COGNIS_MODULE_CLI_PATHS ??
        path.resolve(process.cwd(), "modules");
    const roots = configured.split(path.delimiter).filter(Boolean);

    for (const modulesRoot of roots) {
        let entries: string[] = [];
        try {
            entries = await readdir(modulesRoot);
        } catch {
            continue;
        }

        for (const moduleName of entries) {
            const pluginPath = path.join(
                modulesRoot,
                moduleName,
                "cli",
                "index.js",
            );
            try {
                const plugin = await import(pluginPath);
                if (typeof plugin.registerCommands === "function")
                    plugin.registerCommands({ register, apiGet });
            } catch {
                // module has no cli plugin
            }
        }
    }
}

async function main() {
    await loadModuleCliPlugins({ refresh: true });

    const packageJson = await import("./package.json", {
        with: { type: "json" },
    });
    const argv = process.argv.slice(2);

    if (argv.length === 0 || argv[0] === "-h" || argv[0] === "--help") {
        return printGlobalHelp();
    }
    if (argv[0] === "-v" || argv[0] === "--version")
        return console.log(packageJson.default.version);

    const [command, ...args] = argv;
    if (args.includes("-h") || args.includes("--help")) {
        return printCommandHelp(command);
    }

    const apiBaseUrl = process.env.COGNIS_API_URL ?? "http://localhost:3000";
    let apiTokenPromise: Promise<string> | null = null;
    const getApiToken = async () => {
        if (!apiTokenPromise) apiTokenPromise = resolveCliToken();
        return apiTokenPromise;
    };
    const spec = registry.get(command);

    if (!spec) {
        if (printCommandGroupHelp(command)) return;
        console.error(`Unknown command: ${command}`);
        console.error("Run `cognisctl --help` to see available commands.");
        process.exit(1);
    }

    const result = await executeRegisteredCommand(command, args, {
        apiBaseUrl,
        getApiToken,
    });
    if (result !== undefined) {
        printOutput(formatCommandOutput(command, result));
    }
}

const isDirectExecution =
    Boolean(process.argv[1] && process.argv[1].length > 0) &&
    import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectExecution) {
    main().catch((error) => {
        console.error(error instanceof Error ? error.message : error);
        process.exit(1);
    });
}

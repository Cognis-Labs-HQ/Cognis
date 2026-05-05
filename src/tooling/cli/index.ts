#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

interface CommandContext {
    args: string[];
    apiBaseUrl: string;
    getApiToken: () => Promise<string>;
}

type CommandHandler = (ctx: CommandContext) => Promise<void>;

interface CommandSpec {
    name: string;
    usage: string;
    description: string;
    section: string;
    handler: CommandHandler;
}

const registry = new Map<string, CommandSpec>();

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
    options?: { usage?: string; description?: string; section?: string },
) {
    registry.set(name, {
        name,
        handler,
        usage: options?.usage ?? `cognisctl ${name}`,
        description: options?.description ?? "No description provided.",
        section: options?.section ?? inferSection(name),
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

    if (!response.ok) {
        throw new Error(
            `API request failed (${response.status} ${response.statusText}): ${typeof payload === "string" ? payload : JSON.stringify(payload)}`,
        );
    }

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

function printStructured(value: unknown) {
    if (typeof value === "string") {
        console.log(value);
        return;
    }
    console.log(JSON.stringify(value, null, 2));
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
    "api:request",
    async ({ args, apiBaseUrl, getApiToken }) => {
        const [method, route, ...rest] = args;
        if (!method || !route) {
            throw new Error(
                "Usage: cognisctl api:request <method> <route> [--body-json <json>]",
            );
        }

        let body: unknown;
        for (let i = 0; i < rest.length; i += 1) {
            if (rest[i] === "--body-json") {
                const raw = rest[i + 1];
                if (!raw) throw new Error("Missing value for --body-json");
                body = JSON.parse(raw);
                i += 1;
            }
        }

        const payload = await apiRequest(apiBaseUrl, route, {
            method: method.toUpperCase(),
            body,
            apiToken: await getApiToken(),
        });
        printStructured(payload);
    },
    {
        usage: "cognisctl api:request <method> <route> [--body-json <json>]",
        description: "Make an authenticated request to any API route.",
    },
);

register(
    "system:health",
    async ({ apiBaseUrl, getApiToken }) => {
        const payload = await apiGet(
            apiBaseUrl,
            "/api/v1/system/health",
            await getApiToken(),
        );
        printStructured(payload);
    },
    {
        usage: "cognisctl system:health",
        description: "Check the API system health endpoint.",
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
        printStructured({ data });
    },
    {
        usage: "cognisctl modules:list",
        description: "List available modules from the API with status.",
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
        printStructured(payload);
    },
    {
        usage: "cognisctl modules:enable <moduleId> [--ack-external-disclaimer]",
        description: "Enable a module by ID.",
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
        printStructured(payload);
    },
    {
        usage: "cognisctl modules:disable <moduleId>",
        description: "Disable a module by ID.",
    },
);

register(
    "gateway:list",
    async ({ apiBaseUrl, getApiToken }) => {
        const payload = await apiGet(
            apiBaseUrl,
            "/api/v1/gateways",
            await getApiToken(),
        );
        printStructured(payload);
    },
    {
        usage: "cognisctl gateway:list",
        description: "List all registered gateways with their status.",
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
        printStructured(payload);
    },
    {
        usage: "cognisctl gateway:enable <gatewayId>",
        description: "Enable a gateway by ID.",
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
        printStructured(payload);
    },
    {
        usage: "cognisctl gateway:disable <gatewayId>",
        description: "Disable a gateway by ID.",
    },
);

register(
    "user:list",
    async ({ apiBaseUrl, getApiToken }) => {
        const payload = await apiGet(
            apiBaseUrl,
            "/api/v1/users",
            await getApiToken(),
        );
        printStructured(payload);
    },
    { usage: "cognisctl user:list", description: "List users." },
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
        const payload = await apiPost(
            apiBaseUrl,
            `/api/v1/users/${encodeURIComponent(username)}`,
            { password, role },
            await getApiToken(),
        );
        printStructured(payload);
    },
    {
        usage: "cognisctl user:create <username> <password> <role>",
        description: "Create a user.",
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
        const payload = await apiPost(
            apiBaseUrl,
            `/api/v1/users/${encodeURIComponent(username)}/role`,
            { role },
            await getApiToken(),
        );
        printStructured(payload);
    },
    {
        usage: "cognisctl user:role <username> <role>",
        description: "Update a user role.",
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
        const payload = await apiPost(
            apiBaseUrl,
            `/api/v1/users/${encodeURIComponent(username)}/password`,
            { password },
            await getApiToken(),
        );
        printStructured(payload);
    },
    {
        usage: "cognisctl user:set-password <username> <password>",
        description: "Set a user password.",
    },
);

register(
    "user:disable",
    async ({ args, apiBaseUrl, getApiToken }) => {
        const [username] = args;
        requireArgs(args, ["username"], "cognisctl user:disable <username>");
        const payload = await apiPost(
            apiBaseUrl,
            `/api/v1/users/${encodeURIComponent(username)}/disable`,
            undefined,
            await getApiToken(),
        );
        printStructured(payload);
    },
    {
        usage: "cognisctl user:disable <username>",
        description: "Disable a user.",
    },
);

register(
    "user:enable",
    async ({ args, apiBaseUrl, getApiToken }) => {
        const [username] = args;
        requireArgs(args, ["username"], "cognisctl user:enable <username>");
        const payload = await apiPost(
            apiBaseUrl,
            `/api/v1/users/${encodeURIComponent(username)}/enable`,
            undefined,
            await getApiToken(),
        );
        printStructured(payload);
    },
    {
        usage: "cognisctl user:enable <username>",
        description: "Enable a user.",
    },
);

register(
    "user:delete",
    async ({ args, apiBaseUrl, getApiToken }) => {
        const [username] = args;
        requireArgs(args, ["username"], "cognisctl user:delete <username>");
        const payload = await apiRequest(
            apiBaseUrl,
            `/api/v1/users/${encodeURIComponent(username)}`,
            { method: "DELETE", apiToken: await getApiToken() },
        );
        printStructured(payload);
    },
    {
        usage: "cognisctl user:delete <username>",
        description: "Delete a user.",
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
        const payload = await apiPost(
            apiBaseUrl,
            `/api/v1/users/${encodeURIComponent(username)}/preferences/clear`,
            undefined,
            await getApiToken(),
        );
        printStructured(payload);
    },
    {
        usage: "cognisctl user:preferences:clear <username>",
        description: "Clear saved user preferences.",
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
        console.error(`Unknown command: ${command}`);
        console.error("Run `cognisctl --help` to see available commands.");
        process.exit(1);
    }

    await spec.handler({ args, apiBaseUrl, getApiToken });
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});

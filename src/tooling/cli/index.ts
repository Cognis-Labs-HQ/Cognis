#!/usr/bin/env node
import path from "node:path";
import { pathToFileURL } from "node:url";

import { registerApiCommands } from "./api-commands.ts";
import { registerGatewayCommands } from "./gateway-commands.ts";
import { registerFeatureCommands } from "./feature-commands.ts";
import {
    printCommandGroupHelp,
    printCommandHelp,
    printGlobalHelp,
    printOutput,
} from "./help.ts";
import { resolveCliToken } from "./http.ts";
import { registerComponentCommands } from "./component-commands.ts";
import { loadModuleCliPlugins } from "./plugins.ts";
import { registerGeneralCommands } from "./general-commands.ts";
import { registry } from "./registry.ts";
import { registerSystemCommands } from "./system-commands.ts";
import { formatStructured, renderStructuredSummary } from "./formatters.ts";
import { collectWizardFields } from "./wizard.ts";
import type { CommandExecutionOptions } from "./types.ts";
import { registerUserCommands } from "./user-commands.ts";

registerGeneralCommands();
registerApiCommands();
registerSystemCommands();
registerComponentCommands();
registerGatewayCommands();
registerUserCommands();
registerFeatureCommands();

export { formatStructured };

export function formatCommandOutput(
    commandName: string,
    payload: unknown,
): string {
    const spec = registry.get(commandName);
    if (spec?.render) return spec.render(payload);
    return renderStructuredSummary(payload);
}

function parseRequiredUsageFields(usage: string): string[] {
    return Array.from(usage.matchAll(/<([^>]+)>/g)).map((match) => match[1]);
}

async function resolveCommandArgs(
    command: string,
    args: string[],
): Promise<string[]> {
    if (args.length > 0) return args;
    const spec = registry.get(command);
    if (!spec) return args;
    const featureSections = new Set([
        "TFA",
        "Notifications",
        "Email",
        "Invites",
        "Calendar",
        "Study",
        "Messages",
        "Shares",
    ]);
    if (featureSections.has(spec.section)) return args;
    const fields = parseRequiredUsageFields(spec.usage);
    if (fields.length === 0) return args;
    const values = await collectWizardFields(
        command,
        fields.map((name) => ({ name, required: true })),
    );
    return fields.map((name) => String(values[name] ?? ""));
}

export async function executeRegisteredCommand(
    command: string,
    args: string[],
    options: CommandExecutionOptions,
): Promise<unknown> {
    const spec = registry.get(command);
    if (!spec) {
        throw new Error(`Unknown command: ${command}`);
    }

    const resolvedArgs = await resolveCommandArgs(command, args);

    return spec.handler({
        args: resolvedArgs,
        apiBaseUrl: options.apiBaseUrl,
        getApiToken: options.getApiToken,
    });
}

async function main(): Promise<void> {
    await loadModuleCliPlugins({ refresh: true });

    const packageJson = await import("./package.json", {
        with: { type: "json" },
    });
    const argv = process.argv.slice(2);

    if (argv.length === 0 || argv[0] === "-h" || argv[0] === "--help") {
        printGlobalHelp();
        return;
    }

    if (argv[0] === "-v" || argv[0] === "--version") {
        console.log(packageJson.default.version);
        return;
    }

    const [command, ...args] = argv;
    if (args.includes("-h") || args.includes("--help")) {
        printCommandHelp(command);
        return;
    }

    const apiBaseUrl = process.env.COGNIS_API_URL ?? "http://localhost:3000";
    let apiTokenPromise: Promise<string> | null = null;
    const getApiToken = async (): Promise<string> => {
        if (!apiTokenPromise) apiTokenPromise = resolveCliToken();
        return apiTokenPromise;
    };

    if (!registry.has(command)) {
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

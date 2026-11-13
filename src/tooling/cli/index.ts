#!/usr/bin/env node
import { describeProgress, withCommandProgress } from "./reuse/progress.ts";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { registerApiCommands } from "./api-commands.ts";
import {
    printCommandGroupHelp,
    printCommandHelp,
    printGlobalHelp,
    printOutput,
} from "./help.ts";
import { ApiRequestError, resolveCliToken } from "./http.ts";
import { registerComponentCommands } from "./component-commands.ts";
import { loadModuleCliPlugins } from "./plugins.ts";
import { registerGeneralCommands } from "./general-commands.ts";
import { registry } from "./registry.ts";
import { registerSystemCommands } from "./system-commands.ts";
import {
    formatStructured,
    renderApiErrorPayload,
    renderStructuredSummary,
} from "./formatters.ts";
import { collectWizardFields } from "./wizard.ts";
import type { CommandExecutionOptions } from "./types.ts";
import { registerUserCommands } from "./user-commands.ts";

registerGeneralCommands();
registerApiCommands();
registerSystemCommands();
registerComponentCommands();
registerUserCommands();

export { formatStructured };

export function formatCommandOutput(
    commandName: string,
    payload: unknown,
    options: { verbose?: boolean } = {},
): string {
    if (options.verbose) return formatStructured(payload);
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
        "Search",
        "Docs",
        "UI",
        "Files",
        "Social",
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
    if (!registry.has(command)) {
        await loadModuleCliPlugins();
    }
    const spec = registry.get(command);
    if (!spec) {
        throw new Error(`Unknown command: ${command}`);
    }

    const parsed = parseOutputOptions(args);
    const resolvedArgs = await resolveCommandArgs(command, parsed.args);

    return spec.handler({
        args: resolvedArgs,
        apiBaseUrl: options.apiBaseUrl,
        getApiToken: options.getApiToken,
        verbose: options.verbose || parsed.verbose,
        reportProgress: options.reportProgress,
    });
}

export function parseOutputOptions(args: string[]): {
    args: string[];
    verbose: boolean;
} {
    const boundary = args.indexOf("--");
    const options = boundary < 0 ? args : args.slice(0, boundary);
    return {
        verbose: options.includes("-v") || options.includes("--verbose"),
        args: [
            ...options.filter((arg) => arg !== "-v" && arg !== "--verbose"),
            ...(boundary < 0 ? [] : args.slice(boundary + 1)),
        ],
    };
}

async function main(): Promise<void> {
    const packageJson = await import("./package.json", {
        with: { type: "json" },
    });
    const originalArgs = process.argv.slice(2);
    const parsed = parseOutputOptions(originalArgs);
    const argv = parsed.args;
    const apiBaseUrl = process.env.COGNIS_API_URL ?? "http://localhost:3000";
    let apiTokenPromise: Promise<string> | null = null;
    const getApiToken = async (): Promise<string> => {
        if (!apiTokenPromise) apiTokenPromise = resolveCliToken();
        return apiTokenPromise;
    };

    if (argv[0] === "--version") {
        console.log(packageJson.default.version);
        return;
    }

    await loadModuleCliPlugins({
        refresh: true,
        filterDisabled: true,
        apiBaseUrl,
        getApiToken,
    });

    if (argv.length === 0 || argv[0] === "-h" || argv[0] === "--help") {
        printGlobalHelp();
        return;
    }

    const [command, ...args] = argv;
    if (args.includes("-h") || args.includes("--help")) {
        printCommandHelp(command);
        return;
    }

    if (!registry.has(command)) {
        if (printCommandGroupHelp(command)) return;
        console.error(`Unknown command: ${command}`);
        console.error("Run `cognisctl --help` to see available commands.");
        process.exit(1);
    }

    const writeProgress = (line: string) => process.stderr.write(line + "\n");
    const execute = () =>
        executeRegisteredCommand(
            command,
            originalArgs.slice(originalArgs.indexOf(command) + 1),
            {
                apiBaseUrl,
                getApiToken,
                verbose: parsed.verbose,
                reportProgress: (event) =>
                    writeProgress(describeProgress(event)),
            },
        );
    const result =
        command === "help"
            ? await execute()
            : await withCommandProgress(command, execute, writeProgress);

    if (result !== undefined) {
        printOutput(
            formatCommandOutput(command, result, { verbose: parsed.verbose }),
        );
    } else if (command !== "help") {
        printOutput(`${command}: completed.`);
    }
    process.exitCode = registry.get(command)?.exitCode?.(result) ?? 0;
}

const isDirectExecution =
    Boolean(process.argv[1] && process.argv[1].length > 0) &&
    import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectExecution) {
    main().catch((error) => {
        if (error instanceof ApiRequestError) {
            console.error(
                renderApiErrorPayload({
                    status: error.status,
                    statusText: error.statusText,
                    payload: error.payload,
                    verbose: parseOutputOptions(process.argv.slice(2)).verbose,
                }),
            );
        } else {
            console.error(error instanceof Error ? error.message : error);
        }
        process.exit(1);
    });
}

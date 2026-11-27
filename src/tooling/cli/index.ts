#!/usr/bin/env node
import { writeTerminalReport } from "../reuse/terminal-output.ts";
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

async function resolveCommandArgumentsList(
    command: string,
    argumentsList: string[],
): Promise<string[]> {
    if (argumentsList.length > 0) return argumentsList;
    const spec = registry.get(command);
    if (!spec) return argumentsList;
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
    if (featureSections.has(spec.section)) return argumentsList;
    const fields = parseRequiredUsageFields(spec.usage);
    if (fields.length === 0) return argumentsList;
    const values = await collectWizardFields(
        command,
        fields.map((name) => ({ name, required: true })),
    );
    return fields.map((name) => String(values[name] ?? ""));
}

export async function executeRegisteredCommand(
    command: string,
    argumentsList: string[],
    options: CommandExecutionOptions,
): Promise<unknown> {
    if (!registry.has(command)) {
        await loadModuleCliPlugins();
    }
    const spec = registry.get(command);
    if (!spec) {
        throw new Error(`Unknown command: ${command}`);
    }

    const parsed = parseOutputOptions(argumentsList);
    const resolvedArgumentsList = await resolveCommandArgumentsList(
        command,
        parsed.args,
    );

    return spec.handler({
        args: resolvedArgumentsList,
        apiBaseUrl: options.apiBaseUrl,
        getApiToken: options.getApiToken,
        verbose: options.verbose || parsed.verbose,
        reportProgress: options.reportProgress,
    });
}

export function parseOutputOptions(argumentsList: string[]): {
    args: string[];
    verbose: boolean;
} {
    const boundary = argumentsList.indexOf("--");
    const options =
        boundary < 0 ? argumentsList : argumentsList.slice(0, boundary);
    return {
        verbose: options.includes("-v") || options.includes("--verbose"),
        args: [
            ...options.filter(
                (argument) => argument !== "-v" && argument !== "--verbose",
            ),
            ...(boundary < 0 ? [] : argumentsList.slice(boundary + 1)),
        ],
    };
}

async function main(): Promise<void> {
    const packageJson = await import("./package.json", {
        with: { type: "json" },
    });
    const originalArgumentsList = process.argv.slice(2);
    const parsed = parseOutputOptions(originalArgumentsList);
    const argv = parsed.args;
    const apiBaseUrl = process.env.COGNIS_API_URL ?? "http://localhost:3000";
    let apiTokenPromise: Promise<string> | null = null;
    const getApiToken = async (): Promise<string> => {
        if (!apiTokenPromise) apiTokenPromise = resolveCliToken();
        return apiTokenPromise;
    };

    if (argv[0] === "--version") {
        writeTerminalReport("stdout", packageJson.default.version);
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

    const [command, ...argumentsList] = argv;
    if (argumentsList.includes("-h") || argumentsList.includes("--help")) {
        printCommandHelp(command);
        return;
    }

    if (!registry.has(command)) {
        if (printCommandGroupHelp(command)) return;
        writeTerminalReport("stderr", `Unknown command: ${command}`);
        writeTerminalReport(
            "stderr",
            "Run `cognisctl --help` to see available commands.",
        );
        process.exit(1);
    }

    const writeProgress = (line: string) => process.stderr.write(line + "\n");
    const execute = () =>
        executeRegisteredCommand(
            command,
            originalArgumentsList.slice(
                originalArgumentsList.indexOf(command) + 1,
            ),
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
            writeTerminalReport(
                "stderr",
                renderApiErrorPayload({
                    status: error.status,
                    statusText: error.statusText,
                    payload: error.payload,
                    verbose: parseOutputOptions(process.argv.slice(2)).verbose,
                }),
            );
        } else {
            writeTerminalReport(
                "stderr",
                error instanceof Error ? error.message : error,
            );
        }
        process.exit(1);
    });
}

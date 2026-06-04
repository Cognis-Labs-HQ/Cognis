#!/usr/bin/env node
import path from "node:path";
import { pathToFileURL } from "node:url";

import { registerApiCommands } from "./api-commands.ts";
import { registerGatewayCommands } from "./gateway-commands.ts";
import {
    printCommandGroupHelp,
    printCommandHelp,
    printGlobalHelp,
    printOutput,
} from "./help.ts";
import { resolveCliToken } from "./http.ts";
import { registerModuleCommands } from "./module-commands.ts";
import { loadModuleCliPlugins } from "./plugins.ts";
import { registerGeneralCommands } from "./general-commands.ts";
import { registry } from "./registry.ts";
import { registerSystemCommands } from "./system-commands.ts";
import { formatStructured } from "./formatters.ts";
import type { CommandExecutionOptions } from "./types.ts";
import { registerUserCommands } from "./user-commands.ts";

registerGeneralCommands();
registerApiCommands();
registerSystemCommands();
registerModuleCommands();
registerGatewayCommands();
registerUserCommands();

export { formatStructured };

export function formatCommandOutput(
    commandName: string,
    payload: unknown,
): string {
    const spec = registry.get(commandName);
    if (spec?.render) return spec.render(payload);
    return formatStructured(payload);
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

    return spec.handler({
        args,
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

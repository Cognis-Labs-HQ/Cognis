import { formatField, formatHeading } from "./formatters.ts";
import { registry } from "./registry.ts";
import type { CommandSpec } from "./types.ts";

function formatCommandGroupSummary(commandCount: number): string {
    return `${commandCount} command${commandCount === 1 ? "" : "s"} available.`;
}

export function printOutput(text: string): void {
    process.stdout.write(text.endsWith("\n") ? text : `${text}\n`);
}

export function printCommandGroupHelp(commandGroupName: string): boolean {
    const normalized = commandGroupName.endsWith(":")
        ? commandGroupName.slice(0, -1)
        : commandGroupName;

    if (!normalized) return false;

    const groupPrefix = `${normalized}:`;
    const commands = [...registry.values()]
        .filter((command) => command.name.startsWith(groupPrefix))
        .sort((left, right) => left.name.localeCompare(right.name));

    if (commands.length === 0) return false;

    const maxNameLength = commands.reduce(
        (length, command) => Math.max(length, command.name.length),
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

export function printGlobalHelp(): void {
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

    const commands = [...registry.values()].sort((left, right) =>
        left.name.localeCompare(right.name),
    );
    const maxName = commands.reduce(
        (length, command) => Math.max(length, command.name.length),
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

export function printCommandHelp(commandName: string): void {
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

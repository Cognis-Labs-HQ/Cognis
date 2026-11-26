import { writeTerminalReport } from "../reuse/terminal-output.ts";
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
    writeTerminalReport("stdout", "Cognis CLI (cognisctl)");
    writeTerminalReport("stdout", "");
    writeTerminalReport("stdout", "Usage:");
    writeTerminalReport("stdout", "  cognisctl <command> [args]");
    writeTerminalReport("stdout", "");
    writeTerminalReport("stdout", "Global options:");
    writeTerminalReport(
        "stdout",
        "  -h, --help               Show global help or command help (e.g. cognisctl user:create --help)",
    );
    writeTerminalReport(
        "stdout",
        "  -v, --verbose            Show the full command response",
    );
    writeTerminalReport(
        "stdout",
        "  --version                Show CLI version",
    );
    writeTerminalReport("stdout", "");
    writeTerminalReport("stdout", "Environment:");
    writeTerminalReport(
        "stdout",
        "  COGNIS_API_URL           API base URL (default: http://localhost:3000)",
    );
    writeTerminalReport("stdout", "");
    writeTerminalReport("stdout", "Commands:");

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
        "Components",
        "User",
        "API",
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
    ];

    for (const sectionName of sectionOrder) {
        const sectionCommands = grouped.get(sectionName);
        if (!sectionCommands || sectionCommands.length === 0) continue;

        writeTerminalReport("stdout", `\n  ${sectionName}:`);
        for (const command of sectionCommands) {
            writeTerminalReport(
                "stdout",
                `    ${command.name.padEnd(maxName + 2)}${command.description}`,
            );
        }
        grouped.delete(sectionName);
    }

    const remainingSections = [...grouped.keys()].sort((left, right) =>
        left.localeCompare(right),
    );
    for (const sectionName of remainingSections) {
        const sectionCommands = grouped.get(sectionName);
        if (!sectionCommands || sectionCommands.length === 0) continue;

        writeTerminalReport("stdout", `\n  ${sectionName}:`);
        for (const command of sectionCommands) {
            writeTerminalReport(
                "stdout",
                `    ${command.name.padEnd(maxName + 2)}${command.description}`,
            );
        }
    }
}

export function printCommandHelp(commandName: string): void {
    const command = registry.get(commandName);
    if (!command) {
        if (printCommandGroupHelp(commandName)) return;
        writeTerminalReport("stderr", `Unknown command: ${commandName}`);
        process.exit(1);
    }

    writeTerminalReport("stdout", `Command: ${command.name}`);
    writeTerminalReport("stdout", `Description: ${command.description}`);
    writeTerminalReport("stdout", `Usage: ${command.usage}`);
    writeTerminalReport(
        "stdout",
        "Options: -v, --verbose (full response); -h, --help",
    );
    writeTerminalReport(
        "stdout",
        "Progress is written to stderr; the final result is written to stdout.",
    );
}

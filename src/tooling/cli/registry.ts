import type {
    CommandHandler,
    CommandSpec,
    RegisterCommandOptions,
} from "./types.ts";

export const registry = new Map<string, CommandSpec>();

function formatCommandPrefix(prefix: string): string {
    return prefix
        .split(/[-_]/g)
        .filter(Boolean)
        .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
        .join(" ");
}

function defaultSection(name: string): string {
    if (name === "help") return "General";
    const [prefix] = name.split(":", 1);
    return prefix ? formatCommandPrefix(prefix) : "Other";
}

export function register(
    name: string,
    handler: CommandHandler,
    options?: RegisterCommandOptions,
): void {
    registry.set(name, {
        name,
        handler,
        usage: options?.usage ?? `cognisctl ${name}`,
        description: options?.description ?? "No description provided.",
        section: options?.section ?? defaultSection(name),
        render: options?.render,
    });
}

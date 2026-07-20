import type {
    CommandHandler,
    CommandSpec,
    RegisterCommandOptions,
} from "./types.ts";

export const registry = new Map<string, CommandSpec>();

function inferSection(name: string): string {
    if (name.startsWith("user:")) return "User";
    if (name.startsWith("system:")) return "System";
    if (name.startsWith("component:")) return "Components";
    if (name.startsWith("gateway:")) return "Gateways";
    if (name.startsWith("api:")) return "API";
    if (name === "help") return "General";
    return "Extensions";
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
        section: options?.section ?? inferSection(name),
        render: options?.render,
    });
}

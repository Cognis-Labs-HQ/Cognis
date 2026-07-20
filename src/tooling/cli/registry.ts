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
    if (name.startsWith("share:")) return "Shares";
    if (name.startsWith("messages:")) return "Messages";
    if (name.startsWith("study:")) return "Study";
    if (name.startsWith("calendar:")) return "Calendar";
    if (name.startsWith("invite:")) return "Invites";
    if (name.startsWith("email:")) return "Email";
    if (name.startsWith("notify:")) return "Notifications";
    if (name.startsWith("tfa:")) return "TFA";
    if (name === "help") return "General";
    return "Other";
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

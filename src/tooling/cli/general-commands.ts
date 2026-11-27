import { printCommandHelp, printGlobalHelp } from "./help.ts";
import { register } from "./registry.ts";

export function registerGeneralCommands(): void {
    register(
        "help",
        async ({ args: argumentsList }) => {
            const [commandName] = argumentsList;
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
}

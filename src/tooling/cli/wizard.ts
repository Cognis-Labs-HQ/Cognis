import { createInterface } from "node:readline/promises";
import { stdin as input, stderr as output } from "node:process";
import { Writable } from "node:stream";
import { withTerminalPrompt } from "./reuse/terminal.ts";
import { cliText } from "./reuse/locale.ts";
import {
    parseInputValue,
    validateInputField,
    validateInputNames,
} from "./reuse/input-fields.ts";

export interface WizardField {
    name: string;
    type?: "string" | "number" | "boolean" | "json" | "string[]";
    required?: boolean;
    description?: string;
    sensitive?: boolean;
}

export async function collectWizardFields(
    commandName: string,
    fields: WizardField[],
): Promise<Record<string, unknown>> {
    validateInputNames(fields.map((field) => field.name));
    if (!input.isTTY || !output.isTTY)
        throw new Error(cliText("noninteractive"));
    return withTerminalPrompt(async () => {
        let visibleInput = false;
        const promptOutput = new Writable({
            write(chunk, _encoding, done) {
                if (visibleInput) output.write(chunk);
                done();
            },
        });
        const terminal = createInterface({
            input,
            output: promptOutput,
            terminal: true,
            historySize: 0,
        });
        const controller = new AbortController();
        const onClose = () => controller.abort(new Error(cliText("eof")));
        const onInterrupt = () =>
            controller.abort(new Error(cliText("cancelled")));
        terminal.on("close", onClose);
        terminal.on("SIGINT", onInterrupt);
        process.on("SIGINT", onInterrupt);
        const values: Record<string, unknown> = Object.create(null);
        try {
            output.write(cliText("intro", { command: commandName }) + "\n");
            for (const field of fields) {
                const requiredLabel = cliText(
                    field.required ? "required" : "optional",
                );
                const typeLabel = field.type ?? "string";
                if (field.description) output.write(`  ${field.description}\n`);
                if (field.type === "string[]")
                    output.write(cliText("input.array") + "\n");
                visibleInput = field.sensitive === false;
                const visibility = cliText(visibleInput ? "visible" : "hidden");
                const prompt = `${field.name} (${typeLabel}, ${requiredLabel}, ${visibility}): `;
                if (!visibleInput) output.write(prompt);
                let answer: string;
                let answered = false;
                try {
                    controller.signal.throwIfAborted();
                    answer = await terminal.question(
                        visibleInput ? prompt : "",
                        {
                            signal: controller.signal,
                        },
                    );
                    answered = true;
                } catch (error) {
                    throw controller.signal.aborted
                        ? controller.signal.reason
                        : error;
                } finally {
                    if (!visibleInput || !answered) output.write("\n");
                }
                const value = parseInputValue(answer, field);
                validateInputField(field, value);
                if (value === undefined) continue;
                values[field.name] = value;
            }
            return values;
        } finally {
            process.removeListener("SIGINT", onInterrupt);
            terminal.removeListener("SIGINT", onInterrupt);
            terminal.removeListener("close", onClose);
            terminal.close();
            promptOutput.destroy();
        }
    });
}

import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

export interface WizardField {
    name: string;
    type?: "string" | "number" | "boolean" | "json" | "string[]";
    required?: boolean;
    description?: string;
}

function parseWizardValue(
    rawValue: string,
    type: WizardField["type"],
): unknown {
    const trimmedValue = rawValue.trim();
    if (trimmedValue.length === 0) return undefined;
    if (type === "number") return Number(trimmedValue);
    if (type === "boolean")
        return ["true", "yes", "1", "on"].includes(trimmedValue.toLowerCase());
    if (type === "json") return JSON.parse(trimmedValue);
    if (type === "string[]") {
        return trimmedValue
            .split(",")
            .map((entry) => entry.trim())
            .filter((entry) => entry.length > 0);
    }
    return trimmedValue;
}

export async function collectWizardFields(
    commandName: string,
    fields: WizardField[],
): Promise<Record<string, unknown>> {
    const terminal = createInterface({ input, output });
    const values: Record<string, unknown> = {};
    try {
        output.write(
            `Interactive ${commandName} wizard. Press enter to skip optional fields.\n`,
        );
        for (const field of fields) {
            const requiredLabel = field.required ? " required" : " optional";
            const typeLabel = field.type ? ` ${field.type}` : " string";
            if (field.description) {
                output.write(`  ${field.description}
`);
            }
            const answer = await terminal.question(
                `${field.name} (${typeLabel},${requiredLabel}): `,
            );
            const value = parseWizardValue(answer, field.type);
            if (value === undefined) {
                if (field.required)
                    throw new Error(
                        `Missing required wizard field: ${field.name}`,
                    );
                continue;
            }
            values[field.name] = value;
        }
    } finally {
        terminal.close();
    }
    return values;
}

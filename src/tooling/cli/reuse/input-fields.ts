import type { WizardField } from "../wizard.ts";
import { cliText } from "./locale.ts";

function isJsonValue(value: unknown): boolean {
    if (
        value === null ||
        typeof value === "string" ||
        typeof value === "boolean"
    )
        return true;
    if (typeof value === "number") return Number.isFinite(value);
    if (Array.isArray(value)) return value.every(isJsonValue);
    if (value && typeof value === "object")
        return Object.values(value).every(isJsonValue);
    return false;
}

export function validateInputField(
    field: WizardField,
    value: unknown,
    missingKey = "missing",
): void {
    if (value === undefined) {
        if (field.required)
            throw new Error(cliText(missingKey, { field: field.name }));
        return;
    }
    const type = field.type ?? "string";
    const valid =
        type === "number"
            ? typeof value === "number" && Number.isFinite(value)
            : type === "boolean"
              ? typeof value === "boolean"
              : type === "json"
                ? isJsonValue(value)
                : type === "string[]"
                  ? Array.isArray(value) &&
                    value.every((entry) => typeof entry === "string")
                  : typeof value === "string";
    if (!valid) throw new Error(cliText("invalid", { field: field.name }));
}

export function parseInputValue(rawValue: string, field: WizardField): unknown {
    if (rawValue.length === 0) return undefined;
    if (!field.type || field.type === "string") return rawValue;
    const trimmedValue = rawValue.trim();
    if (!trimmedValue) return undefined;
    if (field.type === "number") return Number(trimmedValue);
    if (field.type === "boolean") {
        const value = trimmedValue.toLowerCase();
        if (["true", "yes", "1", "on"].includes(value)) return true;
        if (["false", "no", "0", "off"].includes(value)) return false;
        throw new Error(cliText("invalid", { field: field.name }));
    }
    if (field.type === "string[]" && !trimmedValue.startsWith("[")) {
        return trimmedValue.split(",").map((entry) => entry.trim());
    }
    try {
        return JSON.parse(trimmedValue);
    } catch {
        throw new Error(cliText("invalid", { field: field.name }));
    }
}

export function validateInputNames(names: string[]): void {
    const seen = new Set<string>();
    for (const name of names) {
        if (seen.has(name))
            throw new Error(cliText("input.duplicate", { field: name }));
        seen.add(name);
    }
}

import { apiRequest } from "./http.ts";
import { renderStructuredSummary } from "./formatters.ts";
import { collectWizardFields, type WizardField } from "./wizard.ts";
import type { CommandHandler, RegisterCommandOptions } from "./types.ts";

interface FeatureCommandDefinition {
    name: string;
    method: "GET" | "POST" | "PUT" | "DELETE";
    path: string;
    description: string;
    section?: string;
    params?: string[];
    bodyFields?: WizardField[];
    queryFields?: WizardField[];
}

function encodePathValue(value: unknown): string {
    return encodeURIComponent(String(value ?? ""));
}

function parseJsonObject(value: string | undefined): Record<string, unknown> {
    if (!value) return {};
    const parsed = JSON.parse(value) as unknown;
    if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Expected JSON object.");
    }
    return compactRecord(parsed as Record<string, unknown>);
}

function compactRecord(
    record: Record<string, unknown>,
): Record<string, unknown> {
    return Object.fromEntries(
        Object.entries(record).filter(([, value]) => value !== undefined),
    );
}

function buildPath(template: string, values: Record<string, unknown>): string {
    return template.replace(/:([A-Za-z0-9_]+)/g, (_, key: string) =>
        encodePathValue(values[key]),
    );
}

function appendQuery(path: string, query: Record<string, unknown>): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null || value === "") continue;
        params.set(key, String(value));
    }
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
}

async function collectCommandInput(
    definition: FeatureCommandDefinition,
    args: string[],
): Promise<{
    pathValues: Record<string, unknown>;
    body: Record<string, unknown>;
    query: Record<string, unknown>;
}> {
    const params = definition.params ?? [];
    const hasRequiredWizardInput =
        params.length > 0 ||
        definition.method === "POST" ||
        definition.method === "PUT" ||
        (definition.bodyFields ?? []).some((field) => field.required);
    if (args.length === 0 && hasRequiredWizardInput) {
        const fields = [
            ...params.map((name): WizardField => ({ name, required: true })),
            ...(definition.queryFields ?? []),
            ...(definition.bodyFields ?? []),
        ];
        const values = await collectWizardFields(definition.name, fields);
        const pathValues = Object.fromEntries(
            params.map((name) => [name, values[name]]),
        );
        const query = Object.fromEntries(
            (definition.queryFields ?? []).map((field) => [
                field.name,
                values[field.name],
            ]),
        );
        const wizardBodyFields = definition.bodyFields ?? [];
        const payloadValue = values.payload;
        const body =
            wizardBodyFields.length === 1 &&
            wizardBodyFields[0]?.name === "payload" &&
            payloadValue != null &&
            typeof payloadValue === "object" &&
            !Array.isArray(payloadValue)
                ? compactRecord(payloadValue as Record<string, unknown>)
                : compactRecord(
                      Object.fromEntries(
                          wizardBodyFields.map((field) => [
                              field.name,
                              values[field.name],
                          ]),
                      ),
                  );
        return { pathValues, query, body };
    }

    const pathValues = Object.fromEntries(
        params.map((name, index) => [name, args[index]]),
    );
    const missingParam = params.find((name) => !pathValues[name]);
    if (missingParam)
        throw new Error(`Missing required argument: ${missingParam}`);
    const payloadArg = args[params.length];
    const body =
        definition.method === "GET" || definition.method === "DELETE"
            ? {}
            : parseJsonObject(payloadArg);
    const query =
        definition.method === "GET" || definition.method === "DELETE"
            ? parseJsonObject(payloadArg)
            : {};
    return { pathValues, query, body };
}

export function registerHttpCommand(
    definition: FeatureCommandDefinition,
    registerCommand: (
        name: string,
        handler: CommandHandler,
        options?: RegisterCommandOptions,
    ) => void,
): void {
    const params = definition.params ?? [];
    const payloadUsage =
        definition.method === "GET" || definition.method === "DELETE"
            ? "[query-json]"
            : "[body-json]";
    const usage = `cognisctl ${definition.name}${params.map((param) => ` <${param}>`).join("")}${definition.bodyFields || definition.queryFields ? ` ${payloadUsage}` : ""}`;
    registerCommand(
        definition.name,
        async ({ args, apiBaseUrl, getApiToken }) => {
            const inputValues = await collectCommandInput(definition, args);
            const path = appendQuery(
                buildPath(definition.path, inputValues.pathValues),
                inputValues.query,
            );
            const body =
                Object.keys(inputValues.body).length > 0
                    ? inputValues.body
                    : undefined;
            return apiRequest(apiBaseUrl, path, {
                method: definition.method,
                body,
                apiToken: await getApiToken(),
            });
        },
        {
            usage,
            description: definition.description,
            section: definition.section,
            render: renderStructuredSummary,
        },
    );
}

export function registerHttpCommands(
    definitions: FeatureCommandDefinition[],
    registerCommand: (
        name: string,
        handler: CommandHandler,
        options?: RegisterCommandOptions,
    ) => void,
): void {
    for (const definition of definitions) {
        registerHttpCommand(definition, registerCommand);
    }
}

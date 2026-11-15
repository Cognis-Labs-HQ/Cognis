import { apiRequest } from "./http.ts";
import { renderStructuredSummary } from "./formatters.ts";
import { collectWizardFields, type WizardField } from "./wizard.ts";
import type { CommandHandler, RegisterCommandOptions } from "./types.ts";
import { cliText } from "./reuse/locale.ts";
import {
    validateInputField,
    validateInputNames,
} from "./reuse/input-fields.ts";

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

function requireJsonObject(value: unknown): Record<string, unknown> {
    if (value == null || typeof value !== "object" || Array.isArray(value)) {
        throw new Error(cliText("input.json"));
    }
    validateInputField({ name: "payload", type: "json" }, value);
    return compactRecord(value as Record<string, unknown>);
}

function parseJsonObject(value: string): Record<string, unknown> {
    let parsed: unknown;
    try {
        parsed = JSON.parse(value);
    } catch {
        throw new Error(cliText("input.json"));
    }
    return requireJsonObject(parsed);
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
        if (value === undefined) continue;
        params.set(key, String(value));
    }
    const queryString = params.toString();
    return queryString
        ? `${path}${path.includes("?") ? "&" : "?"}${queryString}`
        : path;
}

async function collectCommandInput(
    definition: FeatureCommandDefinition,
    args: string[],
): Promise<{
    pathValues: Record<string, unknown>;
    body: Record<string, unknown> | undefined;
    bodyFields: Record<string, unknown>;
    query: Record<string, unknown>;
}> {
    const params = definition.params ?? [];
    const wizardBodyFields = definition.bodyFields ?? [];
    const usesJsonPayload =
        wizardBodyFields.length === 1 &&
        wizardBodyFields[0]?.name === "payload" &&
        wizardBodyFields[0]?.type === "json";
    const hasRequestBody =
        definition.method === "POST" || definition.method === "PUT";
    const extraQueryArgument =
        hasRequestBody && (definition.queryFields?.length ?? 0) > 0;
    if (args.length > params.length + (extraQueryArgument ? 2 : 1))
        throw new Error(cliText("input.extra"));
    const hasRequiredWizardInput =
        params.length > 0 ||
        ((definition.method === "POST" || definition.method === "PUT") &&
            (wizardBodyFields.length > 0 ||
                (definition.queryFields?.length ?? 0) > 0)) ||
        wizardBodyFields.some((field) => field.required) ||
        (definition.queryFields ?? []).some((field) => field.required);
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
        const payloadValue = values.payload;
        const hasBody = wizardBodyFields.some(
            (field) => values[field.name] !== undefined,
        );
        const body = !hasBody
            ? undefined
            : usesJsonPayload
              ? requireJsonObject(payloadValue)
              : compactRecord(
                    Object.fromEntries(
                        wizardBodyFields.map((field) => [
                            field.name,
                            values[field.name],
                        ]),
                    ),
                );
        return { pathValues, query, body, bodyFields: values };
    }

    const pathValues = Object.fromEntries(
        params.map((name, index) => [name, args[index]]),
    );
    const missingParam = params.find((name) => !pathValues[name]);
    if (missingParam)
        throw new Error(cliText("input.argument", { field: missingParam }));
    const payloadArg = args[params.length];
    const body =
        hasRequestBody && payloadArg !== undefined
            ? parseJsonObject(payloadArg)
            : undefined;
    const queryArg = hasRequestBody ? args[params.length + 1] : payloadArg;
    const query = queryArg === undefined ? {} : parseJsonObject(queryArg);
    return {
        pathValues,
        query,
        body,
        bodyFields: usesJsonPayload ? { payload: body } : (body ?? {}),
    };
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
    validateInputNames([
        ...params,
        ...(definition.queryFields ?? []).map((field) => field.name),
        ...(definition.bodyFields ?? []).map((field) => field.name),
    ]);
    const payloadUsage =
        definition.method === "GET" || definition.method === "DELETE"
            ? "[query-json]"
            : `[body-json]${definition.queryFields?.length ? " [query-json]" : ""}`;
    const usage = `cognisctl ${definition.name}${params.map((param) => ` <${param}>`).join("")}${definition.bodyFields || definition.queryFields ? ` ${payloadUsage}` : ""}`;
    registerCommand(
        definition.name,
        async ({ args, apiBaseUrl, getApiToken }) => {
            const inputValues = await collectCommandInput(definition, args);
            for (const field of definition.bodyFields ?? []) {
                validateInputField(
                    field,
                    inputValues.bodyFields[field.name],
                    "input.body",
                );
            }
            for (const field of definition.queryFields ?? [])
                validateInputField(
                    field,
                    inputValues.query[field.name],
                    "input.query",
                );
            const path = appendQuery(
                buildPath(definition.path, inputValues.pathValues),
                inputValues.query,
            );
            return apiRequest(apiBaseUrl, path, {
                method: definition.method,
                body: inputValues.body,
                apiToken: await getApiToken(),
            });
        },
        {
            usage,
            description: definition.description,
            section: definition.section,
            input: {
                params,
                bodyFields: definition.bodyFields,
                queryFields: definition.queryFields,
            },
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

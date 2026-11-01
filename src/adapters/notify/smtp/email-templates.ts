import {
    registerBootstrapFlow,
    requireBootstrapScope,
    registerBootstrapEntry,
    type BootstrapRegistrationState,
    type Ctx,
} from "@cognis/core";
import type { NotificationActionMessage } from "../../../gateways/notify/contracts/action-delivery.js";

export type EmailBlock =
    | { type: "paragraph" | "heading" | "code"; text: string }
    | { type: "list"; items: string[] }
    | { type: "table"; headings: string[]; rows: string[][] }
    | { type: "action"; label: string; url: string }
    | { type: "divider" };
export interface EmailPresentation {
    blocks?: EmailBlock[];
    brandName?: string;
    brandUrl?: string;
    logoUrl?: string;
    footerText?: string;
    previewText?: string;
}
interface OptionField {
    type: "string" | "number" | "boolean";
    labelKey: string;
    required?: boolean;
    default?: string | number | boolean;
    choices?: Array<string | number | boolean>;
}
interface FactoryContext {
    theme: "light" | "dark";
    variables: Record<string, string>;
    options: Record<string, unknown>;
}
export interface EmailTemplateFactory {
    id: string;
    labelKey: string;
    stringsBaseUrl?: string;
    options?: Record<string, OptionField>;
    render(
        message: NotificationActionMessage,
        context: FactoryContext,
    ): NotificationActionMessage | Promise<NotificationActionMessage>;
}

export function safeEmailUrl(input: string): string {
    const url = new URL(input);
    if (
        !["https:", "http:"].includes(url.protocol) ||
        url.username ||
        url.password
    )
        throw new Error("invalid_email_url");
    return url.href;
}

/** Validate a safe data model; contributed factories never inject HTML or CSS into the shell. */
export function validateEmailPresentation(value: unknown): EmailPresentation {
    if (!value || typeof value !== "object" || Array.isArray(value))
        throw new Error("invalid_email_presentation");
    const model = value as EmailPresentation;
    const allowed = [
        "blocks",
        "brandName",
        "brandUrl",
        "logoUrl",
        "footerText",
        "previewText",
    ];
    if (Object.keys(model).some((key) => !allowed.includes(key)))
        throw new Error("invalid_email_presentation");
    for (const key of allowed.filter((key) => key !== "blocks")) {
        const text = model[key as keyof EmailPresentation];
        if (text !== undefined && typeof text !== "string")
            throw new Error("invalid_email_presentation");
    }
    if (model.brandUrl) safeEmailUrl(model.brandUrl);
    if (model.logoUrl) safeEmailUrl(model.logoUrl);
    if (model.blocks !== undefined) {
        if (!Array.isArray(model.blocks) || model.blocks.length > 100)
            throw new Error("invalid_email_blocks");
        const texts = (items: unknown): items is string[] =>
            Array.isArray(items) &&
            items.length <= 1000 &&
            items.every((item) => typeof item === "string");
        for (const block of model.blocks) {
            if (!block || typeof block !== "object")
                throw new Error("invalid_email_block");
            if (["paragraph", "heading", "code"].includes(block.type)) {
                if (typeof (block as { text?: unknown }).text !== "string")
                    throw new Error("invalid_email_block");
            } else if (block.type === "list") {
                if (!texts(block.items)) throw new Error("invalid_email_block");
            } else if (block.type === "table") {
                if (
                    !texts(block.headings) ||
                    block.headings.length > 20 ||
                    !Array.isArray(block.rows) ||
                    block.rows.length > 1000 ||
                    block.rows.some(
                        (row) =>
                            !texts(row) || row.length !== block.headings.length,
                    )
                )
                    throw new Error("invalid_email_table");
            } else if (block.type === "action") {
                if (
                    typeof block.label !== "string" ||
                    typeof block.url !== "string"
                )
                    throw new Error("invalid_email_block");
                safeEmailUrl(block.url);
            } else if (block.type !== "divider")
                throw new Error("invalid_email_block");
        }
    }
    return structuredClone(model);
}

function validateFactoryOptions(
    definition: EmailTemplateFactory,
    provided: Record<string, unknown>,
): Record<string, unknown> {
    if (!provided || typeof provided !== "object" || Array.isArray(provided))
        throw new Error("invalid_email_template_option");
    const options: Record<string, unknown> = {};
    const schema = definition.options ?? {};
    for (const name of Object.keys(provided))
        if (!Object.hasOwn(schema, name))
            throw new Error("invalid_email_template_option");
    for (const [name, field] of Object.entries(schema)) {
        const value =
            provided[name] === undefined ? field.default : provided[name];
        if (value === undefined && !field.required) continue;
        if (
            typeof value !== field.type ||
            (typeof value === "number" && !Number.isFinite(value)) ||
            (field.choices && !field.choices.includes(value as never))
        )
            throw new Error("invalid_email_template_option");
        options[name] = value;
    }
    return options;
}

export async function createEmailTemplates(root: Ctx) {
    const records = new Map<string, { definition: EmailTemplateFactory }>();
    const lifetimes = new WeakMap<object, BootstrapRegistrationState>();
    const blocks = Object.freeze({
        paragraph: (text: string): EmailBlock => ({ type: "paragraph", text }),
        heading: (text: string): EmailBlock => ({ type: "heading", text }),
        code: (text: string): EmailBlock => ({ type: "code", text }),
        list: (items: string[]): EmailBlock => ({
            type: "list",
            items: [...items],
        }),
        table: (headings: string[], rows: string[][]): EmailBlock => ({
            type: "table",
            headings: [...headings],
            rows: rows.map((row) => [...row]),
        }),
        action: (label: string, url: string): EmailBlock => ({
            type: "action",
            label,
            url: safeEmailUrl(url),
        }),
        divider: (): EmailBlock => ({ type: "divider" }),
    });
    const compose = (
        message: NotificationActionMessage,
        presentation: EmailPresentation,
    ) => ({
        ...message,
        presentation: validateEmailPresentation(presentation) as Record<
            string,
            unknown
        >,
    });
    const registration = registerBootstrapFlow(root, {
        id: "smtp:registerTemplateFactory",
        stages: ["validate", "register"],
    });
    registration.extend(
        "validate",
        { id: "smtp:validateTemplateFactory" },
        ({ input }) => {
            requireBootstrapScope(root);
            const factory = input as EmailTemplateFactory;
            if (
                !/^[a-z][a-zA-Z0-9._-]{0,79}$/.test(factory?.id) ||
                typeof factory.labelKey !== "string" ||
                !/^[a-z][a-z0-9._-]+$/.test(factory.labelKey) ||
                (factory.stringsBaseUrl !== undefined &&
                    !/^\/static\/[a-zA-Z0-9/._-]+$/.test(
                        factory.stringsBaseUrl,
                    )) ||
                (factory.options !== undefined &&
                    (!factory.options ||
                        typeof factory.options !== "object" ||
                        Array.isArray(factory.options))) ||
                typeof factory.render !== "function"
            )
                throw new Error("invalid_email_template_factory");
            for (const [name, field] of Object.entries(factory.options ?? {})) {
                if (
                    !/^[a-z][a-zA-Z0-9_]*$/.test(name) ||
                    !field ||
                    typeof field.labelKey !== "string" ||
                    !field.labelKey ||
                    (field.required !== undefined &&
                        typeof field.required !== "boolean") ||
                    !["string", "number", "boolean"].includes(field.type) ||
                    (field.default !== undefined &&
                        (typeof field.default !== field.type ||
                            (typeof field.default === "number" &&
                                !Number.isFinite(field.default)))) ||
                    (field.choices &&
                        (!Array.isArray(field.choices) ||
                            field.choices.some(
                                (value) =>
                                    typeof value !== field.type ||
                                    (typeof value === "number" &&
                                        !Number.isFinite(value)),
                            )))
                )
                    throw new Error("invalid_email_template_option");
            }
        },
    );
    registration.extend(
        "register",
        { id: "smtp:storeTemplateFactory" },
        ({ input, data }) => {
            const scope = requireBootstrapScope(root);
            const definition = input as EmailTemplateFactory;
            const id = `${scope.owner}:${definition.id}`;
            const record = {
                definition: Object.freeze({
                    ...definition,
                    options: structuredClone(definition.options ?? {}),
                }),
            };
            lifetimes.set(
                record,
                registerBootstrapEntry(
                    root,
                    records,
                    id,
                    record,
                    "email_template_factory_conflict",
                ),
            );
            data.id = id;
        },
    );
    const registerFactory = async (definition: EmailTemplateFactory) =>
        (await root.flow.run("smtp:registerTemplateFactory", definition)).data
            .id as string;
    const defaultIds: Record<string, string> = {};
    for (const id of ["standard", "code", "action", "digest"]) {
        defaultIds[id] = await registerFactory({
            id,
            labelKey: `adapter.smtp.template.${id}`,
            stringsBaseUrl: "/static/adapters/notify/smtp/languages",
            options: Object.fromEntries(
                [
                    "brandName",
                    "brandUrl",
                    "logoUrl",
                    "footerText",
                    "previewText",
                    ...(id === "digest" ? ["heading"] : []),
                ].map((key) => [
                    key,
                    {
                        type: "string" as const,
                        labelKey: `adapter.smtp.template.option.${key.replace(/[A-Z]/g, (letter) => "_" + letter.toLowerCase())}`,
                    },
                ]),
            ),
            render(message, context) {
                const { heading, ...branding } = context.options;
                const presentation = validateEmailPresentation({
                    ...branding,
                    ...message.presentation,
                });
                const content =
                    presentation.blocks ??
                    (id === "digest"
                        ? [
                              ...(typeof heading === "string"
                                  ? [blocks.heading(heading)]
                                  : []),
                              blocks.list(
                                  message.body.split("\n").filter(Boolean),
                              ),
                          ]
                        : [blocks.paragraph(message.body)]);
                if (id === "code" && context.variables.code)
                    content.push(blocks.code(context.variables.code));
                if (id === "action" && message.actionUrl && message.actionLabel)
                    content.push(
                        blocks.action(message.actionLabel, message.actionUrl),
                    );
                return compose(
                    id === "action"
                        ? {
                              ...message,
                              actionUrl: undefined,
                              actionLabel: undefined,
                          }
                        : message,
                    { ...presentation, blocks: content },
                );
            },
        });
    }
    const rendering = registerBootstrapFlow(root, {
        id: "smtp:renderTemplateFactory",
        stages: ["validate", "render", "validate-output"],
    });
    rendering.extend(
        "validate",
        { id: "smtp:resolveTemplateFactory" },
        ({ input, data }) => {
            const request = input as {
                id: string;
                options: Record<string, unknown>;
                expected: unknown;
            };
            const record = records.get(defaultIds[request.id] ?? request.id);
            if (!record || record !== request.expected)
                throw new Error("email_template_factory_unavailable");
            const options = validateFactoryOptions(
                record.definition,
                request.options,
            );
            data.revision = lifetimes.get(record)!.revision;
            data.record = record;
            data.options = Object.freeze(options);
            data.id = defaultIds[request.id] ?? request.id;
        },
    );
    rendering.extend(
        "render",
        { id: "smtp:composeTemplateFactory" },
        async ({ input, data }) => {
            const request = input as {
                message: NotificationActionMessage;
                theme: "light" | "dark";
                variables: Record<string, string>;
            };
            data.message = await (
                data.record as { definition: EmailTemplateFactory }
            ).definition.render(structuredClone(request.message), {
                theme: request.theme,
                variables: { ...request.variables },
                options: data.options as Record<string, unknown>,
            });
        },
    );
    rendering.extend(
        "validate-output",
        { id: "smtp:validateTemplateResult" },
        ({ data }) => {
            if (
                records.get(String(data.id)) !== data.record ||
                !lifetimes.get(data.record as object)?.active ||
                lifetimes.get(data.record as object)?.revision !== data.revision
            )
                throw new Error("email_template_factory_unavailable");
            const message = data.message as NotificationActionMessage;
            if (
                !message ||
                typeof message.subject !== "string" ||
                typeof message.body !== "string"
            )
                throw new Error("invalid_email_template_message");
            if (message.actionUrl) safeEmailUrl(message.actionUrl);
            data.message = {
                ...message,
                ...(message.presentation
                    ? {
                          presentation: validateEmailPresentation(
                              message.presentation,
                          ),
                      }
                    : {}),
            };
        },
    );
    const bindFactory = (id: string, options: Record<string, unknown> = {}) => {
        const expected = records.get(defaultIds[id] ?? id);
        if (!expected) throw new Error("email_template_factory_unavailable");
        const configured = structuredClone(
            validateFactoryOptions(expected.definition, options),
        );
        return async (
            message: NotificationActionMessage,
            theme: "light" | "dark",
            variables: Record<string, string>,
        ) =>
            (
                await root.flow.run("smtp:renderTemplateFactory", {
                    id,
                    message,
                    options: configured,
                    theme,
                    variables,
                    expected,
                })
            ).data.message as NotificationActionMessage;
    };
    return Object.freeze({
        version: 1,
        blocks,
        compose,
        registerFactory,
        bindFactory,
        listFactories: () =>
            [...records].map(([id, { definition }]) => ({
                id,
                labelKey: definition.labelKey,
                stringsBaseUrl: definition.stringsBaseUrl,
                options: structuredClone(definition.options),
            })),
        async render(
            id: string,
            message: NotificationActionMessage,
            options: Record<string, unknown>,
            theme: "light" | "dark",
            variables: Record<string, string>,
        ) {
            return bindFactory(id, options)(message, theme, variables);
        },
    });
}

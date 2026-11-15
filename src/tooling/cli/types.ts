import type { WizardField } from "./wizard.ts";

export interface CommandInputSpec {
    params: string[];
    bodyFields?: WizardField[];
    queryFields?: WizardField[];
}

export interface CommandContext {
    args: string[];
    apiBaseUrl: string;
    getApiToken: () => Promise<string>;
    verbose?: boolean;
    reportProgress?: (progress: Record<string, unknown>) => void;
}

export interface CommandExecutionOptions {
    apiBaseUrl: string;
    getApiToken: () => Promise<string>;
    verbose?: boolean;
    reportProgress?: (progress: Record<string, unknown>) => void;
}

export type CommandHandler = (ctx: CommandContext) => Promise<unknown>;
export type CommandRenderer = (payload: unknown) => string;

export interface CommandSpec {
    name: string;
    usage: string;
    description: string;
    section: string;
    handler: CommandHandler;
    render?: CommandRenderer;
    exitCode?: (payload: unknown) => number;
    input?: CommandInputSpec;
    wizardFields?: WizardField[];
}

export interface RegisterCommandOptions {
    usage?: string;
    description?: string;
    section?: string;
    render?: CommandRenderer;
    exitCode?: (payload: unknown) => number;
    input?: CommandInputSpec;
    wizardFields?: WizardField[];
}

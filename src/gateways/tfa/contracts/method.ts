import type { TfaAdapterBootstrapContext } from "../adapter-bootstrap.js";

export interface TfaConfigField {
    key: string;
    label: string;
    type: "text" | "password" | "number" | "boolean" | "select";
    required: boolean;
    envVar?: string;
    options?: string[];
}

export interface TfaMethodSetupView {
    prompt: string;
    fields?: Array<{
        key: string;
        label: string;
        type: "text" | "number" | "password";
        inputMode?: "numeric" | "text";
        maxLength?: number;
    }>;
    details?: Record<string, string>;
}

export interface TfaLoginPresentation {
    placeholderKey: string;
    supportsResend?: boolean;
    challengeOnSelect?: boolean;
}

export interface TfaMethodAdapter {
    bootstrap?(ctx: TfaAdapterBootstrapContext): Promise<void>;
    readonly id: string;
    readonly name: string;
    readonly version?: string;
    readonly publisher?: string;
    readonly defaultEnabled?: boolean;
    readonly stringsBaseUrl?: string;
    readonly loginUi?: TfaLoginPresentation;
    beginSetup(input: {
        accountId: string;
        displayName: string;
        issuer: string;
    }): Promise<{
        pendingPayload: Record<string, unknown>;
        view: TfaMethodSetupView;
    }>;
    verifySetup(input: {
        accountId: string;
        pendingPayload: Record<string, unknown>;
        verification: Record<string, unknown>;
    }): Promise<{
        verified: boolean;
        state?: Record<string, unknown>;
        message?: string;
    }>;
    verifyLogin(input: {
        accountId: string;
        state: Record<string, unknown>;
        payload: Record<string, unknown>;
    }): Promise<{ verified: boolean; message?: string }>;
    beginLoginChallenge?(input: {
        accountId: string;
        state: Record<string, unknown>;
    }): Promise<{
        ready: boolean;
        message?: string;
        retryAfterSeconds?: number;
        resendAvailableAt?: string;
    }>;
    renderMethodDetails?(input: {
        accountId: string;
        state: Record<string, unknown>;
        issuer: string;
    }): Promise<{ details: Record<string, string> } | null>;
    getConfigSchema(): TfaConfigField[];
    configure?(config: Record<string, unknown>): void;
}

import type { TfaAdapterBootstrapContext } from "../adapter-bootstrap.js";

export interface TfaChallengeLifetime {
    readonly id: string;
    readonly expiresAt: number;
    readonly signal: AbortSignal;
}

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
    defineContracts?(ctx: TfaAdapterBootstrapContext): void | Promise<void>;
    bootstrap?(ctx: TfaAdapterBootstrapContext): Promise<void>;
    readonly id: string;
    readonly name: string;
    readonly version?: string;
    readonly publisher?: string;
    readonly defaultEnabled?: boolean;
    readonly stringsBaseUrl?: string;
    readonly loginUi?: TfaLoginPresentation;
    beginSetup(input: {
        lifetime: TfaChallengeLifetime;
        accountId: string;
        displayName: string;
        issuer: string;
    }): Promise<{
        pendingPayload: Record<string, unknown>;
        view: TfaMethodSetupView;
    }>;
    cancelSetup?(input: {
        accountId: string;
        pendingPayload: Record<string, unknown>;
    }): Promise<void>;
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
        lifetime: TfaChallengeLifetime;
        accountId: string;
        state: Record<string, unknown>;
        payload: Record<string, unknown>;
    }): Promise<{ verified: boolean; message?: string }>;
    beginLoginChallenge?(input: {
        lifetime: TfaChallengeLifetime;
        accountId: string;
        state: Record<string, unknown>;
    }): Promise<{
        ready: boolean;
        message?: string;
        retryAfterSeconds?: number;
        resendAvailableAt?: string;
        maxLength?: number;
        deliveryStatus?: "queued" | "sent";
    }>;
    renderMethodDetails?(input: {
        accountId: string;
        state: Record<string, unknown>;
        issuer: string;
    }): Promise<{ details: Record<string, string> } | null>;
    getConfigSchema(): TfaConfigField[];
    configure?(config: Record<string, unknown>): void;
}

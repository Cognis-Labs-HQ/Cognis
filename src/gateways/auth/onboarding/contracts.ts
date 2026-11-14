import type { IncomingMessage } from "node:http";

export interface OnboardingOperationContext {
    readonly accountId: string;
    assertCurrent(): Promise<void>;
}

export interface OnboardingOperation {
    id: string;
    available?: () => boolean | Promise<boolean>;
    execute(
        context: OnboardingOperationContext,
        input: unknown,
    ): Promise<unknown>;
}

export interface OnboardingAuthority {
    registerOperation(operation: OnboardingOperation): void;
    listOperations(): string[];
    issue(accountId: string): Promise<string>;
    dispatch(
        request: IncomingMessage,
        operation: string,
        input: unknown,
    ): Promise<unknown>;
    complete(request: IncomingMessage): Promise<void>;
    revokeForAccount(accountId: string): number;
}

export class OnboardingError extends Error {
    constructor(
        readonly status: number,
        readonly code: string,
    ) {
        super(code);
    }
}

export function publicOperationError(error: unknown): OnboardingError | null {
    if (!error || typeof error !== "object" || error instanceof Error)
        return null;
    const value = error as Record<string, unknown>;
    if (
        Object.keys(value).length !== 2 ||
        typeof value.status !== "number" ||
        ![400, 409, 422, 429, 503].includes(value.status) ||
        typeof value.code !== "string" ||
        !/^[a-z][a-z0-9_]{0,79}$/.test(value.code)
    )
        return null;
    return new OnboardingError(value.status, value.code);
}

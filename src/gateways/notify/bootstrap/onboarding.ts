import {
    EmailVerificationError,
    type EmailVerification,
} from "./email-verification.js";

interface OnboardingContext {
    accountId: string;
    assertCurrent(): Promise<void>;
}

export interface OnboardingOperations {
    registerOperation(operation: {
        id: string;
        available?: () => boolean | Promise<boolean>;
        execute(context: OnboardingContext, input: unknown): Promise<unknown>;
    }): void;
}

function readInput(input: unknown, keys: string[]): Record<string, string> {
    if (
        !input ||
        typeof input !== "object" ||
        Array.isArray(input) ||
        Object.keys(input).length !== keys.length ||
        keys.some((key) => !Object.hasOwn(input, key))
    )
        throw { status: 400, code: "invalid_email_verification_request" };
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(input)) {
        if (typeof value !== "string" || !value.trim())
            throw { status: 400, code: "invalid_email_verification_request" };
        result[key] = value;
    }
    return result;
}

export function registerEmailOnboarding(
    onboarding: OnboardingOperations,
    verification: EmailVerification,
    deliveryAvailable: () => boolean,
    ownerAvailable: () => boolean,
): void {
    const execute = async (operation: () => Promise<unknown>) => {
        try {
            return await operation();
        } catch (error) {
            if (error instanceof EmailVerificationError)
                throw { status: error.status, code: error.code };
            throw error;
        }
    };
    onboarding.registerOperation({
        id: "notify:email:add",
        available: () => ownerAvailable() && deliveryAvailable(),
        async execute(context, input) {
            const body = readInput(input, ["email"]);
            return execute(() =>
                verification.add(
                    context.accountId,
                    body.email,
                    context.assertCurrent,
                ),
            );
        },
    });
    onboarding.registerOperation({
        id: "notify:email:verify",
        available: ownerAvailable,
        async execute(context, input) {
            const body = readInput(input, ["email", "code"]);
            return execute(() =>
                verification.verify(
                    context.accountId,
                    body.email,
                    body.code,
                    context.assertCurrent,
                ),
            );
        },
    });
}

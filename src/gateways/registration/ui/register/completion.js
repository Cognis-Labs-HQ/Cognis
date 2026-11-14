import {
    snapshotRegistrationDescriptor,
    registrationCompletionCallback,
} from "./integrations.js";

function cancelled() {
    const error = new Error("registration_cancelled");
    error.code = "registration_cancelled";
    return error;
}

export function createRegistrationCompletion({
    createAccount,
    createClient,
    verifyEmail,
    integrations,
    signal,
    reportCleanupError,
}) {
    let configurationError;
    const completionIntegrations = [];
    for (const integration of integrations) {
        try {
            const descriptor = snapshotRegistrationDescriptor(
                integration.descriptor ?? {},
            );
            completionIntegrations.push({
                descriptor,
                complete: registrationCompletionCallback(
                    descriptor,
                    integration.module,
                ),
                i18n: integration.i18n,
            });
        } catch (error) {
            configurationError = error;
        }
    }
    let running = false;
    let accountCreated = false;
    let disposed = signal?.aborted === true;
    let client;
    let acceptingOperations = false;
    const assertCurrent = () => {
        if (disposed || signal?.aborted) throw cancelled();
    };
    const dispose = () => {
        disposed = true;
        if (client) client.complete().catch(reportCleanupError);
    };
    signal?.addEventListener("abort", dispose, { once: true });
    return {
        dispose,
        isCurrent: () => !disposed && !signal?.aborted,
        async run({ account, values, invite }) {
            if (running || accountCreated) return { outcome: "busy" };
            assertCurrent();
            if (configurationError) throw configurationError;
            running = true;
            try {
                const result = await createAccount(account);
                accountCreated = true;
                client = createClient(result.verifyToken);
                assertCurrent();
                acceptingOperations = true;
                if (!invite && account.email) {
                    const verified = await verifyEmail(
                        client.execute,
                        account.email,
                        result.onboardingOperations,
                    );
                    if (verified === false) throw cancelled();
                    assertCurrent();
                }
                for (const integration of completionIntegrations) {
                    if (!integration.complete) continue;
                    const allowedOperations =
                        integration.descriptor.onboardingOperations;
                    await integration.complete({
                        values,
                        i18n: integration.i18n,
                        descriptor: integration.descriptor,
                        executeOnboarding: async (operation, input) => {
                            assertCurrent();
                            if (!acceptingOperations)
                                throw new Error("onboarding_closed");
                            if (!allowedOperations.includes(operation))
                                throw new Error(
                                    "registration_operation_not_declared",
                                );
                            const { execute: executeOnboarding } = client;
                            const result = await executeOnboarding(
                                operation,
                                input,
                            );
                            assertCurrent();
                            return result;
                        },
                    });
                    assertCurrent();
                }
                acceptingOperations = false;
                await client.complete();
                assertCurrent();
                return { outcome: "completed" };
            } catch (failure) {
                acceptingOperations = false;
                const error =
                    failure instanceof Error
                        ? failure
                        : new Error("registration_failed");
                accountCreated ||= error.accountCreated === true;
                if (client) {
                    try {
                        await client.complete();
                    } catch (cleanupError) {
                        reportCleanupError(cleanupError);
                        cleanupError.accountCreated = accountCreated;
                        throw cleanupError;
                    }
                }
                error.accountCreated = accountCreated;
                throw error;
            } finally {
                acceptingOperations = false;
                running = false;
            }
        },
    };
}

export function snapshotRegistrationDescriptor(descriptor) {
    if (
        !descriptor ||
        typeof descriptor !== "object" ||
        Array.isArray(descriptor)
    )
        throw new Error("registration_descriptor_unavailable");
    const snapshot = { ...descriptor };
    if (Object.hasOwn(snapshot, "onboardingOperations")) {
        const declared = snapshot.onboardingOperations;
        if (
            !Array.isArray(declared) ||
            declared.some(
                (operation) => typeof operation !== "string" || !operation,
            )
        )
            throw new Error("registration_operations_unavailable");
        snapshot.onboardingOperations = Object.freeze([...declared]);
    }
    return Object.freeze(snapshot);
}

export function registrationCompletionCallback(descriptor, module) {
    const callback = module?.completeRegistration;
    if (Object.hasOwn(descriptor, "onboardingOperations")) {
        if (typeof callback !== "function")
            throw new Error("registration_completion_unavailable");
        return callback;
    }
    if (module && Object.hasOwn(module, "completeRegistration"))
        throw new Error("registration_operations_unavailable");
    return undefined;
}

export async function loadRegistrationIntegrations({
    descriptors,
    loadModule,
    loadI18n,
    onError,
}) {
    const integrations = [];
    let ready = true;
    const snapshots = [];
    for (const descriptor of descriptors) {
        try {
            snapshots.push(snapshotRegistrationDescriptor(descriptor));
        } catch (error) {
            ready = false;
            onError(error, descriptor);
        }
    }
    for (const descriptor of snapshots) {
        const declaresOnboarding = Object.hasOwn(
            descriptor,
            "onboardingOperations",
        );
        try {
            const imported = await loadModule(descriptor.scriptUrl);
            try {
                registrationCompletionCallback(descriptor, imported);
            } catch (error) {
                ready = false;
                throw error;
            }
            const module = Object.freeze({ ...imported });
            integrations.push(
                Object.freeze({
                    descriptor,
                    module,
                    i18n: await loadI18n(descriptor.stringsBaseUrl),
                }),
            );
        } catch (error) {
            if (declaresOnboarding) ready = false;
            onError(error, descriptor);
        }
    }
    return { integrations, ready };
}

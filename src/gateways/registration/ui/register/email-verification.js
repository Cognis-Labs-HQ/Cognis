export async function verifyRegistrationEmail({
    executeOnboarding,
    email,
    operations,
    required,
    prompt,
    onInvalid,
    signal,
    loadClient = () => import("/static/gateways/notify/onboarding-client.js"),
}) {
    if (!Array.isArray(operations))
        throw new Error("onboarding_operations_unavailable");
    const addAvailable = operations.includes("notify:email:add");
    const verifyAvailable = operations.includes("notify:email:verify");
    if (!addAvailable && !verifyAvailable && !required) return true;
    if (!addAvailable || !verifyAvailable)
        throw new Error("email_verification_unavailable");
    const { addOnboardingEmail, verifyOnboardingEmail } = await loadClient();
    if (signal?.aborted) return false;
    const added = await addOnboardingEmail(executeOnboarding, email);
    if (added.verificationEmailFailed) throw new Error("email_delivery_failed");
    while (!signal?.aborted) {
        const code = await prompt(email);
        if (!code || signal?.aborted) return false;
        try {
            await verifyOnboardingEmail(executeOnboarding, email, code);
            return !signal?.aborted;
        } catch (error) {
            if (signal?.aborted) return false;
            if (error.status !== 422) throw error;
            onInvalid();
        }
    }
    return false;
}

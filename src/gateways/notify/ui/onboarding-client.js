export function addOnboardingEmail(executeOnboarding, email) {
    return executeOnboarding("notify:email:add", { email });
}

export function verifyOnboardingEmail(executeOnboarding, email, code) {
    return executeOnboarding("notify:email:verify", { email, code });
}

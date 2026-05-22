const passwordPolicyModule =
    typeof window === "undefined"
        ? await import("../../gateways/auth/ui/password-policy.js")
        : await import("/static/gateways/auth/ui/password-policy.js");

export const {
    DEFAULT_PASSWORD_POLICY,
    normalizePasswordPolicy,
    parsePolicyCount,
} = passwordPolicyModule;

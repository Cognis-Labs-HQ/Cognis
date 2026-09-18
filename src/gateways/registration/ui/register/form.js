import { clearStoredAuthSession } from "/static/reuse/auth-session.js";
import { countPatternMatches } from "/static/gateways/auth/password-policy.js";

export async function resetAuthSessionForRegister() {
    const hadStoredSession =
        Boolean(localStorage.getItem("cognis_access_token")) ||
        Boolean(localStorage.getItem("cognis_account"));
    try {
        await fetch("/api/v1/auth/logout", {
            method: "POST",
            credentials: "same-origin",
        });
    } catch {}
    clearStoredAuthSession();
    return hadStoredSession;
}

export function buildPasswordCriteria(policy) {
    const requirements = [
        [
            "minLength",
            "password-min-length",
            (value, count) => value.length >= count,
            "password_too_short",
            "min",
        ],
        [
            "requireUppercase",
            "password-uppercase-count",
            (value, count) => countPatternMatches(value, /[A-Z]/g) >= count,
            "password_requires_uppercase",
            "count",
        ],
        [
            "requireLowercase",
            "password-lowercase-required",
            (value, count) => countPatternMatches(value, /[a-z]/g) >= count,
            "password_requires_lowercase",
            "count",
        ],
        [
            "requireDigit",
            "password-digit-count",
            (value, count) => countPatternMatches(value, /[0-9]/g) >= count,
            "password_requires_digit",
            "count",
        ],
        [
            "requireSpecial",
            "password-special-count",
            (value, count) =>
                countPatternMatches(value, /[^A-Za-z0-9]/g) >= count,
            "password_requires_special",
            "count",
        ],
    ];
    return requirements.flatMap(([key, id, test, message, parameter]) => {
        const count = policy[key];
        return count > 0
            ? [
                  {
                      id,
                      type: "custom",
                      test: (value) => test(value, count),
                      messageKey: `ui.app.register.error.${message}`,
                      messageParams: { [parameter]: count },
                      mode: "live",
                  },
              ]
            : [];
    });
}

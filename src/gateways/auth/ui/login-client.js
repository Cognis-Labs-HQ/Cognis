export async function startSsoLogin(providerId) {
    const response = await fetch("/api/v1/auth/sso/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ providerId }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || typeof payload?.data?.redirectUrl !== "string") {
        const error = new Error(
            payload?.error?.message ?? "SSO authorization is unavailable.",
        );
        error.code = payload?.error?.code ?? "sso_authorization_unavailable";
        throw error;
    }
    return payload.data.redirectUrl;
}

export async function loadLoginMethods() {
    const response = await fetch("/api/v1/auth/login-methods");
    if (!response.ok) return [];
    const payload = await response.json().catch(() => null);
    return Array.isArray(payload?.data) ? payload.data : [];
}

export async function authorizePendingAccountCreation({
    registrationToken,
    email,
}) {
    const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
            registrationToken,
            ...(email ? { email } : {}),
        }),
    });
    const payload = await response.json().catch(() => null);
    return { response, payload };
}

export async function getPendingAccountCreation() {
    const response = await fetch("/api/v1/auth/account-creation-attempt");
    if (!response.ok) return null;
    const payload = await response.json().catch(() => null);
    return payload?.data ?? null;
}

export async function loadRegistrationConfig() {
    const response = await fetch("/api/v1/auth/registration-config");
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
        const error = new Error(
            payload?.error?.message ??
                "Registration configuration is unavailable.",
        );
        error.code = payload?.error?.code ?? "registration_config_unavailable";
        throw error;
    }
    const data = payload?.data ?? {};
    const integrations = [];
    if (data.integrations !== undefined && !Array.isArray(data.integrations))
        throw new Error("registration_configuration_unavailable");
    for (const descriptor of data.integrations ?? []) {
        const valid =
            descriptor &&
            typeof descriptor === "object" &&
            !Array.isArray(descriptor) &&
            typeof descriptor.id === "string" &&
            descriptor.id.trim() &&
            typeof descriptor.scriptUrl === "string" &&
            descriptor.scriptUrl.trim();
        if (!valid) {
            if (descriptor && Object.hasOwn(descriptor, "onboardingOperations"))
                throw new Error("registration_configuration_unavailable");
            continue;
        }
        integrations.push(descriptor);
    }
    return {
        registrationsEnabled: data.registrationsEnabled === true,
        userValidationMode: String(data.userValidationMode ?? "none"),
        requiredFields: Array.isArray(data.requiredFields)
            ? data.requiredFields.filter((key) => typeof key === "string")
            : [],
        integrations,
    };
}

export async function cancelPendingAccountCreation() {
    await fetch("/api/v1/auth/account-creation-attempt", {
        method: "DELETE",
    });
}

export function persistLoginSession(data, storage = localStorage) {
    storage.setItem("cognis_access_token", data.token);
    storage.setItem("cognis_account", data.accountId);
    storage.setItem("cognis_display_name", data.displayName || data.accountId);
    storage.setItem("cognis_role", data.role || "user");
    storage.setItem(
        "cognis_provider_id",
        data.providerId || data.provider || "local",
    );
    storage.setItem("cognis_is_founder", data.isFounder ? "true" : "false");
    storage.setItem("cognis_login_time", new Date().toISOString());
    if (data.ttlSeconds === null) {
        storage.removeItem("cognis_session_expires_at");
    } else if (Number.isFinite(data.ttlSeconds)) {
        storage.setItem(
            "cognis_session_expires_at",
            new Date(Date.now() + data.ttlSeconds * 1000).toISOString(),
        );
    }
    storage.setItem(
        "cognis_user_validation_mode",
        data.userValidationMode || "none",
    );
}

export async function getPendingLoginAttempt({ signal } = {}) {
    const response = await fetch("/api/v1/auth/login-attempt", {
        signal,
        cache: "no-store",
    });
    const payload = await response.json();
    if (!response.ok || !Object.hasOwn(payload ?? {}, "data"))
        throw new Error("login_attempt_unavailable");
    const data = payload.data;
    if (
        data !== null &&
        (data?.tfaRequired !== true ||
            data.loginUrl !== "/login" ||
            typeof data.loginAttemptId !== "string" ||
            !Array.isArray(data.methods) ||
            !data.methods.length ||
            data.token)
    ) {
        throw new Error("login_attempt_unavailable");
    }
    return data;
}

export async function cancelPendingLoginAttempt(
    loginAttemptId,
    { signal } = {},
) {
    const response = await fetch("/api/v1/auth/login-attempt", {
        method: "DELETE",
        signal,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ loginAttemptId }),
    });
    if (!response.ok) throw new Error("login_attempt_unavailable");
}

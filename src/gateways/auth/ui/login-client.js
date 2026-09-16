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

export async function authorizePendingAccountCreation({
    accountCreationAttemptId,
    registrationToken,
    email,
}) {
    const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
            accountCreationAttemptId,
            registrationToken,
            ...(email ? { email } : {}),
        }),
    });
    const payload = await response.json().catch(() => null);
    return { response, payload };
}

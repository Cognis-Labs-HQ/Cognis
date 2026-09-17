const REGISTRATION_STRINGS_BASE_URL = "/static/gateways/registration/languages";

export async function loadRegistrationAvailability(apiFetch) {
    const gatewayResponse = await apiFetch("/api/v1/gateways/registration");
    if (!gatewayResponse.ok) return false;
    const gatewayPayload = await gatewayResponse.json();
    if (gatewayPayload?.data?.status === "disabled") return false;

    const adaptersResponse = await apiFetch(
        "/api/v1/gateways/registration/adapters",
    );
    if (!adaptersResponse.ok) return false;
    const adaptersPayload = await adaptersResponse.json();
    const adapters = Array.isArray(adaptersPayload?.data)
        ? adaptersPayload.data
        : [];
    return adapters.some(
        (adapter) => adapter.id === "token" && adapter.enabled === true,
    );
}

export async function loadRegistrationInviteUi(i18n, extendI18n) {
    return extendI18n(i18n, REGISTRATION_STRINGS_BASE_URL);
}

export function createRegistrationToken(apiFetch, { email, delivery }) {
    return apiFetch("/api/v1/registration/tokens", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, delivery }),
    });
}

export function listRegistrationTokens(
    apiFetch,
    { includeClosed = false } = {},
) {
    return apiFetch(
        `/api/v1/registration/tokens${includeClosed ? "?includeClosed=true" : ""}`,
        { cache: "no-store" },
    );
}

export function loadRegistrationState(apiFetch) {
    return apiFetch("/api/v1/registration/state");
}

export function revokeRegistrationToken(apiFetch, tokenId) {
    return apiFetch(
        `/api/v1/registration/tokens/${encodeURIComponent(tokenId)}/revoke`,
        { method: "POST" },
    );
}

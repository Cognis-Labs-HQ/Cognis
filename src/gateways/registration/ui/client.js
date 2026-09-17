const REGISTRATION_STRINGS_BASE_URL = "/static/gateways/registration/languages";
const REGISTRATION_INVITE_STYLES_URL =
    "/static/gateways/registration/invite.css";
let inviteStylesReady = null;

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
    if (!inviteStylesReady) {
        inviteStylesReady = new Promise((resolve, reject) => {
            const existing = document.querySelector(
                `link[href="${REGISTRATION_INVITE_STYLES_URL}"]`,
            );
            if (existing?.sheet) {
                resolve();
                return;
            }
            const stylesheet = existing ?? document.createElement("link");
            stylesheet.addEventListener("load", resolve, { once: true });
            stylesheet.addEventListener(
                "error",
                () => reject(new Error("registration_invite_styles_failed")),
                { once: true },
            );
            if (!existing) {
                stylesheet.rel = "stylesheet";
                stylesheet.href = REGISTRATION_INVITE_STYLES_URL;
                document.head.append(stylesheet);
            }
        });
    }
    await inviteStylesReady;
    return extendI18n(i18n, REGISTRATION_STRINGS_BASE_URL);
}

export function createRegistrationToken(apiFetch, { email, delivery }) {
    return apiFetch("/api/v1/registration/tokens", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, delivery }),
    });
}

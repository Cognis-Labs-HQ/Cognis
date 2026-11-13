export const REGISTRATION_ERROR_CODES = new Set([
    "invalid_token",
    "username_taken",
    "username_invalid",
    "username_too_long",
    "username_not_lowercase",
    "username_and_password_required",
    "inviter_not_found",
    "generic",
]);

export function readAccountCreationAuthorization(data) {
    const expiresAt = Number(data?.expiresAt);
    return {
        active: Boolean(data) && Number.isFinite(expiresAt),
        emailRequired: data?.emailRequired === true,
        expiresAt: Number.isFinite(expiresAt) ? expiresAt : null,
    };
}

function findIntegration(integrations, method) {
    return integrations.find(
        (integration) => typeof integration.module[method] === "function",
    );
}

export function renderAccountCreationAuthorization({
    integrations,
    request,
    escapeHtml,
}) {
    if (!request.active) return null;
    const integration = findIntegration(
        integrations,
        "renderAccountCreationAuthorization",
    );
    return integration
        ? integration.module.renderAccountCreationAuthorization({
              i18n: integration.i18n,
              escapeHtml,
              expiresAt: request.expiresAt,
              emailRequired: request.emailRequired,
          })
        : null;
}

export function bindAccountCreationAuthorization({
    integrations,
    request,
    root,
    showToast,
    signal,
    formatCountdownClock,
}) {
    if (!request.active) return false;
    const integration = findIntegration(
        integrations,
        "bindAccountCreationAuthorization",
    );
    if (!integration) return false;
    integration.module.bindAccountCreationAuthorization({
        root,
        i18n: integration.i18n,
        emailRequired: request.emailRequired,
        expiresAt: request.expiresAt,
        showToast,
        signal,
        formatCountdownClock,
    });
    return true;
}

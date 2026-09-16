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

export function readAccountCreationAuthorization(params) {
    return {
        attemptId: String(params.get("accountCreationAttempt") ?? "").trim(),
        emailRequired: params.get("emailRequired") === "true",
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
    if (!request.attemptId) return null;
    const integration = findIntegration(
        integrations,
        "renderAccountCreationAuthorization",
    );
    return integration
        ? integration.module.renderAccountCreationAuthorization({
              i18n: integration.i18n,
              escapeHtml,
          })
        : null;
}

export function bindAccountCreationAuthorization({
    integrations,
    request,
    root,
    showToast,
    signal,
}) {
    if (!request.attemptId) return false;
    const integration = findIntegration(
        integrations,
        "bindAccountCreationAuthorization",
    );
    if (!integration) return false;
    integration.module.bindAccountCreationAuthorization({
        root,
        i18n: integration.i18n,
        attemptId: request.attemptId,
        emailRequired: request.emailRequired,
        showToast,
        signal,
    });
    return true;
}

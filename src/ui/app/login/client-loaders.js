export function createLoginClientLoaders({ loadClient, i18n, root }) {
    let tfaClientPromise = null;
    let requiredEmailClientPromise = null;
    return {
        loadTfaLoginClient() {
            tfaClientPromise ??= loadClient("tfa", (module) =>
                module.createTfaLoginClient({ baseI18n: i18n, root }),
            );
            return tfaClientPromise;
        },
        loadRequiredEmailEnforcementClient() {
            requiredEmailClientPromise ??= loadClient(
                "required-email-enforcement",
                (module) => module.createRequiredEmailEnforcementClient(),
            );
            return requiredEmailClientPromise;
        },
    };
}

export function createRouteScopedToast(showToast, signal) {
    const dismissers = new Set();
    const dismissAll = () => {
        for (const dismiss of dismissers) dismiss();
        dismissers.clear();
    };
    signal?.addEventListener("abort", dismissAll, { once: true });
    return (message, options = {}) => {
        const originalOnDismiss = options.onDismiss;
        let dismiss = null;
        dismiss = showToast(message, {
            ...options,
            onDismiss: () => {
                dismissers.delete(dismiss);
                originalOnDismiss?.();
            },
        });
        dismissers.add(dismiss);
        if (signal?.aborted) dismiss();
        return dismiss;
    };
}

export function showLoginReasonToast({ reason, i18n, showToast }) {
    const key = {
        session_expired: "ui.app.login.reason.session_expired",
        account_disabled: "ui.app.login.reason.account_disabled",
        account_archived: "ui.app.login.reason.account_archived",
        account_deactivated: "ui.app.login.reason.account_deactivated",
        account_deleted: "ui.app.login.reason.account_deleted",
    }[reason];
    if (!key) return null;
    return showToast(i18n.t(key), { variant: "error", permanent: true });
}

export function createLoginReasonNotifier(options) {
    let shown = false;
    return () => {
        if (shown) return false;
        shown = Boolean(showLoginReasonToast(options));
        return shown;
    };
}

export async function isPublicRegistrationEnabled() {
    try {
        const response = await fetch("/api/v1/auth/registration-config");
        if (!response.ok) return false;
        const payload = await response.json();
        return payload?.data?.registrationsEnabled === true;
    } catch {
        return false;
    }
}

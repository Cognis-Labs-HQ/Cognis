import { replaceMountScope } from "/static/reuse/mount-scope.js";

export function createLoginClientLoaders({
    loadClient,
    i18n,
    root,
    signal,
    getAttemptId = () => null,
    isAttemptCurrent = () => true,
}) {
    const log = console.error.bind(console);
    const rejectLifecycle = () => {
        log("[auth] TFA login lifecycle unsupported", {
            component: "auth",
            operation: "loadTfaLoginClient",
            code: "tfa_login_lifecycle_unsupported",
        });
        throw new Error("tfa_login_lifecycle_unsupported");
    };
    let tfaClientPromise = null;
    let clientLifetime = null;
    const disposeTfaLoginClient = () => {
        clientLifetime?.abort();
        clientLifetime = null;
        tfaClientPromise = null;
    };
    let clientRoot = null;
    let clientAttemptId = null;
    return {
        disposeTfaLoginClient,
        loadTfaLoginClient() {
            if (signal?.aborted) return Promise.resolve(null);
            const currentRoot = root.querySelector?.("#login-form") ?? root;
            const attemptId = getAttemptId();
            if (currentRoot !== clientRoot || clientAttemptId !== attemptId) {
                clientAttemptId = attemptId;
                clientRoot = currentRoot;
                disposeTfaLoginClient();
            }
            if (!tfaClientPromise) {
                clientLifetime = replaceMountScope(clientLifetime, signal);
                const clientSignal = clientLifetime.signal;
                const scopedRoot = {
                    querySelector(selector) {
                        const mountedRoot =
                            root.querySelector?.("#login-form") ?? root;
                        return !clientSignal.aborted &&
                            mountedRoot === currentRoot &&
                            isAttemptCurrent(attemptId)
                            ? currentRoot.querySelector(selector)
                            : null;
                    },
                };
                const pending = Promise.resolve().then(() =>
                    loadClient("tfa", async (module) => {
                        if (module.loginLifecycleVersion !== 1) {
                            rejectLifecycle();
                        }
                        const client = await module.createTfaLoginClient({
                            baseI18n: i18n,
                            root: scopedRoot,
                            signal: clientSignal,
                            lifecycleVersion: 1,
                        });
                        if (clientSignal.aborted) return null;
                        if (
                            client?.lifecycle?.version !== 1 ||
                            client.lifecycle.signal !== clientSignal ||
                            typeof client.refreshPrompt !== "function"
                        ) {
                            rejectLifecycle();
                        }
                        return client;
                    }),
                );
                tfaClientPromise = pending;
                pending.then(
                    (client) => {
                        if (!client && tfaClientPromise === pending)
                            disposeTfaLoginClient();
                    },
                    () => {
                        if (tfaClientPromise === pending)
                            disposeTfaLoginClient();
                    },
                );
            }
            return tfaClientPromise;
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
        session_unavailable: "ui.app.login.error.generic",
        tfa_unavailable: "ui.app.login.error.generic",
        account_archived: "ui.app.login.reason.account_archived",
        account_deactivated: "ui.app.login.reason.account_deactivated",
        account_deleted: "ui.app.login.reason.account_deleted",
        sso_callback_failed: "ui.app.login.reason.sso_callback_failed",
        sso_provider_unavailable:
            "ui.app.login.reason.sso_provider_unavailable",
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
        return (await loadRegistrationConfig()).registrationsEnabled;
    } catch {
        return false;
    }
}
import { loadRegistrationConfig } from "../login-client.js";

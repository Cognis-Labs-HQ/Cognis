import { redirectToRequiredTfaSetup } from "/static/reuse/auth-setup-route.js";
import { extendI18n } from "/static/reuse/i18n.js";
import { ensurePageStylesheet } from "/static/reuse/page-styles.js";
import { showToast } from "/static/reuse/toast.js";
import { captureAccountGuard } from "/static/reuse/offline-identity.js";

export const loginLifecycleVersion = 1;

function setActiveTfaInputPresentation(i18n, method, tfaCodeInput) {
    if (!(tfaCodeInput instanceof HTMLInputElement)) {
        return;
    }
    const placeholderKey =
        method?.loginUi?.placeholderKey ?? "ui.app.login.tfa.code_placeholder";
    const placeholderText = i18n.t(placeholderKey);
    tfaCodeInput.placeholder = placeholderText;
    tfaCodeInput.setAttribute("aria-label", placeholderText);
    const maxLength = method?.challenge?.maxLength;
    if (Number.isInteger(maxLength) && maxLength > 0) {
        tfaCodeInput.setAttribute("maxlength", String(maxLength));
    } else {
        tfaCodeInput.removeAttribute("maxlength");
    }
}

function getMethodById(methods, methodId) {
    return (
        (Array.isArray(methods) ? methods : []).find(
            (method) => method?.id === methodId,
        ) ?? null
    );
}

function parseChallengeResendTimestamp(method) {
    const resendAvailableAt = String(
        method?.challenge?.resendAvailableAt ?? "",
    ).trim();
    if (resendAvailableAt) {
        const parsedTime = Date.parse(resendAvailableAt);
        if (Number.isFinite(parsedTime)) {
            return parsedTime;
        }
    }
    const retryAfterSeconds = Number.parseInt(
        String(method?.challenge?.retryAfterSeconds ?? ""),
        10,
    );
    if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
        return Date.now() + retryAfterSeconds * 1000;
    }
    return null;
}

export function renderTfaMethodTabs(
    i18n,
    methods,
    onMethodChanged,
    root = document,
    onMethodActivated,
) {
    const tabsEl = root.querySelector("#login-tfa-method-nav");
    const methodInput = root.querySelector("#login-tfa-method");
    const tfaCodeInput = root.querySelector("#login-tfa-code");
    if (
        !(tabsEl instanceof HTMLElement) ||
        !(methodInput instanceof HTMLInputElement)
    ) {
        return;
    }
    tabsEl.replaceChildren();
    methodInput.value = "";
    setActiveTfaInputPresentation(i18n, null, tfaCodeInput);
    const normalizedMethods = Array.isArray(methods) ? methods : [];
    normalizedMethods.forEach((method, index) => {
        const tabLink = document.createElement("a");
        tabLink.href = "#";
        tabLink.textContent = method.name;
        tabLink.addEventListener("click", (event) => {
            event.preventDefault();
            methodInput.value = method.id;
            tabsEl.querySelectorAll("a").forEach((entry) => {
                entry.classList.toggle("active", entry === tabLink);
            });
            setActiveTfaInputPresentation(i18n, method, tfaCodeInput);
            onMethodChanged?.(method);
            onMethodActivated?.(method);
        });
        if (index === 0) {
            tabLink.classList.add("active");
            methodInput.value = method.id;
            setActiveTfaInputPresentation(i18n, method, tfaCodeInput);
            onMethodChanged?.(method);
        }
        tabsEl.appendChild(tabLink);
    });
    tabsEl.hidden = normalizedMethods.length <= 1;
}

export function switchToTfaPrompt(
    i18n,
    payload,
    root = document,
    onMethodChanged,
    onMethodActivated,
) {
    const credentialFields = root.querySelector("#login-credential-fields");
    const tfaFields = root.querySelector("#login-tfa-fields");
    const usernameInput = root.querySelector("#login-username");
    const passwordInput = root.querySelector("#login-password");
    const tfaCodeInput = root.querySelector("#login-tfa-code");
    if (
        !(credentialFields instanceof HTMLElement) ||
        !(tfaFields instanceof HTMLElement)
    ) {
        return null;
    }
    credentialFields.hidden = true;
    tfaFields.hidden = false;
    if (usernameInput instanceof HTMLInputElement) {
        usernameInput.required = false;
        usernameInput.disabled = true;
    }
    if (passwordInput instanceof HTMLInputElement) {
        passwordInput.required = false;
        passwordInput.disabled = true;
    }
    if (tfaCodeInput instanceof HTMLInputElement) {
        tfaCodeInput.required = true;
        tfaCodeInput.value = "";
        tfaCodeInput.focus();
    }
    renderTfaMethodTabs(
        i18n,
        payload.methods ?? [],
        onMethodChanged,
        root,
        onMethodActivated,
    );
    return payload.loginAttemptId ?? null;
}

function resolveTranslatedMessage(i18n, key) {
    if (typeof key !== "string" || !key.trim()) {
        return null;
    }
    const translated = i18n.t(key);
    if (translated && translated !== key) {
        return translated;
    }
    return null;
}

function resolveTranslatedTfaErrorMessage(i18n, message) {
    const normalizedMessage = String(message ?? "").trim();
    const messageKeyByCode = {
        session_unavailable: "ui.app.login.error.generic",
        account_archived: "ui.app.login.reason.account_archived",
        account_disabled: "ui.app.login.reason.account_disabled",

        invalid_verification_code: "ui.app.login.tfa.error_invalid",
        invalid_recovery_code: "ui.app.login.tfa.error_invalid",
        code_required: "ui.app.login.tfa.error_invalid",
        recovery_code_required: "ui.app.login.tfa.error_invalid",
        method_not_configured: "ui.app.login.tfa.error_invalid",
        tfa_method_unavailable: "ui.app.login.tfa.error_invalid",
    };
    const mappedMessage = resolveTranslatedMessage(
        i18n,
        messageKeyByCode[normalizedMessage],
    );
    if (mappedMessage) {
        return mappedMessage;
    }
    return (
        resolveTranslatedMessage(i18n, normalizedMessage) ||
        i18n.t("ui.app.login.tfa.error_invalid")
    );
}

export async function createTfaLoginClient({
    baseI18n,
    root = document,
    signal,
    lifecycleVersion,
} = {}) {
    const log = console.error.bind(console);
    if (
        lifecycleVersion !== loginLifecycleVersion ||
        !(signal instanceof AbortSignal)
    ) {
        log("[tfa] login lifecycle required", {
            component: "tfa",
            operation: "createLoginClient",
            code: "tfa_login_lifecycle_required",
        });
        throw new Error("tfa_login_lifecycle_required");
    }
    const assertAccount = captureAccountGuard();
    let promptVersion = 0;
    let stopActivePrompt = () => {};
    let reconcileActivePrompt = null;
    const releasePrompt = () => {
        promptVersion++;
        stopActivePrompt();
        stopActivePrompt = () => {};
        reconcileActivePrompt = null;
    };
    signal.addEventListener("abort", releasePrompt, { once: true });
    let ownsAccount = true;
    const invalidateAccount = () => {
        ownsAccount = false;
        releasePrompt();
    };
    const isAccountCurrent = () => {
        if (!ownsAccount || signal.aborted) return false;
        try {
            assertAccount();
            return true;
        } catch (error) {
            if (error?.message !== "offline_account_changed") throw error;
            invalidateAccount();
            return false;
        }
    };
    if (!isAccountCurrent()) return null;
    await ensurePageStylesheet("/static/gateways/tfa/login.css");
    let i18n = await extendI18n(baseI18n, ["/static/gateways/tfa/languages"]);
    if (!isAccountCurrent()) return null;
    return {
        i18n,
        lifecycle: Object.freeze({ version: loginLifecycleVersion, signal }),
        refreshPrompt() {
            if (!isAccountCurrent() || !reconcileActivePrompt) return false;
            return reconcileActivePrompt();
        },
        async switchToTfaPrompt(payload) {
            if (!isAccountCurrent()) return null;
            releasePrompt();
            const currentPrompt = promptVersion;
            const promptI18n = await extendI18n(i18n, [
                ...new Set(
                    (payload?.methods ?? [])
                        .map((method) => method.stringsBaseUrl)
                        .filter(Boolean),
                ),
            ]);
            if (currentPrompt !== promptVersion || !isAccountCurrent())
                return null;
            i18n = promptI18n;
            const fields = root.querySelector("#login-tfa-fields");
            const methods = Array.isArray(payload?.methods)
                ? payload.methods
                : [];
            const loginAttemptId = String(payload?.loginAttemptId ?? "").trim();
            const challengeStateByMethodId = new Map(
                methods
                    .filter(
                        (method) =>
                            typeof method?.id === "string" && method.challenge,
                    )
                    .map((method) => [method.id, method.challenge]),
            );
            let countdownTimer = null;
            let resendLocked = false;
            let deliveryToastShownOnce = false;
            let invalidResendLinkTypeWarned = false;
            const pendingMethodIds = new Set();
            const outcomesByMethodId = new Map();
            const retainChallenge = (methodId, challenge) => {
                const deadline = parseChallengeResendTimestamp({ challenge });
                challengeStateByMethodId.set(
                    methodId,
                    deadline === null
                        ? challenge
                        : {
                              ...challenge,
                              resendAvailableAt: new Date(
                                  deadline,
                              ).toISOString(),
                          },
                );
            };
            const pendingObservers = new Set();
            let ownedResendLink = null;
            let ownedResendHandler = null;
            const isSelectedMethod = (methodId) => {
                const methodInput = root.querySelector("#login-tfa-method");
                return (
                    currentPrompt === promptVersion &&
                    isAccountCurrent() &&
                    methodInput instanceof HTMLInputElement &&
                    methodInput.value === methodId
                );
            };

            const getResendLink = () => {
                const resendLink = root.querySelector(
                    "#login-tfa-resend-action",
                );
                // Missing and invalid-type resend link states are both treated as unavailable for resilient no-op handling.
                if (resendLink && !(resendLink instanceof HTMLAnchorElement)) {
                    if (!invalidResendLinkTypeWarned) {
                        invalidResendLinkTypeWarned = true;
                        console.warn(
                            "Expected #login-tfa-resend-action to be an anchor element.",
                        );
                    }
                    return null;
                }
                return resendLink;
            };

            const syncDisabledResendState = () => {
                const resendLink = getResendLink();
                if (!resendLink) {
                    return null;
                }
                resendLink.classList.toggle(
                    "auth-text-action--disabled",
                    resendLocked,
                );
                const methodId = root.querySelector("#login-tfa-method")?.value;
                resendLink.setAttribute(
                    "aria-busy",
                    String(pendingMethodIds.has(methodId)),
                );
                resendLink.setAttribute(
                    "aria-disabled",
                    resendLocked ? "true" : "false",
                );
                return resendLink;
            };

            const stopCountdown = () => {
                if (countdownTimer != null) {
                    window.clearInterval(countdownTimer);
                    countdownTimer = null;
                }
            };
            stopActivePrompt = () => {
                stopCountdown();
                for (const removeObserver of pendingObservers) removeObserver();
                pendingObservers.clear();
                if (ownedResendLink?.onclick === ownedResendHandler)
                    ownedResendLink.onclick = null;
            };

            const showDeliveryToastOnce = ({
                skipDeliveryToast = false,
                deliveryStatus,
            } = {}) => {
                if (
                    deliveryToastShownOnce ||
                    skipDeliveryToast ||
                    !["queued", "sent"].includes(deliveryStatus)
                ) {
                    return;
                }
                deliveryToastShownOnce = true;
                showToast(i18n.t(`ui.app.login.tfa.resend_${deliveryStatus}`), {
                    variant: "success",
                });
            };

            const setResendStateForMethod = (
                method,
                { skipDeliveryToast = false } = {},
            ) => {
                if (!isSelectedMethod(method?.id)) return;
                setActiveTfaInputPresentation(
                    i18n,
                    method,
                    root.querySelector("#login-tfa-code"),
                );
                stopCountdown();
                const resendLink = getResendLink();
                if (!resendLink) {
                    return;
                }
                const supportsResend = method?.loginUi?.supportsResend === true;
                const resendAt = parseChallengeResendTimestamp(method);
                resendLink.hidden = !supportsResend;
                if (!supportsResend) {
                    resendLocked = pendingMethodIds.has(method.id);
                    syncDisabledResendState();
                    return;
                }
                const updateCountdown = () => {
                    if (!resendLink.isConnected || !isAccountCurrent()) {
                        stopCountdown();
                        return;
                    }
                    if (pendingMethodIds.has(method.id)) {
                        resendLocked = true;
                        syncDisabledResendState();
                        resendLink.textContent = i18n.t(
                            "ui.app.login.tfa.resend_pending",
                        );
                        return;
                    }
                    const remainingSeconds = resendAt
                        ? Math.max(Math.ceil((resendAt - Date.now()) / 1000), 0)
                        : 0;
                    if (remainingSeconds > 0) {
                        showDeliveryToastOnce({
                            skipDeliveryToast,
                            deliveryStatus: method?.challenge?.deliveryStatus,
                        });
                        resendLocked = true;
                        syncDisabledResendState();
                        resendLink.textContent = i18n
                            .t("ui.app.login.tfa.resend_rate_limited")
                            .replace("{seconds}", String(remainingSeconds));
                        return;
                    }
                    stopCountdown();
                    resendLocked = pendingMethodIds.has(method.id);
                    syncDisabledResendState();
                    resendLink.textContent = i18n.t(
                        "ui.app.login.tfa.resend_action",
                    );
                };
                updateCountdown();
                if (
                    resendAt != null &&
                    resendAt > Date.now() &&
                    !pendingMethodIds.has(method.id)
                ) {
                    countdownTimer = window.setInterval(updateCountdown, 1000);
                }
            };

            const resolveMethod = (methodId) => {
                const method = getMethodById(methods, methodId);
                if (!method) {
                    return null;
                }
                return {
                    ...method,
                    challenge: challengeStateByMethodId.get(method.id) ?? null,
                };
            };

            const showResendFailure = (
                methodId,
                { status, expired = false, errorName } = {},
            ) => {
                if (!isSelectedMethod(methodId)) return;
                log("[tfa] resend result unavailable", {
                    component: "tfa",
                    operation: "resendLoginChallenge",
                    status,
                    errorName,
                });
                showToast(
                    i18n.t(
                        expired
                            ? "ui.app.login.tfa.resend_expired"
                            : "ui.app.login.tfa.resend_unconfirmed",
                    ),
                    { variant: "error" },
                );
            };

            reconcileActivePrompt = () => {
                const methodId = root.querySelector("#login-tfa-method")?.value;
                if (!isSelectedMethod(methodId)) return false;
                setResendStateForMethod(resolveMethod(methodId), {
                    skipDeliveryToast: true,
                });
                const outcome = outcomesByMethodId.get(methodId);
                if (!outcome) return true;
                outcomesByMethodId.delete(methodId);
                if (outcome.failed) {
                    showResendFailure(methodId, outcome);
                } else if (
                    ["queued", "sent"].includes(outcome.deliveryStatus)
                ) {
                    deliveryToastShownOnce = false;
                    showDeliveryToastOnce(outcome);
                } else {
                    showToast(i18n.t("ui.app.login.tfa.resend_received"), {
                        variant: "info",
                    });
                }
                return true;
            };

            const sendChallenge = async (methodId) => {
                if (
                    resendLocked ||
                    pendingMethodIds.has(methodId) ||
                    !isSelectedMethod(methodId)
                ) {
                    return;
                }
                if (!methodId || !loginAttemptId) {
                    console.warn(
                        "Cannot resend TFA challenge without methodId and loginAttemptId.",
                        {
                            methodId,
                            loginAttemptId,
                        },
                    );
                    return;
                }
                i18n.t("ui.app.login.tfa.resend_pending");
                resendLocked = true;
                pendingMethodIds.add(methodId);
                setResendStateForMethod(resolveMethod(methodId), {
                    skipDeliveryToast: true,
                });
                const onStorageChange = (event) => {
                    if (
                        event.storageArea &&
                        event.storageArea !== globalThis.localStorage
                    )
                        return;
                    if (
                        event.key === null ||
                        (["cognis_account", "cognis_access_token"].includes(
                            event.key,
                        ) &&
                            event.oldValue !== event.newValue)
                    ) {
                        invalidateAccount();
                        removeObserver();
                    }
                };
                const removeObserver = () => {
                    window.removeEventListener("storage", onStorageChange);
                    pendingObservers.delete(removeObserver);
                };
                pendingObservers.add(removeObserver);
                window.addEventListener("storage", onStorageChange);
                let result;
                try {
                    result = await this.resendCode({
                        loginAttemptId,
                        methodId,
                    });
                } catch (error) {
                    pendingMethodIds.delete(methodId);
                    if (currentPrompt === promptVersion && isAccountCurrent()) {
                        outcomesByMethodId.set(methodId, {
                            failed: true,
                            errorName: error?.name,
                        });
                        reconcileActivePrompt();
                    }
                    return;
                } finally {
                    removeObserver();
                }
                pendingMethodIds.delete(methodId);
                if (currentPrompt !== promptVersion || !isAccountCurrent())
                    return;
                const { response, body } = result;
                const resolvedMethod = resolveMethod(methodId);
                if (response.ok) {
                    const challenge = body?.data?.challenge;
                    if (
                        !challenge ||
                        typeof challenge !== "object" ||
                        Array.isArray(challenge)
                    ) {
                        outcomesByMethodId.set(methodId, {
                            failed: true,
                            status: response.status,
                            errorName: "InvalidChallengeResponse",
                        });
                    } else {
                        retainChallenge(methodId, challenge);
                        outcomesByMethodId.set(methodId, {
                            deliveryStatus: challenge.deliveryStatus,
                        });
                    }
                } else {
                    if (resolvedMethod) {
                        retainChallenge(methodId, {
                            ...resolvedMethod.challenge,
                            message: body?.error?.code,
                            retryAfterSeconds:
                                body?.error?.retryAfterSeconds ??
                                body?.error?.details?.retryAfterSeconds,
                            resendAvailableAt:
                                body?.error?.resendAvailableAt ??
                                body?.error?.details?.resendAvailableAt,
                        });
                    }
                    outcomesByMethodId.set(methodId, {
                        failed: true,
                        status: response.status,
                        expired: body?.error?.code === "tfa_attempt_expired",
                    });
                }
                reconcileActivePrompt();
            };

            if (
                fields instanceof HTMLElement &&
                fields.childElementCount === 0
            ) {
                const placeholderText = i18n.t(
                    "ui.app.login.tfa.code_placeholder",
                );
                fields.innerHTML = `
                  <div id="login-tfa-method-nav" class="auth-provider-toggle"></div>
                  <input type="hidden" id="login-tfa-method" value="" />
                  <input id="login-tfa-code" autocomplete="one-time-code" inputmode="numeric" placeholder="${placeholderText}" aria-label="${placeholderText}" />
                  <a href="#" id="login-tfa-resend-action" class="auth-text-action auth-text-action--stacked" hidden></a>
                `;
            }
            const resendLink = root.querySelector("#login-tfa-resend-action");
            if (resendLink instanceof HTMLAnchorElement) {
                ownedResendLink = resendLink;
                ownedResendHandler = async (event) => {
                    event.preventDefault();
                    const methodInput = root.querySelector("#login-tfa-method");
                    const selectedMethodId =
                        methodInput instanceof HTMLInputElement
                            ? methodInput.value
                            : "";
                    await sendChallenge(selectedMethodId);
                };
                resendLink.onclick = ownedResendHandler;
            }
            return switchToTfaPrompt(
                i18n,
                payload,
                root,
                (method) => {
                    if (outcomesByMethodId.has(method.id)) {
                        reconcileActivePrompt();
                    } else {
                        setResendStateForMethod(resolveMethod(method.id));
                    }
                },
                async (method) => {
                    if (
                        method.loginUi?.challengeOnSelect === true &&
                        !challengeStateByMethodId.has(method.id)
                    ) {
                        await sendChallenge(method.id);
                    }
                },
            );
        },
        async resendCode(payload) {
            const response = await fetch("/api/v1/tfa/login/resend", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(payload),
            });
            const body = await response.json().catch(() => null);
            return { response, body };
        },
        async verifyCode(payload) {
            const response = await fetch("/api/v1/tfa/login/verify", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(payload),
            });
            const body = await response.json().catch(() => null);
            return { response, body };
        },
        /**
         * Handles a login response where TFA setup is required before full access
         * is granted. Persists the partial session using the provided callback and
         * redirects the user to the Security settings page to complete TFA setup.
         *
         * @param {(data: object) => void} persistSession - Callback that writes
         *   the session data (token, accountId, etc.) to persistent storage.
         * @param {object} data - Login response data containing the partial access
         *   token and account metadata returned when tfaSetupRequired is true.
         */
        handleSetupRequired(persistSession, data) {
            redirectToRequiredTfaSetup(persistSession, data);
        },
        resolveErrorMessage(message) {
            return resolveTranslatedTfaErrorMessage(i18n, message);
        },
    };
}

import { redirectToRequiredTfaSetup } from "/static/reuse/auth-setup-route.js";
import { extendI18n } from "/static/reuse/i18n.js";
import { ensurePageStylesheet } from "/static/reuse/page-styles.js";
import { showToast } from "/static/reuse/toast.js";

function setActiveTfaInputPlaceholder(i18n, activeMethodId, tfaCodeInput) {
    if (!(tfaCodeInput instanceof HTMLInputElement)) {
        return;
    }
    const placeholderKeyByMethod = {
        recovery_code: "ui.app.login.tfa.code_placeholder_recovery",
        smtp: "ui.app.login.tfa.code_placeholder_smtp",
        totp: "ui.app.login.tfa.code_placeholder_totp",
    };
    const placeholderKey =
        placeholderKeyByMethod[activeMethodId] ??
        "ui.app.login.tfa.code_placeholder_totp";
    const placeholderText = i18n.t(placeholderKey);
    tfaCodeInput.placeholder = placeholderText;
    tfaCodeInput.setAttribute("aria-label", placeholderText);
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
        if (Number.isFinite(parsedTime) && parsedTime > Date.now()) {
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
            setActiveTfaInputPlaceholder(i18n, method.id, tfaCodeInput);
            onMethodChanged?.(method);
        });
        if (index === 0) {
            tabLink.classList.add("active");
            methodInput.value = method.id;
            setActiveTfaInputPlaceholder(i18n, method.id, tfaCodeInput);
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
    renderTfaMethodTabs(i18n, payload.methods ?? [], onMethodChanged, root);
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
        invalid_totp_code: "ui.app.login.tfa.error_invalid",
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

export async function createTfaLoginClient({ baseI18n, root = document } = {}) {
    await ensurePageStylesheet("/static/gateways/tfa/login.css");
    const i18n = await extendI18n(baseI18n, [
        "/static/gateways/tfa/languages",
        "/static/adapters/tfa/smtp/languages",
        "/static/adapters/tfa/totp/languages",
    ]);
    return {
        i18n,
        switchToTfaPrompt(payload) {
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

            const stopCountdown = () => {
                if (countdownTimer != null) {
                    window.clearInterval(countdownTimer);
                    countdownTimer = null;
                }
            };

            const setResendStateForMethod = (method) => {
                const resendLink = root.querySelector(
                    "#login-tfa-resend-action",
                );
                if (!(resendLink instanceof HTMLAnchorElement)) {
                    return;
                }
                stopCountdown();
                const isSmtpMethod = method?.id === "smtp";
                const resendAt = parseChallengeResendTimestamp(method);
                resendLink.hidden = !isSmtpMethod;
                if (!isSmtpMethod) {
                    return;
                }
                const updateCountdown = () => {
                    if (!resendLink.isConnected) {
                        stopCountdown();
                        return;
                    }
                    const remainingSeconds = resendAt
                        ? Math.max(Math.ceil((resendAt - Date.now()) / 1000), 0)
                        : 0;
                    if (
                        method?.challenge?.message === "smtp_rate_limited" &&
                        remainingSeconds > 0
                    ) {
                        resendLocked = true;
                        resendLink.textContent = i18n
                            .t("ui.app.login.tfa.smtp.resend_rate_limited")
                            .replace("{seconds}", String(remainingSeconds));
                        return;
                    }
                    stopCountdown();
                    resendLocked = false;
                    resendLink.textContent = i18n.t(
                        "ui.app.login.tfa.smtp.resend_action",
                    );
                };
                updateCountdown();
                if (
                    method?.challenge?.message === "smtp_rate_limited" &&
                    resendAt != null
                ) {
                    countdownTimer = window.setInterval(updateCountdown, 1000);
                }
            };

            if (
                fields instanceof HTMLElement &&
                fields.childElementCount === 0
            ) {
                const placeholderText = i18n.t(
                    "ui.app.login.tfa.code_placeholder_totp",
                );
                fields.innerHTML = `
                  <div id="login-tfa-method-nav" class="auth-provider-toggle"></div>
                  <input type="hidden" id="login-tfa-method" value="" />
                  <input id="login-tfa-code" autocomplete="one-time-code" inputmode="numeric" placeholder="${placeholderText}" aria-label="${placeholderText}" />
                  <a href="#" id="login-tfa-resend-action" class="auth-text-action" hidden></a>
                `;
            }
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
            const resendLink = root.querySelector("#login-tfa-resend-action");
            if (resendLink instanceof HTMLAnchorElement) {
                resendLink.addEventListener("click", async (event) => {
                    event.preventDefault();
                    const methodInput = root.querySelector("#login-tfa-method");
                    const selectedMethodId =
                        methodInput instanceof HTMLInputElement
                            ? methodInput.value
                            : "";
                    if (!selectedMethodId || !loginAttemptId || resendLocked) {
                        return;
                    }
                    resendLocked = true;
                    try {
                        const { response, body } = await this.resendCode({
                            loginAttemptId,
                            methodId: selectedMethodId,
                        });
                        const selectedMethod = resolveMethod(selectedMethodId);
                        if (response.ok) {
                            if (selectedMethod) {
                                challengeStateByMethodId.set(
                                    selectedMethod.id,
                                    body?.data?.challenge ?? {},
                                );
                            }
                            showToast(
                                i18n.t("ui.app.login.tfa.smtp.resend_sent"),
                                { variant: "success" },
                            );
                            setResendStateForMethod(
                                resolveMethod(selectedMethodId),
                            );
                            return;
                        }
                        if (selectedMethod) {
                            challengeStateByMethodId.set(selectedMethod.id, {
                                message: body?.error?.code,
                            });
                            setResendStateForMethod(
                                resolveMethod(selectedMethodId),
                            );
                        } else {
                            resendLocked = false;
                        }
                    } catch (error) {
                        console.error(error);
                        resendLocked = false;
                    }
                });
            }
            return switchToTfaPrompt(i18n, payload, root, (method) => {
                setResendStateForMethod(resolveMethod(method.id));
            });
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

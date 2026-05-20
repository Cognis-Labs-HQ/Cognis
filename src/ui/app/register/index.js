import { createPageComposer } from "../../reuse/page-composer.js";
import {
    DEFAULT_LOCALE,
    createI18n,
    applyDocumentTitle,
    readPreferredLanguages,
    sanitizeLanguagePriority,
    selectSupportedLanguage,
    setPreferredLanguages,
} from "../../reuse/i18n.js";
import { escapeHtml } from "../../reuse/escape-html.js";
import { showToast } from "../../reuse/toast.js";
import { openPopup } from "../../reuse/popup.js";
import { renderInPageCallout } from "../../reuse/in-page-callout.js";
import {
    loadAuthTypingSamples,
    runTypingShowcase,
} from "../../reuse/auth-typing.js";
import {
    renderAuthBrandline,
    renderAuthLayout,
} from "../../reuse/auth-layout.js";
import { clearStoredAuthSession } from "../../reuse/auth-session.js";
import { attachCriteriaCheck } from "../../reuse/criteria-check.js";

async function resetAuthSessionForRegister() {
    const hadStoredSession =
        Boolean(localStorage.getItem("cognis_access_token")) ||
        Boolean(localStorage.getItem("cognis_account"));
    try {
        await fetch("/api/v1/auth/logout", {
            method: "POST",
            credentials: "same-origin",
        });
    } catch {
        // Best-effort cookie revocation; local reset still runs.
    }
    clearStoredAuthSession();
    return hadStoredSession;
}

/**
 * Builds a list of criteria for the criteria-check module from a password policy.
 *
 * @param {{ minLength: number, requireUppercase: boolean, requireLowercase: boolean, requireDigit: boolean, requireSpecial: boolean }} policy
 * @param {object} i18n
 * @returns {Array<{ test: (value: string) => boolean, message: string }>}
 */
function buildPasswordCriteria(policy, i18n) {
    const criteria = [];
    if (policy.minLength > 0) {
        const minLen = policy.minLength;
        criteria.push({
            test: (value) => value.length >= minLen,
            message: i18n
                .t("ui.app.register.error.password_too_short")
                .replace("{min}", String(minLen)),
        });
    }
    if (policy.requireUppercase) {
        criteria.push({
            test: (value) => /[A-Z]/.test(value),
            message: i18n.t(
                "ui.app.register.error.password_requires_uppercase",
            ),
        });
    }
    if (policy.requireLowercase) {
        criteria.push({
            test: (value) => /[a-z]/.test(value),
            message: i18n.t(
                "ui.app.register.error.password_requires_lowercase",
            ),
        });
    }
    if (policy.requireDigit) {
        criteria.push({
            test: (value) => /[0-9]/.test(value),
            message: i18n.t("ui.app.register.error.password_requires_digit"),
        });
    }
    if (policy.requireSpecial) {
        criteria.push({
            test: (value) => /[^A-Za-z0-9]/.test(value),
            message: i18n.t("ui.app.register.error.password_requires_special"),
        });
    }
    return criteria;
}

/**
 * Mounts the registration page into the provided root element.
 *
 * @param {HTMLElement} root - Target app container.
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<void>} Resolves when the page has finished initialising.
 */
export async function mount(root, { signal } = {}) {
    const hadStoredSession = await resetAuthSessionForRegister();

    const i18n = await createI18n();
    applyDocumentTitle(i18n, "ui.page.title.register");
    if (hadStoredSession) {
        showToast(i18n.t("ui.app.register.reason.session_cleared"), {
            variant: "info",
        });
    }

    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get("token");
    const token = String(tokenParam ?? "").trim();
    const hasTokenParam = tokenParam !== null;
    const prefilledEmail = String(params.get("email") ?? "")
        .trim()
        .toLowerCase();
    const knownErrorCodes = new Set([
        "invalid_token",
        "username_taken",
        "username_invalid",
        "username_too_long",
        "username_not_lowercase",
        "username_and_password_required",
        "inviter_not_found",
        "generic",
    ]);

    let inviteData = null;
    let tokenInvalid = false;
    let inviteAdapterDisabled = false;
    let openRegistrationsEnabled = false;
    let invalidTokenToastToken = null;
    let availableLanguages = [];
    let selectedLanguage = DEFAULT_LOCALE;
    let passwordPolicy = {
        minLength: 8,
        requireUppercase: false,
        requireLowercase: false,
        requireDigit: false,
        requireSpecial: false,
    };

    if (token) {
        try {
            const response = await fetch(
                `/api/v1/registration/invite?token=${encodeURIComponent(token)}`,
            );
            if (response.ok) {
                const payload = await response.json();
                inviteData = payload.data ?? null;
            } else {
                const payload = await response.json().catch(() => null);
                const code = String(payload?.error?.code ?? "");
                if (code === "invite_disabled") {
                    inviteAdapterDisabled = true;
                } else {
                    tokenInvalid = true;
                }
            }
        } catch {
            inviteData = null;
            tokenInvalid = true;
        }
    } else if (hasTokenParam) {
        tokenInvalid = true;
    } else {
        try {
            const response = await fetch("/api/v1/auth/registration-config");
            if (response.ok) {
                const payload = await response.json();
                openRegistrationsEnabled =
                    payload?.data?.registrationsEnabled === true;
            }
        } catch {
            openRegistrationsEnabled = false;
        }
    }

    try {
        const policyRes = await fetch("/api/v1/auth/password-policy");
        if (policyRes.ok) {
            const policyPayload = await policyRes.json();
            if (policyPayload?.data) {
                passwordPolicy = policyPayload.data;
            }
        }
    } catch {
        // Use defaults when policy endpoint is unreachable.
    }

    try {
        const langRes = await fetch("/api/v1/system/languages");
        if (langRes.ok) {
            const langPayload = await langRes.json();
            availableLanguages = langPayload.data ?? [];
        }
    } catch {
        availableLanguages = [];
    }

    (function detectInitialLanguage() {
        const supportedLanguageCodes = availableLanguages.map(
            (languageOption) => languageOption.key,
        );
        selectedLanguage = selectSupportedLanguage(
            [i18n.locale, ...readPreferredLanguages()],
            supportedLanguageCodes,
            DEFAULT_LOCALE,
        );
    })();
    const typingSamples = await loadAuthTypingSamples(i18n);

    function formatCountdown(msRemaining) {
        if (msRemaining <= 0) return "00:00:00";
        const totalSeconds = Math.ceil(msRemaining / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return [hours, minutes, seconds]
            .map((n) => String(n).padStart(2, "0"))
            .join(":");
    }

    function renderRegisterShell() {
        const isInviteFlow = Boolean(token);
        const isInvalid =
            isInviteFlow && tokenInvalid && !inviteAdapterDisabled;
        const canRenderForm = isInviteFlow
            ? Boolean(inviteData) && !isInvalid && !inviteAdapterDisabled
            : openRegistrationsEnabled;

        let formHtml = "";
        let messageHtml = "";

        if (isInvalid) {
            messageHtml = renderInPageCallout({
                variant: "danger",
                title: i18n.t("ui.reuse.error"),
            });
        } else if (!canRenderForm) {
            const messageKey = "ui.app.register.closed";
            messageHtml = `<p class="auth-intro">${escapeHtml(i18n.t(messageKey))}</p>`;
        } else {
            const invitedText =
                inviteData && isInviteFlow
                    ? i18n
                          .t("ui.app.register.invited_you")
                          .replace("{inviter}", inviteData.inviterDisplayName)
                    : "";
            const inviteEmail =
                isInviteFlow && inviteData ? inviteData.inviteeEmail : "";
            const lockedEmail = inviteEmail || prefilledEmail;
            const emailValue = lockedEmail || "";
            const emailLocked = Boolean(lockedEmail);
            const emailReadonly = emailLocked ? "disabled" : "";
            const emailLockedClass = emailLocked ? " auth-input--locked" : "";
            const countdownHtml = inviteData?.expiresAt
                ? `<p id="register-countdown" class="auth-intro" style="font-size:1rem;margin-top:4px"></p>`
                : "";
            const langOptionsHtml = availableLanguages
                .map(
                    (lang) =>
                        `<option value="${escapeHtml(lang.key)}"${lang.key === selectedLanguage ? " selected" : ""}>${escapeHtml(lang.name)}</option>`,
                )
                .join("");
            const langSelectHtml =
                availableLanguages.length > 1
                    ? `<label>
            <span>${escapeHtml(i18n.t("ui.reuse.language"))}</span>
            <select name="language" class="theme-select">${langOptionsHtml}</select>
          </label>`
                    : "";
            formHtml = `
      ${invitedText ? `<p class="auth-intro">${escapeHtml(invitedText)}</p>` : ""}
      ${countdownHtml}
      ${!isInviteFlow ? renderInPageCallout({ variant: "info", body: i18n.t("ui.app.register.email_verify_notice") }) : ""}
      <div class="auth-form-shell">
        <form id="register-form" class="stack auth-form">
          <label>
            <span>${escapeHtml(i18n.t("ui.app.register.email"))}</span>
            <input name="email" type="email" value="${escapeHtml(emailValue)}" ${emailReadonly} class="${emailLockedClass.trim()}" required />
          </label>
          <label>
            <span>${escapeHtml(i18n.t("ui.app.register.username"))}</span>
            <input name="username" maxlength="25" required />
          </label>
          <label>
            <span>${escapeHtml(i18n.t("ui.app.register.display_name"))}</span>
            <input name="displayName" />
          </label>
          <label>
            <span>${escapeHtml(i18n.t("ui.app.register.password"))}</span>
            <input name="password" type="password" required />
          </label>
          <label>
            <span>${escapeHtml(i18n.t("ui.app.register.confirm_password"))}</span>
            <input name="confirmPassword" type="password" required />
          </label>
          ${langSelectHtml}
          <button type="submit" class="btn-confirm btn-animated">${escapeHtml(i18n.t("ui.app.register.submit"))}</button>
        </form>
      </div>
    `;
        }

        const brandlineHtml = renderAuthBrandline(
            i18n.t("ui.shared.brand.name"),
            i18n.t("ui.app.login.hero.tagline"),
        );
        const mobileBrandlineHtml = renderAuthBrandline(
            i18n.t("ui.shared.brand.name"),
            i18n.t("ui.app.login.hero.tagline"),
            "auth-brandline--panel-mobile",
        );
        const introPanelHtml = `
      ${brandlineHtml}
      <p class="auth-intro">${escapeHtml(i18n.t("ui.app.login.hero.subtitle"))}</p>
      <div class="cognis-ad-frame" aria-live="polite">
        <span id="typing-text"></span><span class="typing-cursor" aria-hidden="true">_</span>
      </div>
    `;
        const formPanelHtml = `
      ${mobileBrandlineHtml}
      <h2 class="auth-heading">${escapeHtml(i18n.t("ui.app.register.form_title"))}</h2>
      ${messageHtml}
      ${formHtml}
    `;
        return renderAuthLayout({
            introPanelAriaLabel: i18n.t("ui.app.login.intro.aria"),
            introPanelHtml,
            formPanelAriaLabel: i18n.t("ui.app.register.form_title"),
            formPanelHtml,
        });
    }

    async function promptVerificationCodeForRegister(emailAddress) {
        let inputEl = null;
        const action = await openPopup({
            title: i18n.t("ui.app.settings.emails_verify_title"),
            body: () => `
      <p>${escapeHtml(i18n.t("ui.app.register.verify_email_prompt").replace("{email}", emailAddress))}</p>
      <label class="stack">
        <span>${escapeHtml(i18n.t("ui.app.settings.emails_verify_submit"))}</span>
        <input id="reg-verify-code-input" type="text" inputmode="numeric" maxlength="6" />
      </label>
    `,
            actions: [
                {
                    id: "confirm",
                    label: i18n.t("ui.app.settings.emails_verify_submit"),
                    variant: "confirm",
                },
            ],
            onOpen: (overlay) => {
                inputEl = overlay.querySelector("#reg-verify-code-input");
            },
        });
        if (action !== "confirm" || !(inputEl instanceof HTMLInputElement)) {
            return null;
        }
        return inputEl.value.trim();
    }

    async function runEmailVerificationAfterRegister(
        accountId,
        emailAddress,
        verifyToken,
    ) {
        const addResponse = await fetch(
            `/api/v1/users/${encodeURIComponent(accountId)}/emails`,
            {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    authorization: `Bearer ${verifyToken}`,
                },
                body: JSON.stringify({ email: emailAddress }),
            },
        );
        if (!addResponse.ok) {
            const addPayload = await addResponse.json().catch(() => null);
            const addCode = String(addPayload?.error?.code ?? "");
            if (addCode === "smtp_unavailable") {
                return;
            }
            return;
        }
        while (true) {
            const code = await promptVerificationCodeForRegister(emailAddress);
            if (!code) break;
            const verifyResponse = await fetch(
                `/api/v1/users/${encodeURIComponent(accountId)}/emails/${encodeURIComponent(emailAddress)}/verify`,
                {
                    method: "POST",
                    headers: {
                        "content-type": "application/json",
                        authorization: `Bearer ${verifyToken}`,
                    },
                    body: JSON.stringify({ code }),
                },
            );
            if (verifyResponse.ok) break;
            if (verifyResponse.status === 422) {
                showToast(i18n.t("ui.app.settings.emails_verify_invalid"), {
                    variant: "error",
                });
                continue;
            }
            showToast(i18n.t("ui.app.settings.emails_verify_failed"), {
                variant: "error",
            });
        }
    }

    const composer = createPageComposer(root, {
        allowCustomization: false,
        i18n,
        preferenceKey: "register-layout",
        pageContext: {
            title: i18n.t("ui.app.register.form_title"),
            subtitle: i18n.t("ui.app.register.page_subtitle"),
        },
        showTopbar: false,
        showNavbar: false,
        showFooter: false,
        showThemeToggle: true,
        frameless: true,
        persistLayoutPreferences: false,
        toolbar: [],
        elements: [
            {
                id: "register-shell",
                label: i18n.t("ui.app.register.form_title"),
                pinned: true,
                gridSize: {
                    default: [12, 6],
                    min: [8, 5],
                    max: ["full", "fill"],
                },
                render: () => renderRegisterShell(),
                onRender: () => {
                    runTypingShowcase(typingSamples);

                    if (tokenInvalid && invalidTokenToastToken !== token) {
                        invalidTokenToastToken = token;
                        showToast(
                            i18n.t("ui.app.register.error.invalid_token"),
                            {
                                variant: "error",
                                permanent: true,
                            },
                        );
                    }

                    if (inviteData?.expiresAt) {
                        const expiresAtMs = new Date(
                            inviteData.expiresAt,
                        ).getTime();
                        let countdownTimer = null;
                        function updateCountdown() {
                            const countdown = root.querySelector(
                                "#register-countdown",
                            );
                            if (!countdown) {
                                clearInterval(countdownTimer);
                                return;
                            }
                            const remaining = expiresAtMs - Date.now();
                            if (remaining <= 0) {
                                countdown.textContent = i18n.t(
                                    "ui.app.register.token_expired",
                                );
                                clearInterval(countdownTimer);
                                return;
                            }
                            countdown.textContent = i18n
                                .t("ui.app.register.token_expires_in")
                                .replace(
                                    "{countdown}",
                                    formatCountdown(remaining),
                                );
                        }
                        updateCountdown();
                        countdownTimer = setInterval(updateCountdown, 1000);
                    }

                    const form = root.querySelector("#register-form");
                    if (!(form instanceof HTMLFormElement)) return;
                    const languageSelect = form.elements.namedItem("language");
                    if (languageSelect instanceof HTMLSelectElement) {
                        languageSelect.addEventListener(
                            "change",
                            () => {
                                selectedLanguage = languageSelect.value;
                            },
                            signal ? { signal } : undefined,
                        );
                    }

                    const passwordInput = form.elements.namedItem("password");
                    const confirmPasswordInput =
                        form.elements.namedItem("confirmPassword");

                    if (
                        passwordInput instanceof HTMLInputElement &&
                        confirmPasswordInput instanceof HTMLInputElement
                    ) {
                        const passwordCriteria = buildPasswordCriteria(
                            passwordPolicy,
                            i18n,
                        );
                        const criteriaCheckController = attachCriteriaCheck(
                            passwordInput,
                            passwordCriteria,
                            {
                                genericMessage: i18n.t(
                                    "ui.app.register.error.password_policy",
                                ),
                                signal: signal ?? undefined,
                            },
                        );

                        const mismatchController = attachCriteriaCheck(
                            confirmPasswordInput,
                            [
                                {
                                    test: (value) =>
                                        value === passwordInput.value,
                                    message: i18n.t(
                                        "ui.app.register.error.password_mismatch",
                                    ),
                                },
                            ],
                            { signal: signal ?? undefined },
                        );

                        if (signal) {
                            signal.addEventListener(
                                "abort",
                                () => {
                                    criteriaCheckController.detach();
                                    mismatchController.detach();
                                },
                                { once: true },
                            );
                        }
                    }

                    form.addEventListener(
                        "submit",
                        async (event) => {
                            event.preventDefault();
                            const email = String(form.email.value ?? "")
                                .trim()
                                .toLowerCase();
                            const username = String(
                                form.username.value ?? "",
                            ).trim();
                            const displayName = String(
                                form.displayName.value ?? "",
                            ).trim();
                            const password = String(form.password.value ?? "");
                            const confirmPassword = String(
                                form.confirmPassword.value ?? "",
                            );
                            const chosenLanguage =
                                form.language?.value ?? selectedLanguage;
                            if (password !== confirmPassword) {
                                showToast(
                                    i18n.t(
                                        "ui.app.register.error.password_mismatch",
                                    ),
                                    { variant: "error" },
                                );
                                return;
                            }
                            try {
                                if (token) {
                                    const response = await fetch(
                                        "/api/v1/registration/redeem",
                                        {
                                            method: "POST",
                                            headers: {
                                                "content-type":
                                                    "application/json",
                                            },
                                            body: JSON.stringify({
                                                token,
                                                username,
                                                displayName,
                                                password,
                                            }),
                                        },
                                    );
                                    const body = await response.json();
                                    if (!response.ok) {
                                        const errorCode = String(
                                            body?.error?.code ?? "generic",
                                        );
                                        const i18nCode = knownErrorCodes.has(
                                            errorCode,
                                        )
                                            ? errorCode
                                            : "generic";
                                        showToast(
                                            i18n.t(
                                                `ui.app.register.error.${i18nCode}`,
                                            ),
                                            { variant: "error" },
                                        );
                                        return;
                                    }
                                } else {
                                    const response = await fetch(
                                        "/api/v1/auth/register",
                                        {
                                            method: "POST",
                                            headers: {
                                                "content-type":
                                                    "application/json",
                                            },
                                            body: JSON.stringify({
                                                username,
                                                password,
                                                email,
                                                displayName,
                                            }),
                                        },
                                    );
                                    if (!response.ok) {
                                        const body = await response
                                            .json()
                                            .catch((error) => {
                                                console.warn(
                                                    JSON.stringify({
                                                        level: "warn",
                                                        component:
                                                            "register-page",
                                                        message:
                                                            "register_parse_error",
                                                        error:
                                                            error instanceof
                                                            Error
                                                                ? error.message
                                                                : String(error),
                                                    }),
                                                );
                                                return null;
                                            });
                                        const code = String(
                                            body?.error?.code ??
                                                "register_failed",
                                        );
                                        const message =
                                            code === "registrations_disabled"
                                                ? i18n.t(
                                                      "ui.app.register.closed",
                                                  )
                                                : knownErrorCodes.has(code)
                                                  ? i18n.t(
                                                        `ui.app.register.error.${code}`,
                                                    )
                                                  : i18n.t(
                                                        "ui.app.register.error.generic",
                                                    );
                                        showToast(message, {
                                            variant: "error",
                                        });
                                        return;
                                    }
                                    const regPayload = await response
                                        .json()
                                        .catch(() => null);
                                    const verifyToken = String(
                                        regPayload?.data?.verifyToken ?? "",
                                    );
                                    const registeredUsername = String(
                                        regPayload?.data?.username ?? username,
                                    );
                                    if (email && verifyToken) {
                                        await runEmailVerificationAfterRegister(
                                            registeredUsername,
                                            email,
                                            verifyToken,
                                        );
                                    }
                                }
                                setPreferredLanguages(
                                    sanitizeLanguagePriority([
                                        chosenLanguage,
                                        DEFAULT_LOCALE,
                                    ]),
                                    {
                                        mode: "manual",
                                    },
                                );
                                showToast(i18n.t("ui.app.register.success"), {
                                    variant: "success",
                                });
                                window.setTimeout(() => {
                                    window.location.href = "/login";
                                }, 1200);
                            } catch {
                                showToast(
                                    i18n.t("ui.app.register.error.generic"),
                                    {
                                        variant: "error",
                                    },
                                );
                            }
                        },
                        signal ? { signal } : undefined,
                    );
                },
            },
        ],
    });

    await composer.init();
}

if (!globalThis.__spaRouter) await mount(document.querySelector("#app"));

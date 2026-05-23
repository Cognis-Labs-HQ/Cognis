import { createPageComposer } from "/static/reuse/page-composer/init.js";
import {
    DEFAULT_LOCALE,
    createI18n,
    applyDocumentTitle,
    readPreferredLanguages,
    sanitizeLanguagePriority,
    selectSupportedLanguage,
    setPreferredLanguages,
} from "/static/reuse/i18n.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { showToast } from "/static/reuse/toast.js";
import { openPopup } from "/static/reuse/popup.js";
import { renderInPageCallout } from "/static/reuse/in-page-callout.js";
import {
    loadAuthTypingSamples,
    runTypingShowcase,
} from "/static/reuse/auth-typing.js";
import {
    renderAuthBrandline,
    renderAuthLayout,
} from "/static/reuse/auth-layout.js";
import { clearStoredAuthSession } from "/static/reuse/auth-session.js";
import { createFormBuilder } from "/static/reuse/form-builder.js";
import {
    DEFAULT_PASSWORD_POLICY,
    countPatternMatches,
    normalizePasswordPolicy,
} from "/static/gateways/auth/password-policy.js";
import { enforceRequiredTfaSetup } from "/static/reuse/tfa-setup.js";

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
 * Builds structured form-builder criteria for password validation.
 *
 * @param {{ minLength: number, requireUppercase: number, requireLowercase: number, requireDigit: number, requireSpecial: number }} policy
 * @returns {Array<{ id: string, type: 'custom', test: (value: string, fieldValues?: Record<string, string>) => boolean, messageKey: string, messageParams?: Record<string, number>, mode: 'live' }>}
 */
function buildPasswordCriteria(policy) {
    const criteria = [];
    if (policy.minLength > 0) {
        const minLength = policy.minLength;
        criteria.push({
            id: "password-min-length",
            type: "custom",
            test: (value) => value.length >= minLength,
            messageKey: "ui.app.register.error.password_too_short",
            messageParams: { min: minLength },
            mode: "live",
        });
    }
    if (policy.requireUppercase > 0) {
        const minUppercaseCount = policy.requireUppercase;
        criteria.push({
            id: "password-uppercase-count",
            type: "custom",
            test: (value) =>
                countPatternMatches(value, /[A-Z]/g) >= minUppercaseCount,
            messageKey: "ui.app.register.error.password_requires_uppercase",
            messageParams: { count: minUppercaseCount },
            mode: "live",
        });
    }
    if (policy.requireLowercase > 0) {
        const minLowercaseCount = policy.requireLowercase;
        criteria.push({
            id: "password-lowercase-required",
            type: "custom",
            test: (value) =>
                countPatternMatches(value, /[a-z]/g) >= minLowercaseCount,
            messageKey: "ui.app.register.error.password_requires_lowercase",
            messageParams: { count: minLowercaseCount },
            mode: "live",
        });
    }
    if (policy.requireDigit > 0) {
        const minDigitCount = policy.requireDigit;
        criteria.push({
            id: "password-digit-count",
            type: "custom",
            test: (value) =>
                countPatternMatches(value, /[0-9]/g) >= minDigitCount,
            messageKey: "ui.app.register.error.password_requires_digit",
            messageParams: { count: minDigitCount },
            mode: "live",
        });
    }
    if (policy.requireSpecial > 0) {
        const minSpecialCount = policy.requireSpecial;
        criteria.push({
            id: "password-special-count",
            type: "custom",
            test: (value) =>
                countPatternMatches(value, /[^A-Za-z0-9]/g) >= minSpecialCount,
            messageKey: "ui.app.register.error.password_requires_special",
            messageParams: { count: minSpecialCount },
            mode: "live",
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
    let passwordPolicy = { ...DEFAULT_PASSWORD_POLICY };

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
            passwordPolicy = normalizePasswordPolicy(
                policyPayload?.data,
                passwordPolicy,
            );
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

    function createRegisterFormBuilder({ emailValue, emailLocked }) {
        const passwordCriteria = buildPasswordCriteria(passwordPolicy);
        const registerFormFields = [
            {
                name: "email",
                labelKey: "ui.app.register.email",
                type: "email",
                value: emailValue,
                disabled: emailLocked,
                required: true,
                className: emailLocked ? "auth-input--locked" : "",
            },
            {
                name: "username",
                labelKey: "ui.app.register.username",
                type: "text",
                required: true,
                criteria: [
                    {
                        id: "username-printable-ascii",
                        type: "custom",
                        test: (value) =>
                            value.length === 0 ||
                            /^[a-zA-Z0-9_-]+$/.test(value),
                        messageKey: "ui.app.register.error.username_invalid",
                        mode: "live",
                    },
                    {
                        id: "username-lowercase",
                        type: "custom",
                        test: (value) => value === value.toLowerCase(),
                        messageKey:
                            "ui.app.register.error.username_not_lowercase",
                        mode: "live",
                    },
                    {
                        id: "username-max-length",
                        type: "maxLength",
                        value: 25,
                        messageKey: "ui.app.register.error.username_too_long",
                        mode: "live",
                    },
                ],
                criteriaDisplay: "floating-alert",
                floatingTitleKey: "ui.app.register.username_requirements",
            },
            {
                name: "displayName",
                labelKey: "ui.app.register.display_name",
                type: "text",
            },
            {
                name: "password",
                labelKey: "ui.app.register.password",
                type: "password",
                required: true,
                criteria: passwordCriteria,
                criteriaDisplay: "floating-alert",
                floatingTitleKey: "ui.app.register.password_requirements",
            },
            {
                name: "confirmPassword",
                labelKey: "ui.app.register.confirm_password",
                type: "password",
                required: true,
                criteria: [
                    {
                        id: "confirm-password-match",
                        type: "custom",
                        test: (value, values) => {
                            const passwordValue = String(
                                values?.password ?? "",
                            );
                            if (passwordValue.length === 0) {
                                return null;
                            }
                            return value === passwordValue;
                        },
                        messageKey: "ui.app.register.passwords_match",
                        mode: "live",
                    },
                ],
            },
        ];
        if (availableLanguages.length > 1) {
            registerFormFields.push({
                name: "language",
                labelKey: "ui.reuse.language",
                type: "select",
                value: selectedLanguage,
                options: availableLanguages.map((languageOption) => ({
                    value: languageOption.key,
                    label: languageOption.name,
                })),
            });
        }
        return createFormBuilder(
            { i18n, escapeHtml },
            {
                formId: "register-form",
                formClassName: "auth-form",
                submitButtonClassName: "btn-confirm btn-animated",
                submitLabelKey: "ui.app.register.submit",
                fields: registerFormFields,
            },
        );
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
            const countdownHtml = inviteData?.expiresAt
                ? `<p id="register-countdown" class="auth-intro" style="font-size:1rem;margin-top:4px"></p>`
                : "";
            const registerFormBuilder = createRegisterFormBuilder({
                emailValue,
                emailLocked,
            });
            formHtml = `
      ${invitedText ? `<p class="auth-intro">${escapeHtml(invitedText)}</p>` : ""}
      ${countdownHtml}
      ${!isInviteFlow ? renderInPageCallout({ variant: "info", body: i18n.t("ui.app.register.email_verify_notice") }) : ""}
      <div class="auth-form-shell">
        ${registerFormBuilder.render()}
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

    async function loadUserEmailsForRegister(accountId, verifyToken) {
        const response = await fetch(
            `/api/v1/users/${encodeURIComponent(accountId)}/emails`,
            {
                headers: { authorization: `Bearer ${verifyToken}` },
            },
        );
        if (!response.ok) return [];
        const payload = await response.json().catch(() => null);
        return Array.isArray(payload?.data) ? payload.data : [];
    }

    async function promptRequiredEmailAddressForRegister() {
        let inputEl = null;
        const action = await openPopup({
            title: i18n.t("ui.app.settings.emails_add"),
            body: () => `
      <label class="stack">
        <span>${i18n.t("ui.reuse.invite_email")}</span>
        <input id="required-register-email-input" type="email" placeholder="${i18n.t("ui.app.settings.emails_add_placeholder")}" />
      </label>
    `,
            actions: [
                {
                    id: "confirm",
                    label: i18n.t("ui.reuse.confirm"),
                    variant: "confirm",
                },
            ],
            onOpen: (overlay) => {
                inputEl = overlay.querySelector(
                    "#required-register-email-input",
                );
            },
        });
        if (action !== "confirm" || !(inputEl instanceof HTMLInputElement)) {
            return null;
        }
        return inputEl.value.trim().toLowerCase();
    }

    async function enforceRequiredEmailSetupDuringRegister(
        accountId,
        verifyToken,
    ) {
        while (true) {
            const emails = await loadUserEmailsForRegister(
                accountId,
                verifyToken,
            );
            const hasVerifiedPrimary = emails.some(
                (entry) => entry.primary && entry.verified,
            );
            if (hasVerifiedPrimary) return;
            const emailAddress = await promptRequiredEmailAddressForRegister();
            if (!emailAddress) continue;
            await runEmailVerificationAfterRegister(
                accountId,
                emailAddress,
                verifyToken,
            );
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
                    const inviteEmail =
                        token && inviteData ? inviteData.inviteeEmail : "";
                    const lockedEmail = inviteEmail || prefilledEmail;
                    const registerFormBuilder = createRegisterFormBuilder({
                        emailValue: lockedEmail || "",
                        emailLocked: Boolean(lockedEmail),
                    });
                    const formController = registerFormBuilder.attach(form, {
                        signal: signal ?? undefined,
                    });
                    const passwordInput = form.elements.namedItem("password");
                    const confirmPasswordInput =
                        form.elements.namedItem("confirmPassword");
                    if (
                        passwordInput instanceof HTMLInputElement &&
                        confirmPasswordInput instanceof HTMLInputElement
                    ) {
                        const listenerOptions = signal ? { signal } : undefined;
                        const revalidateConfirmPassword = () => {
                            formController.validateField("confirmPassword");
                        };
                        passwordInput.addEventListener(
                            "input",
                            revalidateConfirmPassword,
                            listenerOptions,
                        );
                        passwordInput.addEventListener(
                            "change",
                            revalidateConfirmPassword,
                            listenerOptions,
                        );
                        confirmPasswordInput.addEventListener(
                            "input",
                            revalidateConfirmPassword,
                            listenerOptions,
                        );
                        confirmPasswordInput.addEventListener(
                            "change",
                            revalidateConfirmPassword,
                            listenerOptions,
                        );
                    }
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

                    form.addEventListener(
                        "submit",
                        async (event) => {
                            event.preventDefault();
                            if (!formController.validateAll(true)) {
                                showToast(
                                    i18n.t(
                                        "ui.app.register.error.validation_failed",
                                    ),
                                    { variant: "error" },
                                );
                                return;
                            }
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
                                    if (verifyToken) {
                                        await enforceRequiredTfaSetup({
                                            i18n,
                                            accountId: registeredUsername,
                                            authToken: verifyToken,
                                            openPopup,
                                            showToast,
                                            escapeHtml,
                                            enforceRequiredEmailSetup:
                                                enforceRequiredEmailSetupDuringRegister,
                                        });
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

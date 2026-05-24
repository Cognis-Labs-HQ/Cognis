import { extendI18n } from "/static/reuse/i18n.js";
import { ensurePageStylesheet } from "/static/reuse/page-styles.js";

function setActiveTfaInputPlaceholder(i18n, activeMethodId, tfaCodeInput) {
    if (!(tfaCodeInput instanceof HTMLInputElement)) {
        return;
    }
    const placeholderKeyByMethod = {
        recovery_code: "ui.app.login.tfa.code_placeholder_recovery",
        totp: "ui.app.login.tfa.code_placeholder_totp",
    };
    const placeholderKey =
        placeholderKeyByMethod[activeMethodId] ??
        "ui.app.login.tfa.code_placeholder_totp";
    const placeholderText = i18n.t(placeholderKey);
    tfaCodeInput.placeholder = placeholderText;
    tfaCodeInput.setAttribute("aria-label", placeholderText);
}

export function renderTfaMethodTabs(i18n, methods, root = document) {
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
        });
        if (index === 0) {
            tabLink.classList.add("active");
            methodInput.value = method.id;
            setActiveTfaInputPlaceholder(i18n, method.id, tfaCodeInput);
        }
        tabsEl.appendChild(tabLink);
    });
    tabsEl.hidden = normalizedMethods.length <= 1;
}

export function switchToTfaPrompt(i18n, payload, root = document) {
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
    renderTfaMethodTabs(i18n, payload.methods ?? [], root);
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
        "/static/adapters/tfa/totp/languages",
    ]);
    return {
        i18n,
        switchToTfaPrompt(payload) {
            const fields = root.querySelector("#login-tfa-fields");
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
                `;
            }
            return switchToTfaPrompt(i18n, payload, root);
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
        handleSetupRequired(persistSession, data) {
            persistSession(data);
            window.location.href = "/settings";
        },
        resolveErrorMessage(message) {
            return resolveTranslatedTfaErrorMessage(i18n, message);
        },
    };
}

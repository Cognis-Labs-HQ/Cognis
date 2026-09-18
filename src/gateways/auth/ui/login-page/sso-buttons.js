import { startSsoLogin } from "../login-client.js";
import { reportLoginError } from "./error-reporting.js";

export function isStyledSsoMethod(method) {
    return Boolean(method?.loginButton?.iconUrl && method.loginButton.label);
}

export async function beginSsoLogin(method, i18n) {
    const { showToast } = await import("/static/reuse/toast.js");
    try {
        const redirectUrl = await startSsoLogin(method.id);
        window.location.assign(redirectUrl);
    } catch (error) {
        reportLoginError({
            component: "login-page",
            operation: "start_sso_login",
            providerId: method.id,
            error: error instanceof Error ? error.message : String(error),
        });
        showToast(i18n.t("ui.app.login.error.generic"), {
            variant: "error",
        });
    }
}

export function createSsoLoginButton(method, onSelect) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn-animated btn-neutral sso-login-btn";
    const presentation = method.loginButton;
    button.classList.add("sso-login-btn--branded");
    const icon = document.createElement("img");
    icon.className = "sso-login-btn__icon";
    icon.src = presentation.iconUrl;
    icon.alt = "";
    icon.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.className = "sso-login-btn__label";
    label.textContent = presentation.label;
    const spacer = document.createElement("span");
    spacer.className = "sso-login-btn__spacer";
    spacer.setAttribute("aria-hidden", "true");
    button.append(icon, label, spacer);
    for (const [property, value] of [
        ["--sso-button-background", presentation.backgroundColor],
        ["--sso-button-border", presentation.borderColor],
        ["--sso-button-text", presentation.textColor],
    ]) {
        if (value) button.style.setProperty(property, value);
    }
    button.addEventListener("click", onSelect);
    return button;
}

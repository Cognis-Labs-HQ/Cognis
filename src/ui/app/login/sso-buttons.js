export function createSsoLoginButton(method, fallbackLabel, onSelect) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn-animated btn-neutral sso-login-btn";
    const presentation = method.loginButton;
    if (presentation) {
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
    } else {
        button.textContent = fallbackLabel;
    }
    button.addEventListener("click", onSelect);
    return button;
}

import { bindThemeToggle } from "../../reuse/theme-toggle.js";
import {
    applyDocumentTitle,
    applyStaticTranslations,
    createI18n,
} from "../../reuse/i18n.js";

const i18n = await createI18n();
applyDocumentTitle(i18n, "ui.page.title.login");
applyStaticTranslations(i18n);

const typingSamples = [
    i18n.t("ui.app.login.typing.sample.1"),
    i18n.t("ui.app.login.typing.sample.2"),
    i18n.t("ui.app.login.typing.sample.3"),
    i18n.t("ui.app.login.typing.sample.4"),
    i18n.t("ui.app.login.typing.sample.5"),
    i18n.t("ui.app.login.typing.sample.6"),
];

bindThemeToggle();

const typingTarget = document.querySelector("#typing-text");
const typingCursor = document.querySelector(".typing-cursor");

const startIndex = Math.floor(Math.random() * typingSamples.length);
const orderedSamples = typingSamples.map(
    (_, index) => typingSamples[(startIndex + index) % typingSamples.length],
);

async function runTypingShowcase() {
    if (!typingTarget) return;

    for (
        let sampleIndex = 0;
        sampleIndex < orderedSamples.length;
        sampleIndex += 1
    ) {
        const sample = orderedSamples[sampleIndex];

        for (let charIndex = 0; charIndex <= sample.length; charIndex += 1) {
            typingTarget.textContent = sample.slice(0, charIndex);
            await new Promise((resolve) => window.setTimeout(resolve, 85));
        }

        await new Promise((resolve) => window.setTimeout(resolve, 60_000));

        const isLastSample = sampleIndex === orderedSamples.length - 1;
        if (!isLastSample) {
            for (
                let charIndex = sample.length;
                charIndex >= 0;
                charIndex -= 1
            ) {
                typingTarget.textContent = sample.slice(0, charIndex);
                await new Promise((resolve) => window.setTimeout(resolve, 42));
            }
        }
    }

    if (typingCursor) typingCursor.textContent = "";
}

runTypingShowcase();

async function loadLoginMethods() {
    try {
        const res = await fetch("/api/v1/auth/login-methods");
        if (!res.ok) return;
        const body = await res.json();
        const methods = body.data ?? [];

        const providerInput = document.querySelector("input[name=provider]");
        const toggleContainer = document.querySelector("#auth-provider-toggle");
        const ssoContainer = document.querySelector("#sso-buttons");

        const credentialProviders = methods.filter(
            (m) => m.id === "local" || m.id === "ldap",
        );
        const ssoProviders = methods.filter(
            (m) => m.id !== "local" && m.id !== "ldap",
        );

        if (credentialProviders.length > 1 && toggleContainer) {
            toggleContainer.style.display = "";
            toggleContainer.setAttribute(
                "aria-label",
                i18n.t("ui.app.login.provider.toggle.aria"),
            );
            credentialProviders.forEach((method) => {
                const btn = document.createElement("button");
                btn.type = "button";
                btn.textContent =
                    i18n.t(`ui.app.login.provider.${method.id}`) || method.name;
                btn.className = "auth-provider-btn";
                btn.addEventListener("click", () => {
                    if (providerInput) providerInput.value = method.id;
                    toggleContainer
                        .querySelectorAll(".auth-provider-btn")
                        .forEach((b) => {
                            b.classList.toggle(
                                "auth-provider-btn--active",
                                b === btn,
                            );
                        });
                });
                if (method.id === "local") {
                    btn.classList.add("auth-provider-btn--active");
                }
                toggleContainer.appendChild(btn);
            });
        }

        if (ssoProviders.length > 0 && ssoContainer) {
            ssoProviders.forEach((method) => {
                const btn = document.createElement("button");
                btn.type = "button";
                btn.className = "btn-animated sso-login-btn";
                btn.textContent = i18n
                    .t("ui.app.login.sso.login_with")
                    .replace("{provider}", method.name);
                btn.addEventListener("click", async () => {
                    if (providerInput) providerInput.value = method.id;
                    document.querySelector("#login-form")?.requestSubmit();
                });
                ssoContainer.appendChild(btn);
            });
        }
    } catch {
        // Login methods unavailable — form works with local auth by default
    }
}

loadLoginMethods();

document
    .querySelector("#login-form")
    ?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const form = event.target;
        const payload = {
            username: form.username.value,
            password: form.password.value,
            provider: form.provider?.value ?? "local",
        };
        const response = await fetch("/api/v1/auth/login", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
        });
        const body = await response.json();
        if (response.ok) {
            localStorage.setItem("cognis_token", body.data.token);
            localStorage.setItem("cognis_account", body.data.accountId);
            localStorage.setItem(
                "cognis_display_name",
                body.data.displayName || body.data.accountId,
            );
            localStorage.setItem("cognis_role", body.data.role || "user");
            localStorage.setItem("cognis_login_time", new Date().toISOString());
            window.location.href = "/dashboard";
            return;
        }
        document.querySelector("#msg").textContent = body.error.message;
    });

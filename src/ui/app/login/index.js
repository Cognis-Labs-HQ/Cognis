import { bindThemeToggle } from "../../reuse/theme-toggle.js";
import {
    applyDocumentTitle,
    applyStaticTranslations,
    createI18n,
} from "../../reuse/i18n.js";
import { apiFetch } from "../../reuse/api-client.js";
import { openPopup } from "../../reuse/popup.js";
import { escapeHtml } from "../../reuse/escape-html.js";
import { showToast } from "../../reuse/toast.js";

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

async function loadUserEmails(accountId) {
    const response = await apiFetch(
        `/api/v1/users/${encodeURIComponent(accountId)}/emails`,
    );
    if (!response.ok) return [];
    const payload = await response.json();
    return Array.isArray(payload?.data) ? payload.data : [];
}

async function promptRequiredEmailAddress() {
    let inputEl = null;
    const action = await openPopup({
        title: i18n.t("ui.app.settings.emails_add"),
        body: () => `
      <label class="stack">
        <span>${i18n.t("ui.app.users.invite_email")}</span>
        <input id="required-email-input" type="email" placeholder="${i18n.t("ui.app.settings.emails_add_placeholder")}" />
      </label>
    `,
        actions: [
            {
                id: "confirm",
                label: i18n.t("ui.reuse.generic.confirm"),
                variant: "confirm",
            },
        ],
        onOpen: (overlay) => {
            inputEl = overlay.querySelector("#required-email-input");
        },
    });
    if (action !== "confirm" || !(inputEl instanceof HTMLInputElement)) {
        return null;
    }
    return inputEl.value.trim().toLowerCase();
}

async function promptVerificationCode(emailAddress) {
    let inputEl = null;
    const action = await openPopup({
        title: i18n.t("ui.app.settings.emails_verify_title"),
        body: `
      <p>${escapeHtml(i18n.t("ui.app.settings.emails_verify_prompt").replace("{email}", emailAddress))}</p>
      <label class="stack">
        <span>${i18n.t("ui.app.settings.emails_verify_submit")}</span>
        <input id="required-email-code-input" type="text" inputmode="numeric" maxlength="6" />
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
            inputEl = overlay.querySelector("#required-email-code-input");
        },
    });
    if (action !== "confirm" || !(inputEl instanceof HTMLInputElement)) {
        return null;
    }
    return inputEl.value.trim();
}

async function verifyRequiredEmailLoop(accountId, emailAddress) {
    while (true) {
        const code = await promptVerificationCode(emailAddress);
        if (!code) continue;
        const verifyResponse = await apiFetch(
            `/api/v1/users/${encodeURIComponent(accountId)}/emails/${encodeURIComponent(emailAddress)}/verify`,
            {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ code }),
            },
        );
        if (verifyResponse.ok) return;
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

async function enforceRequiredEmailSetup(accountId) {
    while (true) {
        const emails = await loadUserEmails(accountId);
        const hasVerifiedPrimary = emails.some(
            (entry) => entry.primary && entry.verified,
        );
        if (hasVerifiedPrimary) return;

        const emailAddress = await promptRequiredEmailAddress();
        if (!emailAddress) continue;

        const addResponse = await apiFetch(
            `/api/v1/users/${encodeURIComponent(accountId)}/emails`,
            {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ email: emailAddress }),
            },
        );
        if (!addResponse.ok) {
            let code = "add_failed";
            try {
                const payload = await addResponse.json();
                code = String(payload?.error?.code ?? code);
            } catch {
                code = "add_failed";
            }
            if (code === "email_taken") {
                showToast(i18n.t("ui.app.settings.emails_email_taken"), {
                    variant: "error",
                });
            } else if (code === "rate_limited") {
                showToast(
                    i18n.t("ui.app.settings.emails_verify_rate_limited"),
                    {
                        variant: "error",
                    },
                );
            } else if (code === "smtp_unavailable") {
                showToast(i18n.t("ui.app.settings.emails_verify_unavailable"), {
                    variant: "error",
                });
            } else {
                showToast(i18n.t("ui.app.settings.emails_add_failed"), {
                    variant: "error",
                });
            }
            continue;
        }

        await verifyRequiredEmailLoop(accountId, emailAddress);
    }
}

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
            localStorage.setItem(
                "cognis_is_founder",
                body.data.isFounder ? "true" : "false",
            );
            localStorage.setItem("cognis_login_time", new Date().toISOString());
            await enforceRequiredEmailSetup(body.data.accountId);
            window.location.href = "/dashboard";
            return;
        }
        showToast(body.error.message, { variant: "error" });
    });

import { authorizePendingAccountCreation } from "/static/gateways/auth/login-client.js";
import { createFormBuilder } from "/static/reuse/form-builder.js";

export function renderAccountCreationAuthorization({ i18n, escapeHtml }) {
    const builder = createFormBuilder(
        { i18n, escapeHtml },
        {
            formId: "account-creation-authorization-form",
            submitButtonClassName: "btn-confirm btn-animated",
            submitLabelKey: "adapter.registration.token.continue",
            fields: [
                {
                    name: "email",
                    labelKey: "adapter.registration.token.email",
                    type: "email",
                },
                {
                    name: "registrationToken",
                    labelKey: "adapter.registration.token.token",
                    type: "text",
                    required: true,
                },
            ],
        },
    );
    return `
      <p class="auth-intro">${escapeHtml(i18n.t("adapter.registration.token.sso_intro"))}</p>
      <div class="auth-form-shell">
        ${builder.render()}
      </div>`;
}

export function bindAccountCreationAuthorization({
    root,
    i18n,
    attemptId,
    emailRequired,
    showToast,
    signal,
}) {
    const form = root.querySelector("#account-creation-authorization-form");
    if (!(form instanceof HTMLFormElement)) return;
    const emailInput = form.elements.namedItem("email");
    if (!emailRequired && emailInput instanceof HTMLInputElement) {
        emailInput.closest("label")?.remove();
    }
    if (emailInput instanceof HTMLInputElement)
        emailInput.required = emailRequired;
    form.addEventListener(
        "submit",
        async (event) => {
            event.preventDefault();
            const registrationToken = String(
                form.elements.namedItem("registrationToken")?.value ?? "",
            ).trim();
            const email =
                emailInput instanceof HTMLInputElement
                    ? emailInput.value.trim()
                    : "";
            const { response, payload } = await authorizePendingAccountCreation(
                {
                    accountCreationAttemptId: attemptId,
                    registrationToken,
                    email,
                },
            );
            if (response.ok) {
                window.location.replace("/dashboard");
                return;
            }
            showToast(
                payload?.error?.message ??
                    i18n.t("adapter.registration.token.failed"),
                { variant: "error" },
            );
        },
        signal ? { signal } : undefined,
    );
}

import {
    authorizePendingAccountCreation,
    cancelPendingAccountCreation,
    persistLoginSession,
} from "/static/gateways/auth/login-client.js";
import { createFormBuilder } from "/static/reuse/form-builder.js";

export function renderAccountCreationAuthorization({
    i18n,
    escapeHtml,
    expiresAt,
    emailRequired,
}) {
    const builder = createFormBuilder(
        { i18n, escapeHtml },
        {
            formId: "account-creation-authorization-form",
            submitButtonClassName: "btn-confirm btn-animated",
            submitLabelKey: "adapter.registration.token.continue",
            fields: [
                ...(emailRequired
                    ? [
                          {
                              name: "email",
                              labelKey: "adapter.registration.token.email",
                              type: "email",
                              required: true,
                          },
                      ]
                    : []),
                {
                    name: "registrationToken",
                    labelKey: "adapter.registration.token.token",
                    type: "password",
                    autocomplete: "one-time-code",
                    required: true,
                },
            ],
        },
    );
    return `
      <p>${escapeHtml(i18n.t("adapter.registration.token.sso_intro"))}</p>
      ${expiresAt ? '<p id="account-creation-countdown" class="auth-countdown-pill" aria-live="off"></p>' : ""}
      <div class="auth-form-shell">
        ${builder.render()}
      </div>`;
}

export function bindAccountCreationAuthorization({
    root,
    i18n,
    emailRequired,
    showToast,
    signal,
    expiresAt,
    formatCountdownClock,
}) {
    const form = root.querySelector("#account-creation-authorization-form");
    if (!(form instanceof HTMLFormElement)) return;
    const emailInput = form.elements.namedItem("email");
    if (emailRequired && emailInput instanceof HTMLInputElement)
        emailInput.required = true;
    if (
        Number.isFinite(expiresAt) &&
        typeof formatCountdownClock === "function"
    ) {
        const expiresAtMs = Number(expiresAt);
        let countdownTimer = null;
        let expiryHandled = false;
        async function expireAccountCreation() {
            if (expiryHandled) return;
            expiryHandled = true;
            clearInterval(countdownTimer);
            form.querySelectorAll("input, button").forEach((control) => {
                control.disabled = true;
            });
            await cancelPendingAccountCreation().catch(() => undefined);
            window.location.replace("/login");
        }
        function updateCountdown() {
            const countdown = root.querySelector("#account-creation-countdown");
            if (!countdown) {
                clearInterval(countdownTimer);
                return;
            }
            const remaining = expiresAtMs - Date.now();
            if (remaining <= 0) {
                void expireAccountCreation();
                return;
            }
            countdown.textContent = i18n
                .t("adapter.registration.token.lease_expires_in")
                .replace("{countdown}", formatCountdownClock(remaining));
        }
        updateCountdown();
        countdownTimer = setInterval(updateCountdown, 1000);
        signal?.addEventListener("abort", () => clearInterval(countdownTimer), {
            once: true,
        });
    }
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
                    registrationToken,
                    email,
                },
            );
            if (response.ok) {
                persistLoginSession(payload?.data ?? {});
                showToast(i18n.t("adapter.registration.token.created"), {
                    variant: "success",
                });
                window.setTimeout(() => {
                    window.location.replace("/dashboard");
                }, 800);
                return;
            }
            const errorCode = String(payload?.error?.code ?? "");
            const errorKey =
                errorCode === "registration_token_invalid"
                    ? "adapter.registration.token.invalid"
                    : errorCode === "registration_token_email_mismatch"
                      ? "adapter.registration.token.email_mismatch"
                      : "adapter.registration.token.failed";
            showToast(i18n.t(errorKey), { variant: "error" });
        },
        signal ? { signal } : undefined,
    );
}

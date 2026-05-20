import { apiFetch } from "/static/reuse/api-client.js";
import { showToast } from "/static/reuse/toast.js";
import { openPopup } from "/static/reuse/popup.js";
import { escapeHtml } from "/static/reuse/escape-html.js";

export function createSettingsSection({ i18n, root }) {
    let capability = null;
    const settingsRoot = root ?? document;

    async function loadCapability() {
        const response = await apiFetch(
            "/api/v1/auth/password-reset-capability",
        );
        if (!response.ok) {
            const payload = await response.json().catch(() => null);
            console.warn(
                "[settings:security] password reset capability lookup failed",
                {
                    status: response.status,
                    message: payload?.error?.message,
                },
            );
            capability = {
                adapterName: i18n.t("gateway.auth.security.unknown_provider"),
                supported: false,
                reason:
                    payload?.error?.message ||
                    i18n.t("gateway.auth.security.load_failed"),
            };
            return;
        }
        const payload = await response.json();
        capability = payload.data ?? null;
    }

    function renderBody() {
        if (!capability) {
            return `<p>${i18n.t("gateway.auth.security.loading")}</p>`;
        }
        const providerName = capability.adapterName
            ? escapeHtml(capability.adapterName)
            : i18n.t("gateway.auth.security.unknown_provider");
        const disabled = capability?.supported === true ? "" : " disabled";
        const reason =
            capability?.supported === true
                ? ""
                : `<p>${escapeHtml(
                      capability?.reason ||
                          i18n.t("gateway.auth.security.unsupported_default"),
                  )}</p>`;
        return `
      <div class="settings-auth-password-reset">
        <h3>${i18n.t("gateway.auth.security.reset_title")}</h3>
        <p>${i18n.t("gateway.auth.security.provider_label")} ${providerName}</p>
        ${reason}
        <button class="btn-animated" type="button" id="settings-reset-password-btn"${disabled}>${i18n.t("gateway.auth.security.reset_action")}</button>
      </div>
    `;
    }

    function renderContent() {
        return `<div id="auth-security-reset-panel">${renderBody()}</div>`;
    }

    async function openPasswordResetPopup() {
        let formElement = null;
        const popupResult = await openPopup({
            title: i18n.t("gateway.auth.security.popup_title"),
            maxWidth: "420px",
            body: () => `
        <form class="auth-password-reset-form">
          <label>
            ${i18n.t("gateway.auth.security.new_password")}
            <input type="password" name="nextPassword" autocomplete="new-password" required />
          </label>
          <label>
            ${i18n.t("gateway.auth.security.confirm_password")}
            <input type="password" name="confirmPassword" autocomplete="new-password" required />
          </label>
        </form>
      `,
            actions: [
                {
                    id: "save",
                    label: i18n.t("ui.reuse.save"),
                    variant: "confirm",
                },
                {
                    id: "cancel",
                    label: i18n.t("ui.reuse.cancel"),
                    variant: "cancel",
                },
            ],
            onOpen: (overlay) => {
                formElement = overlay.querySelector(
                    ".auth-password-reset-form",
                );
            },
        });
        if (popupResult !== "save" || !formElement) {
            return;
        }
        const formData = new FormData(formElement);
        const nextPassword = String(formData.get("nextPassword") ?? "").trim();
        const confirmPassword = String(
            formData.get("confirmPassword") ?? "",
        ).trim();
        if (!nextPassword || !confirmPassword) {
            showToast(i18n.t("gateway.auth.security.required"), {
                variant: "warning",
            });
            return;
        }
        if (nextPassword !== confirmPassword) {
            showToast(i18n.t("ui.app.register.error.password_mismatch"), {
                variant: "warning",
            });
            return;
        }
        const response = await apiFetch("/api/v1/auth/reset-password", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                password: nextPassword,
            }),
        });
        if (!response.ok) {
            const payload = await response.json().catch(() => null);
            showToast(
                payload?.error?.message ||
                    i18n.t("gateway.auth.security.reset_failed"),
                {
                    variant: "error",
                },
            );
            return;
        }
        localStorage.removeItem("cognis_access_token");
        showToast(i18n.t("gateway.auth.security.reset_success"), {
            variant: "success",
        });
        setTimeout(() => {
            window.location.href = "/login?reason=session_expired";
        }, 500);
    }

    return {
        id: "security",
        label: i18n.t("gateway.auth.security.section_title"),
        heading: i18n.t("gateway.auth.security.section_title"),
        preferenceKey: "settings-security-layout",
        renderContent,
        async onRender() {
            await loadCapability();
            const panel = settingsRoot.querySelector(
                "#auth-security-reset-panel",
            );
            if (panel) {
                panel.innerHTML = renderBody();
            }
            const button = settingsRoot.querySelector(
                "#settings-reset-password-btn",
            );
            if (!button) {
                return;
            }
            button.onclick = () => {
                openPasswordResetPopup();
            };
        },
        isDirty: () => false,
        save: async () => undefined,
        commit: () => undefined,
        discard: () => undefined,
    };
}

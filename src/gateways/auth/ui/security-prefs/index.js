import { apiFetch } from "/static/reuse/api-client.js";
import { showToast } from "/static/reuse/toast.js";
import { openPopup } from "/static/reuse/popup.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { extendI18n } from "/static/reuse/i18n.js";
import { loadDynamicContributions } from "/static/reuse/dynamic-contribution-loader.js";
import { openPasswordChangePopup } from "/static/gateways/auth/security-prefs/password-change.js";

export function createSettingsSection({ i18n, root, markDirty }) {
    let capability = null;
    const settingsRoot = root ?? document;
    let subsectionInstances = null;
    let sessionTimeout = null;
    let originalSessionTimeoutMinutes = null;

    async function loadCapability() {
        const response = await apiFetch(
            "/api/v1/auth/password-change-capability",
        );
        if (!response.ok) {
            const payload = await response.json().catch(() => null);
            capability = {
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

    async function loadSessionTimeout() {
        const response = await apiFetch("/api/v1/auth/login-session-timeout");
        if (!response.ok) return;
        const payload = await response.json();
        sessionTimeout = payload.data;
        originalSessionTimeoutMinutes = sessionTimeout.timeoutMinutes;
    }

    function renderBody() {
        if (!capability) {
            return `<p class="structured-content__text">${i18n.t("gateway.auth.security.loading")}</p>`;
        }
        const unsupported = capability.supported !== true;
        return `
      <div class="settings-auth-password-reset">
        <button class="btn-animated btn-cancel" type="button" id="settings-reset-password-btn"${unsupported ? " disabled" : ""}>${i18n.t("gateway.auth.security.reset_action")}</button>
        ${unsupported ? `<p class="structured-content__text">${escapeHtml(i18n.t("gateway.auth.security.external_password_notice"))}</p>` : ""}
      </div>
      <div class="security-field-row">
        <label for="settings-login-session-timeout">${escapeHtml(i18n.t("gateway.auth.security.session_timeout_label"))}</label>
        <input id="settings-login-session-timeout" type="number" min="1" step="1" max="${sessionTimeout?.maximumMinutes ?? 1}" value="${sessionTimeout?.timeoutMinutes ?? ""}" />
        <p class="structured-content__text">${escapeHtml(i18n.t("gateway.auth.security.session_timeout_hint").replace("{maximum}", String(sessionTimeout?.maximumMinutes ?? "")))}</p>
      </div>
    `;
    }

    function bindPasswordResetButton() {
        const button = settingsRoot.querySelector(
            "#settings-reset-password-btn",
        );
        if (!(button instanceof HTMLButtonElement)) {
            return;
        }
        button.onclick = () => {
            openPasswordChangePopup({
                i18n,
                apiFetch,
                openPopup,
                showToast,
            });
        };
    }

    function rerender() {
        const panel = settingsRoot.querySelector("#auth-security-reset-panel");
        if (!panel) {
            return;
        }
        panel.innerHTML = renderBody();
        bindPasswordResetButton();
        const timeoutInput = settingsRoot.querySelector(
            "#settings-login-session-timeout",
        );
        timeoutInput?.addEventListener("input", () => markDirty?.());
    }

    async function loadSubsections() {
        if (subsectionInstances !== null) {
            return subsectionInstances;
        }
        try {
            const response = await apiFetch("/api/v1/auth/security-sections");
            if (!response.ok) {
                subsectionInstances = [];
                return subsectionInstances;
            }
            const payload = await response.json();
            const descriptors = payload.data ?? [];
            subsectionInstances = await loadDynamicContributions(descriptors, {
                exportName: "createSettingsSection",
                buildArgs: async (descriptor) => ({
                    i18n: await extendI18n(i18n, descriptor.stringsBaseUrl),
                    root,
                    markDirty,
                }),
                onError: (error, descriptor) => {
                    console.warn(
                        `[security] Failed loading sub-section '${descriptor?.id}' from ${descriptor?.scriptUrl}:`,
                        error,
                    );
                },
            });
        } catch {
            subsectionInstances = [];
        }
        return subsectionInstances;
    }

    async function renderSubsections() {
        const subs = await loadSubsections();
        const container = settingsRoot.querySelector(
            "#auth-security-subsections",
        );
        if (!container) {
            return;
        }
        container.innerHTML = subs
            .map(
                (section) =>
                    `<section class="components-section" data-security-subsection="${escapeHtml(section.id)}">
                        <h3 class="components-section-heading">${escapeHtml(section.heading ?? section.label ?? "")}</h3>
                        <div class="components-section-body">${section.renderContent()}</div>
                    </section>`,
            )
            .join("");
        for (const section of subs) {
            await section.onRender?.();
        }
    }

    return {
        id: "security",
        label: i18n.t("gateway.auth.security.section_title"),
        heading: i18n.t("gateway.auth.security.section_title"),
        preferenceKey: "settings-security-layout",
        renderContent() {
            return `<section class="components-section">
                <h3 class="components-section-heading">${escapeHtml(i18n.t("gateway.auth.security.reset_title"))}</h3>
                <div id="auth-security-reset-panel" class="components-section-body">${renderBody()}</div>
            </section>
            <div id="auth-security-subsections"></div>`;
        },
        async onRender() {
            await Promise.all([loadCapability(), loadSessionTimeout()]);
            rerender();
            await renderSubsections();
        },
        isDirty: () => {
            const input = settingsRoot.querySelector(
                "#settings-login-session-timeout",
            );
            const timeoutDirty =
                input instanceof HTMLInputElement &&
                Number(input.value) !== originalSessionTimeoutMinutes;
            return (
                timeoutDirty ||
                (subsectionInstances ?? []).some((section) =>
                    section.isDirty?.(),
                )
            );
        },
        async save() {
            const input = settingsRoot.querySelector(
                "#settings-login-session-timeout",
            );
            if (
                input instanceof HTMLInputElement &&
                Number(input.value) !== originalSessionTimeoutMinutes
            ) {
                const response = await apiFetch(
                    "/api/v1/auth/login-session-timeout",
                    {
                        method: "PUT",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({
                            timeoutMinutes: Number(input.value),
                        }),
                    },
                );
                if (!response.ok) throw new Error("save_failed");
            }
            for (const section of subsectionInstances ?? []) {
                if (section.isDirty?.()) {
                    await section.save?.();
                }
            }
        },
        commit() {
            const input = settingsRoot.querySelector(
                "#settings-login-session-timeout",
            );
            if (input instanceof HTMLInputElement) {
                originalSessionTimeoutMinutes = Number(input.value);
            }
            for (const section of subsectionInstances ?? []) {
                section.commit?.();
            }
        },
        discard() {
            const input = settingsRoot.querySelector(
                "#settings-login-session-timeout",
            );
            if (input instanceof HTMLInputElement) {
                input.value = String(originalSessionTimeoutMinutes);
            }
            for (const section of subsectionInstances ?? []) {
                section.discard?.();
            }
        },
    };
}

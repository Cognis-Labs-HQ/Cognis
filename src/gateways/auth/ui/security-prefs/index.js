import { apiFetch } from "/static/reuse/api-client.js";
import { showToast } from "/static/reuse/toast.js";
import { openPopup } from "/static/reuse/popup.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { extendI18n } from "/static/reuse/i18n.js";
import { loadDynamicContributions } from "/static/reuse/dynamic-contribution-loader.js";
import {
    joinDurationMinutes,
    splitDurationMinutes,
} from "/static/reuse/duration-input.js";
import { openPasswordChangePopup } from "/static/gateways/auth/security-prefs/password-change.js";

const LOGIN_SESSION_TIMEOUT_DIRTY_KEY = "auth-login-session-timeout";

export function createSettingsSection({ i18n, root, markDirty }) {
    let capability = null;
    const settingsRoot = root ?? document;
    let subsectionInstances = null;
    let sessionTimeout = null;
    let originalSessionTimeoutMinutes = null;
    let usesDefaultSessionTimeout = true;
    let originalUsesDefaultSessionTimeout = true;

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
        usesDefaultSessionTimeout = sessionTimeout.usesDefault === true;
        originalUsesDefaultSessionTimeout = usesDefaultSessionTimeout;
    }

    function getTimeoutMinutes() {
        if (sessionTimeout?.maximumMinutes === 0) {
            return 0;
        }
        const input = settingsRoot.querySelector(
            "#settings-login-session-timeout",
        );
        const unit = settingsRoot.querySelector(
            "#settings-login-session-timeout-unit",
        );
        return input instanceof HTMLInputElement &&
            unit instanceof HTMLSelectElement
            ? joinDurationMinutes(input.value, unit.value)
            : originalSessionTimeoutMinutes;
    }

    function syncLoginSessionTimeoutDirtyState() {
        markDirty?.(
            LOGIN_SESSION_TIMEOUT_DIRTY_KEY,
            usesDefaultSessionTimeout !== originalUsesDefaultSessionTimeout ||
                getTimeoutMinutes() !== originalSessionTimeoutMinutes,
        );
    }

    function syncLoginSessionTimeoutResetButton() {
        const button = settingsRoot.querySelector(
            "#settings-login-session-timeout-reset",
        );
        if (button instanceof HTMLButtonElement) {
            button.disabled = usesDefaultSessionTimeout;
        }
    }

    function setLoginSessionTimeoutValue(minutes) {
        const input = settingsRoot.querySelector(
            "#settings-login-session-timeout",
        );
        const unit = settingsRoot.querySelector(
            "#settings-login-session-timeout-unit",
        );
        if (
            !(input instanceof HTMLInputElement) ||
            !(unit instanceof HTMLSelectElement)
        ) {
            return;
        }
        const duration = splitDurationMinutes(minutes || 1);
        input.value = String(duration.value);
        unit.value = duration.unit;
    }

    function renderBody() {
        if (!capability) {
            return `<p class="structured-content__text">${i18n.t("gateway.auth.security.loading")}</p>`;
        }
        const unsupported = capability.supported !== true;
        const duration = splitDurationMinutes(
            sessionTimeout?.timeoutMinutes || 1,
        );
        const timeoutDisabled = sessionTimeout?.maximumMinutes === 0;
        return `
      <div class="components-section settings-auth-password-reset">
        <button class="btn-animated btn-cancel" type="button" id="settings-reset-password-btn"${unsupported ? " disabled" : ""}>${i18n.t("gateway.auth.security.reset_action")}</button>
        ${unsupported ? `<p class="structured-content__text">${escapeHtml(i18n.t("gateway.auth.security.external_password_notice"))}</p>` : ""}
      </div>
      <div class="components-section">
        <h3 class="components-section-heading">${escapeHtml(i18n.t("gateway.auth.security.session_timeout_label"))}</h3>
        <div class="security-field-row">
          <input id="settings-login-session-timeout" type="number" min="1" step="1" value="${duration.value}"${timeoutDisabled ? " disabled" : ""} />
          <select id="settings-login-session-timeout-unit" class="theme-select"${timeoutDisabled ? " disabled" : ""}>
            ${["minutes", "hours", "days", "weeks"]
                .map(
                    (unit) =>
                        `<option value="${unit}"${duration.unit === unit ? " selected" : ""}>${escapeHtml(i18n.t(`ui.reuse.duration.${unit}`))}</option>`,
                )
                .join("")}
          </select>
          <button id="settings-login-session-timeout-reset" class="btn-neutral" type="button" title="${escapeHtml(i18n.t("gateway.auth.security.session_timeout_reset"))}" aria-label="${escapeHtml(i18n.t("gateway.auth.security.session_timeout_reset"))}"${usesDefaultSessionTimeout ? " disabled" : ""}>
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 5a7 7 0 1 1-6.32 4H8L4.5 5.5 1 9h2.6A9 9 0 1 0 12 3v2Z" /></svg>
          </button>
          ${timeoutDisabled ? `<p class="structured-content__text">${escapeHtml(i18n.t("gateway.auth.security.session_timeout_disabled"))}</p>` : ""}
        </div>
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
        const markCustomTimeout = () => {
            usesDefaultSessionTimeout = false;
            syncLoginSessionTimeoutResetButton();
            syncLoginSessionTimeoutDirtyState();
        };
        timeoutInput?.addEventListener("input", markCustomTimeout);
        settingsRoot
            .querySelector("#settings-login-session-timeout-unit")
            ?.addEventListener("change", markCustomTimeout);
        settingsRoot
            .querySelector("#settings-login-session-timeout-reset")
            ?.addEventListener("click", () => {
                usesDefaultSessionTimeout = true;
                setLoginSessionTimeoutValue(sessionTimeout?.maximumMinutes);
                syncLoginSessionTimeoutResetButton();
                syncLoginSessionTimeoutDirtyState();
            });
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
                (usesDefaultSessionTimeout !==
                    originalUsesDefaultSessionTimeout ||
                    getTimeoutMinutes() !== originalSessionTimeoutMinutes);
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
                (usesDefaultSessionTimeout !==
                    originalUsesDefaultSessionTimeout ||
                    getTimeoutMinutes() !== originalSessionTimeoutMinutes)
            ) {
                const response = await apiFetch(
                    "/api/v1/auth/login-session-timeout",
                    {
                        method: "PUT",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify(
                            usesDefaultSessionTimeout
                                ? { useDefault: true }
                                : { timeoutMinutes: getTimeoutMinutes() },
                        ),
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
                originalSessionTimeoutMinutes = getTimeoutMinutes();
                originalUsesDefaultSessionTimeout = usesDefaultSessionTimeout;
                syncLoginSessionTimeoutDirtyState();
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
                usesDefaultSessionTimeout = originalUsesDefaultSessionTimeout;
                setLoginSessionTimeoutValue(originalSessionTimeoutMinutes);
                syncLoginSessionTimeoutResetButton();
                syncLoginSessionTimeoutDirtyState();
            }
            for (const section of subsectionInstances ?? []) {
                section.discard?.();
            }
        },
    };
}

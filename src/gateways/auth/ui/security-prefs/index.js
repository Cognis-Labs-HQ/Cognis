import { apiFetch } from "/static/reuse/api-client.js";
import { showToast } from "/static/reuse/toast.js";
import { openPopup } from "/static/reuse/popup.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { extendI18n } from "/static/reuse/i18n.js";
import { loadDynamicContributions } from "/static/reuse/dynamic-contribution-loader.js";
import { openPasswordResetPopup } from "/static/gateways/auth/security-prefs/password-reset.js";

export function createSettingsSection({ i18n, root, markDirty }) {
    let capability = null;
    let lastUnsupportedToastKey = null;
    const settingsRoot = root ?? document;
    let subsectionInstances = null;

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

    function renderBody() {
        if (!capability) {
            return `<p>${i18n.t("gateway.auth.security.loading")}</p>`;
        }
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
        ${reason}
        <button class="btn-animated" type="button" id="settings-reset-password-btn"${disabled}>${i18n.t("gateway.auth.security.reset_action")}</button>
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
            openPasswordResetPopup({
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
                    `<div data-security-subsection="${escapeHtml(section.id)}">${section.renderContent()}</div>`,
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
            return `<div id="auth-security-reset-panel">${renderBody()}</div><div id="auth-security-subsections"></div>`;
        },
        async onRender() {
            await loadCapability();
            rerender();
            const unsupportedToastKey =
                capability?.supported === false
                    ? `${capability.adapterId || "unknown"}:${capability.reason || ""}`
                    : null;
            if (
                capability?.supported === false &&
                unsupportedToastKey &&
                unsupportedToastKey !== lastUnsupportedToastKey
            ) {
                lastUnsupportedToastKey = unsupportedToastKey;
                showToast(
                    capability.reason ||
                        i18n.t("gateway.auth.security.unsupported_default"),
                    {
                        variant: "warning",
                    },
                );
            }
            await renderSubsections();
        },
        isDirty: () =>
            (subsectionInstances ?? []).some((section) => section.isDirty?.()),
        async save() {
            for (const section of subsectionInstances ?? []) {
                if (section.isDirty?.()) {
                    await section.save?.();
                }
            }
        },
        commit() {
            for (const section of subsectionInstances ?? []) {
                section.commit?.();
            }
        },
        discard() {
            for (const section of subsectionInstances ?? []) {
                section.discard?.();
            }
        },
    };
}

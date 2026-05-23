import { apiFetch } from "/static/reuse/api-client.js";
import { showToast } from "/static/reuse/toast.js";
import { openPopup } from "/static/reuse/popup.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { attachCriteriaCheck } from "/static/reuse/criteria-check.js";
import {
    DEFAULT_PASSWORD_POLICY,
    countPatternMatches,
    normalizePasswordPolicy,
} from "/static/gateways/auth/password-policy.js";

export function createSettingsSection({ i18n, root }) {
    let capability = null;
    let lastUnsupportedToastKey = null;
    let tfaStatus = null;
    let dragTfaMethodId = null;
    let enforcingTfaSetup = false;
    let tfaDnDBound = false;
    const settingsRoot = root ?? document;

    async function loadCapability() {
        const response = await apiFetch(
            "/api/v1/auth/password-change-capability",
        );
        if (!response.ok) {
            const payload = await response.json().catch(() => null);
            console.warn(
                "[settings:security] password change capability lookup failed",
                {
                    status: response.status,
                    message: payload?.error?.message,
                },
            );
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

    async function loadPasswordPolicy() {
        const response = await apiFetch("/api/v1/auth/password-policy").catch(
            () => null,
        );
        if (!response?.ok) {
            return { ...DEFAULT_PASSWORD_POLICY };
        }

        async function loadTfaStatus() {
            const response = await apiFetch("/api/v1/tfa/methods").catch(() => null);
            if (!response?.ok) {
                return {
                    availableMethods: [],
                    enabledMethods: [],
                    preferredMethodIds: [],
                };
            }
            const payload = await response.json().catch(() => null);
            return (
                payload?.data ?? {
                    availableMethods: [],
                    enabledMethods: [],
                    preferredMethodIds: [],
                }
            );
        }

        async function beginTfaSetup(methodId) {
            const response = await apiFetch(
                `/api/v1/tfa/methods/${encodeURIComponent(methodId)}/setup/begin`,
                {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({}),
                },
            );
            if (!response.ok) return null;
            const payload = await response.json().catch(() => null);
            return payload?.data ?? null;
        }

        async function verifyTfaSetup(methodId, setupId, verification) {
            const response = await apiFetch(
                `/api/v1/tfa/methods/${encodeURIComponent(methodId)}/setup/verify`,
                {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ setupId, verification }),
                },
            );
            if (response.ok) return { ok: true };
            const payload = await response.json().catch(() => null);
            return {
                ok: false,
                message: payload?.error?.message ?? i18n.t("ui.reuse.save_failed"),
            };
        }

        async function cancelTfaSetup(methodId, setupId) {
            await apiFetch(
                `/api/v1/tfa/methods/${encodeURIComponent(methodId)}/setup/cancel`,
                {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ setupId }),
                },
            );
        }

        async function disableTfaMethod(methodId) {
            await apiFetch(
                `/api/v1/tfa/methods/${encodeURIComponent(methodId)}/disable`,
                { method: "POST" },
            );
        }

        async function savePreferredTfaMethods(methodIds) {
            await apiFetch("/api/v1/tfa/methods/preferences", {
                method: "PUT",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ methodIds }),
            });
        }

        async function rotateRecoveryCodes() {
            const response = await apiFetch("/api/v1/tfa/recovery-codes/rotate", {
                method: "POST",
            });
            if (!response.ok) return null;
            const payload = await response.json().catch(() => null);
            return payload?.data?.recoveryCodes ?? null;
        }

        function renderTfaRows(methods) {
            return methods
                .map(
                    (method) => `
                <tr data-tfa-method-row="${escapeHtml(method.id)}" draggable="true">
                  <td>${escapeHtml(method.name)}</td>
                  <td class="drag-handle">⬍</td>
                </tr>`,
                )
                .join("");
        }

        function resolveTfaLists() {
            const available = Array.isArray(tfaStatus?.availableMethods)
                ? tfaStatus.availableMethods
                : [];
            const enabled = Array.isArray(tfaStatus?.enabledMethods)
                ? tfaStatus.enabledMethods
                : [];
            const enabledIds = new Set(enabled.map((method) => method.id));
            return {
                preferred: enabled,
                available: available.filter((method) => !enabledIds.has(method.id)),
            };
        }

        async function runTfaSetupFlow(methodId) {
            const setup = await beginTfaSetup(methodId);
            if (!setup?.setupId) {
                showToast(i18n.t("gateway.auth.security.tfa_setup_failed"), {
                    variant: "error",
                });
                return false;
            }
            let codeInput = null;
            const detailsHtml = Object.entries(setup.view?.details ?? {})
                .map(
                    ([key, value]) => `
                  <p><strong>${escapeHtml(key)}</strong>: ${escapeHtml(String(value))}</p>`,
                )
                .join("");
            const action = await openPopup({
                title: i18n.t("gateway.auth.security.tfa_setup_title"),
                maxWidth: "520px",
                body: () => `
                <div class="stack">
                  <p>${escapeHtml(setup.view?.prompt || "")}</p>
                  ${detailsHtml}
                  <label>
                    ${escapeHtml(i18n.t("ui.app.login.tfa.code_label"))}
                    <input id="settings-tfa-code" type="text" inputmode="numeric" maxlength="12" />
                  </label>
                </div>`,
                actions: [
                    {
                        id: "confirm",
                        label: i18n.t("ui.reuse.confirm"),
                        variant: "confirm",
                    },
                    {
                        id: "cancel",
                        label: i18n.t("ui.reuse.cancel"),
                        variant: "cancel",
                    },
                ],
                onOpen: (overlay) => {
                    codeInput = overlay.querySelector("#settings-tfa-code");
                },
            });
            if (action !== "confirm" || !(codeInput instanceof HTMLInputElement)) {
                await cancelTfaSetup(methodId, setup.setupId);
                return false;
            }
            const result = await verifyTfaSetup(methodId, setup.setupId, {
                code: codeInput.value.trim(),
            });
            if (!result.ok) {
                showToast(result.message, { variant: "error" });
                return false;
            }
            return true;
        }

        function bindTfaDragAndDrop() {
            if (tfaDnDBound) return;
            tfaDnDBound = true;
            settingsRoot.addEventListener("dragstart", (event) => {
                const target = event.target instanceof Element ? event.target : null;
                if (!target) return;
                const row = target.closest("tr[data-tfa-method-row]");
                if (!row) return;
                dragTfaMethodId = row.getAttribute("data-tfa-method-row");
                event.dataTransfer?.setData("text/plain", dragTfaMethodId || "");
            });

            settingsRoot.addEventListener("dragend", () => {
                dragTfaMethodId = null;
            });

            settingsRoot.addEventListener("dragover", (event) => {
                const target = event.target instanceof Element ? event.target : null;
                if (!target) return;
                const zone = target.closest(
                    "#available-tfa-methods, #preferred-tfa-methods, tr[data-tfa-method-row]",
                );
                if (!zone) return;
                event.preventDefault();
            });

            settingsRoot.addEventListener("drop", async (event) => {
                const target = event.target instanceof Element ? event.target : null;
                if (!target) return;
                const targetTable = target.closest(
                    "#available-tfa-methods, #preferred-tfa-methods",
                );
                if (!targetTable) return;
                event.preventDefault();
                const methodId =
                    dragTfaMethodId || event.dataTransfer?.getData("text/plain");
                if (!methodId) return;
                const status = await loadTfaStatus();
                const preferred = [...(status.enabledMethods ?? [])];
                const isInPreferred = preferred.some((entry) => entry.id === methodId);
                if (targetTable.id === "available-tfa-methods" && isInPreferred) {
                    await disableTfaMethod(methodId);
                }
                if (targetTable.id === "preferred-tfa-methods" && !isInPreferred) {
                    const setupCompleted = await runTfaSetupFlow(methodId);
                    if (!setupCompleted) {
                        tfaStatus = await loadTfaStatus();
                        const panel = settingsRoot.querySelector("#auth-security-reset-panel");
                        if (panel) panel.innerHTML = renderBody();
                        bindTfaInteractions();
                        return;
                    }
                }
                tfaStatus = await loadTfaStatus();
                const latestPreferred = [...(tfaStatus.enabledMethods ?? [])];
                await savePreferredTfaMethods(latestPreferred.map((entry) => entry.id));
                tfaStatus = await loadTfaStatus();
                const panel = settingsRoot.querySelector("#auth-security-reset-panel");
                if (panel) panel.innerHTML = renderBody();
                bindTfaInteractions();
            });
        }

        async function enforceTfaSetupFlow() {
            if (enforcingTfaSetup) return;
            const searchParams = new URL(window.location.href).searchParams;
            if (searchParams.get("enforce_tfa") !== "1") return;
            if ((tfaStatus?.enabledMethods?.length ?? 0) > 0) return;
            enforcingTfaSetup = true;
            while ((tfaStatus?.enabledMethods?.length ?? 0) === 0) {
                const available = resolveTfaLists().available;
                if (available.length === 0) {
                    break;
                }
                let methodSelect = null;
                const action = await openPopup({
                    title: i18n.t("gateway.auth.security.tfa_required_title"),
                    body: () => `
                    <label>
                      ${escapeHtml(i18n.t("gateway.auth.security.tfa_required_prompt"))}
                      <select id="settings-required-tfa-method" class="theme-select">
                        ${available
                            .map(
                                (method) =>
                                    `<option value="${escapeHtml(method.id)}">${escapeHtml(method.name)}</option>`,
                            )
                            .join("")}
                      </select>
                    </label>`,
                    actions: [
                        {
                            id: "confirm",
                            label: i18n.t("ui.reuse.confirm"),
                            variant: "confirm",
                        },
                    ],
                    onOpen: (overlay) => {
                        methodSelect = overlay.querySelector("#settings-required-tfa-method");
                    },
                });
                if (action !== "confirm" || !(methodSelect instanceof HTMLSelectElement)) {
                    continue;
                }
                const setupCompleted = await runTfaSetupFlow(methodSelect.value);
                if (!setupCompleted) continue;
                tfaStatus = await loadTfaStatus();
                const panel = settingsRoot.querySelector("#auth-security-reset-panel");
                if (panel) panel.innerHTML = renderBody();
                bindTfaInteractions();
            }
            enforcingTfaSetup = false;
        }
        const payload = await response.json().catch(() => null);
        return normalizePasswordPolicy(payload?.data, DEFAULT_PASSWORD_POLICY);
    }

    function buildPasswordCriteria(policy) {
        const criteria = [];
        if (policy.minLength > 0) {
            const minLen = policy.minLength;
            criteria.push({
                test: (value) => value.length >= minLen,
                message: i18n
                    .t("gateway.auth.security.password_too_short")
                    .replace("{min}", String(minLen)),
            });
        }
        if (policy.requireUppercase > 0) {
            criteria.push({
                test: (value) =>
                    countPatternMatches(value, /[A-Z]/g) >=
                    policy.requireUppercase,
                message: i18n
                    .t("gateway.auth.security.password_requires_uppercase")
                    .replace("{count}", String(policy.requireUppercase)),
            });
        }
        if (policy.requireLowercase > 0) {
            const minLowercaseCount = policy.requireLowercase;
            criteria.push({
                test: (value) =>
                    countPatternMatches(value, /[a-z]/g) >= minLowercaseCount,
                message: i18n
                    .t("gateway.auth.security.password_requires_lowercase")
                    .replace("{count}", String(minLowercaseCount)),
            });
        }
        if (policy.requireDigit > 0) {
            criteria.push({
                test: (value) =>
                    countPatternMatches(value, /[0-9]/g) >= policy.requireDigit,
                message: i18n
                    .t("gateway.auth.security.password_requires_digit")
                    .replace("{count}", String(policy.requireDigit)),
            });
        }
        if (policy.requireSpecial > 0) {
            criteria.push({
                test: (value) =>
                    countPatternMatches(value, /[^A-Za-z0-9]/g) >=
                    policy.requireSpecial,
                message: i18n
                    .t("gateway.auth.security.password_requires_special")
                    .replace("{count}", String(policy.requireSpecial)),
            });
        }
        return criteria;
    }

    function renderBody() {
        const { available, preferred } = resolveTfaLists();
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
      <div class="settings-auth-tfa">
        <h3>${i18n.t("gateway.auth.security.tfa_section_title")}</h3>
        <div class="settings-language-heading-row">
          <h4>${i18n.t("gateway.auth.security.tfa_available_methods")}</h4>
        </div>
        <table id="available-tfa-methods" class="language-table">${renderTfaRows(available)}</table>
        <div class="settings-language-heading-row">
          <h4>${i18n.t("gateway.auth.security.tfa_preferred_methods")}</h4>
          <button class="btn-animated" type="button" id="settings-tfa-recovery-codes-btn">${i18n.t("gateway.auth.security.tfa_recovery_codes_action")}</button>
        </div>
        <table id="preferred-tfa-methods" class="language-table">${renderTfaRows(preferred)}</table>
      </div>
      <div class="settings-auth-password-reset">
        <h3>${i18n.t("gateway.auth.security.reset_title")}</h3>
        ${reason}
        <button class="btn-animated" type="button" id="settings-reset-password-btn"${disabled}>${i18n.t("gateway.auth.security.reset_action")}</button>
      </div>
    `;
    }

    function renderContent() {
        return `<div id="auth-security-reset-panel">${renderBody()}</div>`;
    }

    async function openPasswordResetPopup() {
        const policy = await loadPasswordPolicy();
        const passwordCriteria = buildPasswordCriteria(policy);

        let formElement = null;
        let criteriaCheckController = null;
        let mismatchController = null;

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
                if (formElement) {
                    const nextPasswordInput =
                        formElement.elements.namedItem("nextPassword");
                    const confirmPasswordInput =
                        formElement.elements.namedItem("confirmPassword");
                    if (
                        nextPasswordInput instanceof HTMLInputElement &&
                        confirmPasswordInput instanceof HTMLInputElement &&
                        passwordCriteria.length > 0
                    ) {
                        criteriaCheckController = attachCriteriaCheck(
                            nextPasswordInput,
                            passwordCriteria,
                            {
                                genericMessage: i18n.t(
                                    "gateway.auth.security.password_policy",
                                ),
                            },
                        );
                        mismatchController = attachCriteriaCheck(
                            confirmPasswordInput,
                            [
                                {
                                    test: (value) =>
                                        value === nextPasswordInput.value,
                                    message: i18n.t(
                                        "ui.app.register.error.password_mismatch",
                                    ),
                                },
                            ],
                            {},
                        );
                    }

                    function bindTfaInteractions() {
                        const recoveryCodesButton = settingsRoot.querySelector(
                            "#settings-tfa-recovery-codes-btn",
                        );
                        if (recoveryCodesButton instanceof HTMLButtonElement) {
                            recoveryCodesButton.onclick = async () => {
                                const recoveryCodes = await rotateRecoveryCodes();
                                if (!recoveryCodes) {
                                    showToast(i18n.t("gateway.auth.security.tfa_recovery_codes_failed"), {
                                        variant: "error",
                                    });
                                    return;
                                }
                                await openPopup({
                                    title: i18n.t("gateway.auth.security.tfa_recovery_codes_title"),
                                    body: `<div class="stack">${recoveryCodes
                                        .map((code) => `<p>${escapeHtml(code)}</p>`)
                                        .join("")}</div>`,
                                    actions: [
                                        {
                                            id: "confirm",
                                            label: i18n.t("ui.reuse.confirm"),
                                            variant: "confirm",
                                        },
                                    ],
                                });
                            };
                        }
                    }
                }
            },
        });

        criteriaCheckController?.detach();
        mismatchController?.detach();

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
            [capability, tfaStatus] = await Promise.all([
                (async () => {
                    await loadCapability();
                    return capability;
                })(),
                loadTfaStatus(),
            ]);
            const panel = settingsRoot.querySelector(
                "#auth-security-reset-panel",
            );
            if (panel) {
                panel.innerHTML = renderBody();
            }
            if (capability?.supported === true) {
                lastUnsupportedToastKey = null;
            }
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
            const button = settingsRoot.querySelector(
                "#settings-reset-password-btn",
            );
            if (!button) {
                return;
            }
            button.onclick = () => {
                openPasswordResetPopup();
            };
            bindTfaInteractions();
            bindTfaDragAndDrop();
            enforceTfaSetupFlow();
        },
        isDirty: () => false,
        save: async () => undefined,
        commit: () => undefined,
        discard: () => undefined,
    };
}

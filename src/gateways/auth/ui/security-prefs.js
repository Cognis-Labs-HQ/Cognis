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
    let tfaMethods = [];
    let lastUnsupportedToastKey = null;
    let tfaDndBound = false;
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
        const payload = await response.json().catch(() => null);
        return normalizePasswordPolicy(payload?.data, DEFAULT_PASSWORD_POLICY);
    }

    async function loadTfaSetupStatus() {
        const response = await apiFetch("/api/v1/auth/tfa/setup-status").catch(
            () => null,
        );
        if (!response?.ok) {
            tfaMethods = [];
            return;
        }
        const payload = await response.json().catch(() => null);
        tfaMethods = Array.isArray(payload?.data?.methods)
            ? payload.data.methods
            : [];
    }

    function activeTfaMethodIds() {
        return tfaMethods
            .filter((method) => method.configured === true)
            .map((method) => method.id);
    }

    function availableTfaMethods() {
        return tfaMethods.filter((method) => method.available === true);
    }

    async function saveTfaMethodEnabled(method, enabled) {
        const response = await apiFetch(method.settingsPath, {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ enabled }),
        });
        return response.ok;
    }

    async function requestTfaSetupChallenge(method) {
        if (!method.setupRequestPath) return null;
        const response = await apiFetch(method.setupRequestPath, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({}),
        });
        if (!response.ok) {
            const payload = await response.json().catch(() => null);
            const code = String(payload?.error?.code ?? "setup_failed");
            if (code === "email_tfa_requires_verified_email") {
                showToast(
                    i18n.t("gateway.auth.security.email_tfa_unavailable"),
                    {
                        variant: "error",
                    },
                );
            } else {
                showToast(i18n.t("ui.reuse.tfa_setup_save_failed"), {
                    variant: "error",
                });
            }
            return null;
        }
        const payload = await response.json().catch(() => null);
        return String(payload?.data?.challengeId ?? "");
    }

    async function verifyTfaSetupChallenge(method, challengeId, code) {
        if (!method.setupVerifyPath) return false;
        const response = await apiFetch(method.setupVerifyPath, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ challengeId, code }),
        });
        if (response.ok) return true;
        if (response.status === 422) {
            showToast(i18n.t("ui.app.login.email_tfa.invalid_code"), {
                variant: "error",
            });
            return false;
        }
        showToast(i18n.t("ui.reuse.tfa_setup_save_failed"), {
            variant: "error",
        });
        return false;
    }

    async function promptSetupCode() {
        let inputEl = null;
        const action = await openPopup({
            title: i18n.t("ui.reuse.tfa_setup_title"),
            body: `
        <p>${escapeHtml(i18n.t("ui.reuse.tfa_setup_required"))}</p>
        <label class="stack">
          <span>${escapeHtml(i18n.t("ui.app.login.email_tfa.code_label"))}</span>
          <input id="settings-tfa-setup-code-input" type="text" inputmode="numeric" maxlength="6" />
        </label>
      `,
            actions: [
                {
                    id: "confirm",
                    label: i18n.t("ui.reuse.confirm"),
                    variant: "confirm",
                },
            ],
            onOpen: (overlay) => {
                inputEl = overlay.querySelector(
                    "#settings-tfa-setup-code-input",
                );
            },
        });
        if (action !== "confirm" || !(inputEl instanceof HTMLInputElement)) {
            return null;
        }
        return inputEl.value.trim();
    }

    async function runSetupFlowForMethod(method) {
        if (!method.setupRequestPath || !method.setupVerifyPath) {
            return saveTfaMethodEnabled(method, true);
        }
        const challengeId = await requestTfaSetupChallenge(method);
        if (!challengeId) return false;
        while (true) {
            const code = await promptSetupCode();
            if (!code) return false;
            const verified = await verifyTfaSetupChallenge(
                method,
                challengeId,
                code,
            );
            if (!verified) continue;
            return true;
        }
    }

    function makeTfaRow(method) {
        const row = document.createElement("tr");
        row.setAttribute("draggable", "true");
        row.setAttribute("data-tfa-method", method.id);
        const labelCell = document.createElement("td");
        labelCell.textContent = method.name;
        const handleCell = document.createElement("td");
        handleCell.className = "drag-handle";
        handleCell.textContent = "≡";
        row.append(labelCell, handleCell);
        return row;
    }

    function makeEmptyDropZoneRow() {
        const row = document.createElement("tr");
        const emptyCell = document.createElement("td");
        emptyCell.setAttribute("colspan", "2");
        emptyCell.className = "language-table-empty-cell";
        emptyCell.textContent = "\u00A0";
        row.append(emptyCell);
        return row;
    }

    function renderTfaTables() {
        const availableTable = settingsRoot.querySelector(
            "#settings-tfa-available",
        );
        const activeTable = settingsRoot.querySelector("#settings-tfa-active");
        if (!(availableTable instanceof HTMLTableElement)) return;
        if (!(activeTable instanceof HTMLTableElement)) return;
        const activeIds = new Set(activeTfaMethodIds());
        const availableMethodsList = availableTfaMethods();
        const availableRows = availableMethodsList
            .filter((method) => !activeIds.has(method.id))
            .map((method) => makeTfaRow(method));
        availableTable.replaceChildren(
            ...(availableRows.length > 0
                ? availableRows
                : [makeEmptyDropZoneRow()]),
        );
        const activeRows = availableMethodsList
            .filter((method) => activeIds.has(method.id))
            .map((method) => makeTfaRow(method));
        activeTable.replaceChildren(
            ...(activeRows.length > 0 ? activeRows : [makeEmptyDropZoneRow()]),
        );
        const section = settingsRoot.querySelector(
            ".settings-tfa-table-section",
        );
        if (section instanceof HTMLElement) {
            section.classList.toggle(
                "security-tfa-section--disabled",
                availableMethodsList.length < 1,
            );
        }
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
        const tfaUnavailable = availableTfaMethods().length < 1;
        const tfaHint = tfaUnavailable
            ? i18n.t("gateway.auth.security.email_tfa_unavailable")
            : i18n.t("gateway.auth.security.tfa_methods_hint");
        return `
      <div class="settings-auth-password-reset">
        <h3>${i18n.t("gateway.auth.security.reset_title")}</h3>
        ${reason}
        <button class="btn-animated" type="button" id="settings-reset-password-btn"${disabled}>${i18n.t("gateway.auth.security.reset_action")}</button>
      </div>
      <div class="settings-auth-password-reset">
        <h3>${i18n.t("gateway.auth.security.tfa_methods_title")}</h3>
        <p>${escapeHtml(tfaHint)}</p>
        <div class="content-grid--two-column settings-tfa-table-section">
          <div>
            <div class="settings-language-heading-row">
              <h4>${escapeHtml(i18n.t("gateway.auth.security.tfa_available_methods"))}</h4>
            </div>
            <table id="settings-tfa-available" class="language-table"></table>
          </div>
          <div>
            <div class="settings-language-heading-row">
              <h4>${escapeHtml(i18n.t("gateway.auth.security.tfa_active_methods"))}</h4>
            </div>
            <table id="settings-tfa-active" class="language-table"></table>
          </div>
        </div>
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
            await Promise.all([loadCapability(), loadTfaSetupStatus()]);
            const panel = settingsRoot.querySelector(
                "#auth-security-reset-panel",
            );
            if (panel) {
                panel.innerHTML = renderBody();
                renderTfaTables();
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
            if (tfaDndBound) {
                return;
            }
            tfaDndBound = true;
            let draggedMethodId = null;
            const clearDropMarkers = () => {
                settingsRoot
                    .querySelectorAll(".drop-target-before, .drop-target-after")
                    .forEach((row) => {
                        row.classList.remove(
                            "drop-target-before",
                            "drop-target-after",
                        );
                    });
            };
            const resolveDropTarget = (targetNode, clientY) => {
                const targetTable = targetNode?.closest(
                    "#settings-tfa-available, #settings-tfa-active",
                );
                const targetRow = targetNode?.closest("tr[data-tfa-method]");
                const targetIsAfter = Boolean(
                    targetRow &&
                    clientY >
                        targetRow.getBoundingClientRect().top +
                            targetRow.getBoundingClientRect().height / 2,
                );
                return { targetTable, targetRow, targetIsAfter };
            };
            settingsRoot.addEventListener("dragstart", (event) => {
                const row = event.target.closest("tr[data-tfa-method]");
                if (!row) return;
                draggedMethodId = row.getAttribute("data-tfa-method");
                event.dataTransfer?.setData(
                    "text/plain",
                    draggedMethodId || "",
                );
            });
            settingsRoot.addEventListener("dragend", () => {
                clearDropMarkers();
                draggedMethodId = null;
            });
            settingsRoot.addEventListener("dragover", (event) => {
                const zone = event.target.closest(
                    "#settings-tfa-available, #settings-tfa-active, tr[data-tfa-method]",
                );
                if (!zone) return;
                event.preventDefault();
                clearDropMarkers();
                const row = zone.closest("tr[data-tfa-method]");
                if (row) {
                    const rect = row.getBoundingClientRect();
                    const after = event.clientY > rect.top + rect.height / 2;
                    row.classList.add(
                        after ? "drop-target-after" : "drop-target-before",
                    );
                    return;
                }
                const placeholderRow = zone.querySelector(
                    "tr:not([data-tfa-method])",
                );
                if (placeholderRow) {
                    placeholderRow.classList.add("drop-target-before");
                }
            });
            settingsRoot.addEventListener("drop", async (event) => {
                const { targetTable } = resolveDropTarget(
                    event.target,
                    event.clientY,
                );
                clearDropMarkers();
                const methodId =
                    draggedMethodId ||
                    event.dataTransfer?.getData("text/plain");
                draggedMethodId = null;
                if (!methodId || !targetTable?.id) return;
                const method = tfaMethods.find(
                    (entry) => entry.id === methodId,
                );
                if (!method || method.available !== true) return;
                if (
                    targetTable.id === "settings-tfa-active" &&
                    method.configured !== true
                ) {
                    const setupComplete = await runSetupFlowForMethod(method);
                    if (!setupComplete) {
                        renderTfaTables();
                        return;
                    }
                    showToast(i18n.t("ui.reuse.tfa_setup_saved"), {
                        variant: "success",
                    });
                } else if (
                    targetTable.id === "settings-tfa-available" &&
                    method.configured === true
                ) {
                    const saved = await saveTfaMethodEnabled(method, false);
                    if (!saved) {
                        showToast(i18n.t("ui.reuse.tfa_setup_save_failed"), {
                            variant: "error",
                        });
                        renderTfaTables();
                        return;
                    }
                }
                await loadTfaSetupStatus();
                renderTfaTables();
            });
        },
        isDirty: () => false,
        save: async () => undefined,
        commit: () => undefined,
        discard: () => undefined,
    };
}

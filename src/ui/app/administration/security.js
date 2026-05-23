import { apiFetch } from "../../reuse/api-client.js";
import { escapeHtml } from "../../reuse/escape-html.js";
import { renderInfoTooltip } from "../../reuse/info-tooltip.js";
import {
    DEFAULT_PASSWORD_POLICY,
    normalizePasswordPolicy,
    parsePolicyCount,
} from "/static/gateways/auth/password-policy.js";
import {
    clearTrustedDomainsCache,
    normalizeTrustedDomains,
} from "../../reuse/trusted-domains.js";

const POLICY_FIELDS = [
    {
        key: "minLength",
        id: "security-policy-min-length",
        min: 1,
        i18nSuffix: "policy_min_length",
    },
    {
        key: "requireUppercase",
        id: "security-policy-require-uppercase",
        min: 0,
        i18nSuffix: "policy_require_uppercase",
    },
    {
        key: "requireLowercase",
        id: "security-policy-require-lowercase",
        min: 0,
        i18nSuffix: "policy_require_lowercase",
    },
    {
        key: "requireDigit",
        id: "security-policy-require-digit",
        min: 0,
        i18nSuffix: "policy_require_digit",
    },
    {
        key: "requireSpecial",
        id: "security-policy-require-special",
        min: 0,
        i18nSuffix: "policy_require_special",
    },
];

/**
 * Security sub-module for the Administration page.
 *
 * Manages system-level security settings for trusted domains, registration
 * controls, user-validation mode, teacher approval requirements, and password
 * policy controls.
 *
 * Public exports:
 *   initSecuritySection(root, options) — initialises the security section.
 *
 * Usage:
 *   const security = initSecuritySection(root, { i18n, onDirtyChange });
 *   await security.init();
 *   await security.save();
 *   security.discard();
 *
 * @param {Element} root
 * @param {{ i18n: object, onDirtyChange?: (dirty: boolean) => void }} options
 * @returns {{ init: () => Promise<void>, save: () => Promise<void>, discard: () => void, renderContent: () => string }}
 */
export function initSecuritySection(root, { i18n, onDirtyChange }) {
    let originalDomains = [];
    let currentPublicRegistrationEnabled = false;
    let originalUserValidationMode = "none";
    let currentUserValidationMode = "none";
    let originalTeacherManualApproval = true;
    let originalPasswordPolicy = { ...DEFAULT_PASSWORD_POLICY };
    let tfaMethodCatalog = [];
    let originalActiveTfaMethods = [];
    let currentActiveTfaMethods = [];
    let originalEnforceTfaForNewUsers = false;
    let dragTfaMethodId = null;

    async function loadSettings() {
        const response = await apiFetch("/api/v1/system/security");
        if (!response.ok) return { trustedDomains: [] };
        const payload = await response.json();
        return payload.data ?? { trustedDomains: [] };
    }

    async function loadPasswordPolicy() {
        const response = await apiFetch("/api/v1/auth/password-policy");
        if (!response.ok) {
            return { ...DEFAULT_PASSWORD_POLICY };
        }
        const payload = await response.json();
        return normalizePasswordPolicy(payload?.data, originalPasswordPolicy);
    }

    async function loadPublicRegistrationAdapterState() {
        const response = await apiFetch(
            "/api/v1/gateways/registration/adapters",
        );
        if (!response.ok) return false;
        const payload = await response.json();
        const adapters = Array.isArray(payload?.data) ? payload.data : [];
        const publicAdapter = adapters.find((entry) => entry.id === "public");
        return publicAdapter?.enabled === true;
    }

    async function loadTfaMethods() {
        const response = await apiFetch("/api/v1/auth/tfa/methods");
        if (!response.ok) return [];
        const payload = await response.json();
        return Array.isArray(payload?.data) ? payload.data : [];
    }

    async function persistSettings(
        trustedDomains,
        registrationsEnabled,
        userValidationMode,
        requireTeacherManualApproval,
        activeTfaMethods,
        enforceTfaForNewUsers,
    ) {
        const response = await apiFetch("/api/v1/system/security", {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                trustedDomains,
                registrationsEnabled,
                userValidationMode,
                requireTeacherManualApproval,
                activeTfaMethods,
                enforceTfaForNewUsers,
            }),
        });
        if (!response.ok) throw new Error("save_failed");
    }

    async function persistPasswordPolicy(passwordPolicy) {
        const response = await apiFetch("/api/v1/auth/password-policy", {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(passwordPolicy),
        });
        if (!response.ok) throw new Error("save_failed");
    }

    function parseDomains(raw) {
        return normalizeTrustedDomains(raw.split(","));
    }

    function getInputValue() {
        const input = root.querySelector("#security-trusted-domains");
        return input instanceof HTMLInputElement ? input.value : "";
    }

    function getValidationModeValue() {
        const select = root.querySelector("#security-user-validation-mode");
        if (!(select instanceof HTMLSelectElement)) return "none";
        return select.value === "smtp" ? "smtp" : "none";
    }

    function getRegistrationsEnabledValue() {
        const input = root.querySelector("#security-enable-registrations");
        if (!(input instanceof HTMLInputElement)) return false;
        return input.checked;
    }

    function getTeacherManualApprovalValue() {
        const input = root.querySelector("#security-require-teacher-approval");
        if (!(input instanceof HTMLInputElement)) return true;
        return input.checked;
    }

    function getEnforceTfaForNewUsersValue() {
        const input = root.querySelector("#security-enforce-tfa-for-new-users");
        if (!(input instanceof HTMLInputElement)) return false;
        return input.checked;
    }

    function getPasswordPolicyValue() {
        return Object.fromEntries(
            POLICY_FIELDS.map(({ key, id, min }) => {
                const policyInput = root.querySelector(`#${id}`);
                return [
                    key,
                    policyInput instanceof HTMLInputElement
                        ? parsePolicyCount(
                              policyInput.value,
                              min,
                              originalPasswordPolicy[key],
                          )
                        : originalPasswordPolicy[key],
                ];
            }),
        );
    }

    function isPasswordPolicyChanged() {
        const currentPolicy = getPasswordPolicyValue();
        return POLICY_FIELDS.some(
            ({ key }) => currentPolicy[key] !== originalPasswordPolicy[key],
        );
    }

    function markDirtyState() {
        const currentDomains = parseDomains(getInputValue()).join(",");
        const originalDomainsValue = originalDomains.join(",");
        const modeChanged =
            getValidationModeValue() !== originalUserValidationMode;
        const registrationsChanged =
            getRegistrationsEnabledValue() !== currentPublicRegistrationEnabled;
        const teacherApprovalChanged =
            getTeacherManualApprovalValue() !== originalTeacherManualApproval;
        const tfaMethodsChanged =
            JSON.stringify(currentActiveTfaMethods) !==
            JSON.stringify(originalActiveTfaMethods);
        const tfaEnforcementChanged =
            getEnforceTfaForNewUsersValue() !== originalEnforceTfaForNewUsers;

        onDirtyChange?.(
            currentDomains !== originalDomainsValue ||
                modeChanged ||
                registrationsChanged ||
                teacherApprovalChanged ||
                tfaMethodsChanged ||
                tfaEnforcementChanged ||
                isPasswordPolicyChanged(),
        );
    }

    function createTfaRow(methodId, labelText) {
        const row = document.createElement("tr");
        row.setAttribute("draggable", "true");
        row.setAttribute("data-tfa-row", methodId);
        const labelCell = document.createElement("td");
        labelCell.textContent = labelText;
        const handleCell = document.createElement("td");
        handleCell.className = "drag-handle";
        handleCell.textContent = "≡";
        handleCell.setAttribute(
            "aria-label",
            i18n.t("ui.app.admin.security.tfa_drag_handle_label"),
        );
        row.append(labelCell, handleCell);
        return row;
    }

    function createEmptyTfaRow() {
        const row = document.createElement("tr");
        const emptyCell = document.createElement("td");
        emptyCell.setAttribute("colspan", "2");
        emptyCell.className = "language-table-empty-cell";
        emptyCell.textContent = "\u00A0";
        row.append(emptyCell);
        return row;
    }

    function renderTfaTables() {
        const availableTable = root.querySelector("#security-tfa-available");
        const activeTable = root.querySelector("#security-tfa-active");
        const enforceToggle = root.querySelector(
            "#security-enforce-tfa-for-new-users",
        );
        const tfaSection = root.querySelector(".security-tfa-section");
        const hasTables =
            availableTable instanceof HTMLTableElement &&
            activeTable instanceof HTMLTableElement;
        const activeMethodSet = new Set(currentActiveTfaMethods);
        if (hasTables) {
            const activeRows = currentActiveTfaMethods
                .map((methodId) =>
                    tfaMethodCatalog.find((method) => method.id === methodId),
                )
                .filter(Boolean)
                .map((method) => createTfaRow(method.id, method.name));
            activeTable.replaceChildren(
                ...(activeRows.length > 0 ? activeRows : [createEmptyTfaRow()]),
            );
            const availableRows = tfaMethodCatalog
                .filter((method) => !activeMethodSet.has(method.id))
                .map((method) => createTfaRow(method.id, method.name));
            availableTable.replaceChildren(
                ...(availableRows.length > 0
                    ? availableRows
                    : [createEmptyTfaRow()]),
            );
        }
        const hasAvailableMethods = tfaMethodCatalog.some(
            (method) => method.available === true,
        );
        if (tfaSection instanceof HTMLElement) {
            tfaSection.classList.toggle(
                "security-tfa-section--disabled",
                !hasAvailableMethods,
            );
        }
        if (enforceToggle instanceof HTMLInputElement) {
            enforceToggle.disabled = !hasAvailableMethods;
            if (!hasAvailableMethods) {
                enforceToggle.checked = false;
            }
        }
        if (!hasAvailableMethods) {
            currentActiveTfaMethods = [];
        }
    }

    function clearTfaDropMarkers() {
        root.querySelectorAll(
            ".drop-target-before, .drop-target-after",
        ).forEach((row) => {
            row.classList.remove("drop-target-before", "drop-target-after");
        });
    }

    /**
     * Resolves drop metadata for the current pointer position.
     *
     * @param {EventTarget | null} targetNode
     * @param {number} clientY
     * @returns {{ targetTable: Element | null, targetRow: Element | null, targetIsAfter: boolean }}
     */
    function resolveTfaDropTarget(targetNode, clientY) {
        const targetTable = targetNode?.closest(
            "#security-tfa-available, #security-tfa-active",
        );
        const targetRow = targetNode?.closest("tr[data-tfa-row]");
        const targetIsAfter = Boolean(
            targetRow &&
            clientY >
                targetRow.getBoundingClientRect().top +
                    targetRow.getBoundingClientRect().height / 2,
        );
        return { targetTable, targetRow, targetIsAfter };
    }

    function applyTfaDrop(methodId, targetTable, targetRow, targetIsAfter) {
        if (!methodId) return;
        if (targetTable?.id === "security-tfa-active") {
            currentActiveTfaMethods = currentActiveTfaMethods.filter(
                (entry) => entry !== methodId,
            );
            if (targetRow) {
                const targetId = targetRow.getAttribute("data-tfa-row");
                const targetIndex = currentActiveTfaMethods.indexOf(targetId);
                if (targetIndex >= 0) {
                    currentActiveTfaMethods.splice(
                        targetIsAfter ? targetIndex + 1 : targetIndex,
                        0,
                        methodId,
                    );
                } else {
                    currentActiveTfaMethods.push(methodId);
                }
            } else {
                currentActiveTfaMethods.push(methodId);
            }
        }
        if (targetTable?.id === "security-tfa-available") {
            currentActiveTfaMethods = currentActiveTfaMethods.filter(
                (entry) => entry !== methodId,
            );
        }
        renderTfaTables();
        markDirtyState();
    }

    function bindTfaTableInteractions() {
        root.addEventListener("dragstart", (event) => {
            const row = event.target.closest("tr[data-tfa-row]");
            if (!row) return;
            dragTfaMethodId = row.getAttribute("data-tfa-row");
            event.dataTransfer?.setData("text/plain", dragTfaMethodId || "");
        });
        root.addEventListener("dragend", () => {
            clearTfaDropMarkers();
            dragTfaMethodId = null;
        });
        root.addEventListener("dragover", (event) => {
            const zone = event.target.closest(
                "#security-tfa-available, #security-tfa-active, tr[data-tfa-row]",
            );
            if (!zone) return;
            event.preventDefault();
            clearTfaDropMarkers();
            const row = zone.closest("tr[data-tfa-row]");
            if (row) {
                const rect = row.getBoundingClientRect();
                const after = event.clientY > rect.top + rect.height / 2;
                row.classList.add(
                    after ? "drop-target-after" : "drop-target-before",
                );
            } else {
                const placeholderRow = zone.querySelector(
                    "tr:not([data-tfa-row])",
                );
                if (placeholderRow) {
                    placeholderRow.classList.add("drop-target-before");
                }
            }
        });
        root.addEventListener("drop", (event) => {
            const { targetTable, targetRow, targetIsAfter } =
                resolveTfaDropTarget(event.target, event.clientY);
            clearTfaDropMarkers();
            const methodId =
                dragTfaMethodId || event.dataTransfer?.getData("text/plain");
            applyTfaDrop(methodId, targetTable, targetRow, targetIsAfter);
            dragTfaMethodId = null;
        });
    }

    function bindSecurityInputs(settings, passwordPolicy) {
        const input = root.querySelector("#security-trusted-domains");
        if (!(input instanceof HTMLInputElement)) return;

        originalDomains = settings.trustedDomains ?? [];
        currentPublicRegistrationEnabled =
            settings.registrationsEnabled === true;
        currentUserValidationMode =
            settings.userValidationMode === "smtp" ? "smtp" : "none";
        originalUserValidationMode = currentUserValidationMode;
        originalTeacherManualApproval =
            settings.requireTeacherManualApproval !== false;
        originalActiveTfaMethods = Array.isArray(settings.activeTfaMethods)
            ? settings.activeTfaMethods.filter((entry) =>
                  tfaMethodCatalog.some((method) => method.id === entry),
              )
            : [];
        currentActiveTfaMethods = [...originalActiveTfaMethods];
        originalEnforceTfaForNewUsers =
            settings.enforceTfaForNewUsers === true &&
            tfaMethodCatalog.some((method) => method.available === true);
        originalPasswordPolicy = normalizePasswordPolicy(
            passwordPolicy,
            originalPasswordPolicy,
        );

        input.value = originalDomains.join(", ");
        const validationSelect = root.querySelector(
            "#security-user-validation-mode",
        );
        const registrationsToggle = root.querySelector(
            "#security-enable-registrations",
        );
        const teacherApprovalToggle = root.querySelector(
            "#security-require-teacher-approval",
        );
        if (validationSelect instanceof HTMLSelectElement) {
            validationSelect.value = currentUserValidationMode;
        }
        if (registrationsToggle instanceof HTMLInputElement) {
            registrationsToggle.checked = currentPublicRegistrationEnabled;
        }
        if (teacherApprovalToggle instanceof HTMLInputElement) {
            teacherApprovalToggle.checked = originalTeacherManualApproval;
        }
        const tfaEnforcementToggle = root.querySelector(
            "#security-enforce-tfa-for-new-users",
        );
        if (tfaEnforcementToggle instanceof HTMLInputElement) {
            tfaEnforcementToggle.checked = originalEnforceTfaForNewUsers;
            tfaEnforcementToggle.addEventListener("change", markDirtyState);
        }
        renderTfaTables();
        for (const { key, id } of POLICY_FIELDS) {
            const policyInput = root.querySelector(`#${id}`);
            if (policyInput instanceof HTMLInputElement) {
                policyInput.value = String(originalPasswordPolicy[key]);
                policyInput.addEventListener("input", markDirtyState);
            }
        }

        input.addEventListener("input", markDirtyState);
        validationSelect?.addEventListener("change", markDirtyState);
        registrationsToggle?.addEventListener("change", markDirtyState);
        teacherApprovalToggle?.addEventListener("change", markDirtyState);
    }

    return {
        async init() {
            const [
                settings,
                publicRegistrationEnabled,
                passwordPolicy,
                loadedTfaMethods,
            ] = await Promise.all([
                loadSettings(),
                loadPublicRegistrationAdapterState(),
                loadPasswordPolicy(),
                loadTfaMethods(),
            ]);
            tfaMethodCatalog = loadedTfaMethods.filter(
                (method) => method.available === true,
            );
            settings.registrationsEnabled = publicRegistrationEnabled;
            bindSecurityInputs(settings, passwordPolicy);
        },

        async save() {
            const domains = parseDomains(getInputValue());
            const validationMode = getValidationModeValue();
            const registrationsEnabled = getRegistrationsEnabledValue();
            const requireTeacherManualApproval =
                getTeacherManualApprovalValue();
            const enforceTfaForNewUsers = getEnforceTfaForNewUsersValue();
            const passwordPolicy = getPasswordPolicyValue();

            await persistSettings(
                domains,
                registrationsEnabled,
                validationMode,
                requireTeacherManualApproval,
                currentActiveTfaMethods,
                enforceTfaForNewUsers,
            );
            await persistPasswordPolicy(passwordPolicy);
            clearTrustedDomainsCache();
            if (registrationsEnabled !== currentPublicRegistrationEnabled) {
                await apiFetch(
                    `/api/v1/gateways/registration/adapters/public/${registrationsEnabled ? "enable" : "disable"}`,
                    { method: "POST" },
                );
            }
            originalDomains = domains;
            currentPublicRegistrationEnabled = registrationsEnabled;
            currentUserValidationMode = validationMode;
            originalUserValidationMode = validationMode;
            originalTeacherManualApproval = requireTeacherManualApproval;
            originalActiveTfaMethods = [...currentActiveTfaMethods];
            originalEnforceTfaForNewUsers = enforceTfaForNewUsers;
            originalPasswordPolicy = passwordPolicy;
        },

        discard() {
            const input = root.querySelector("#security-trusted-domains");
            if (input instanceof HTMLInputElement) {
                input.value = originalDomains.join(", ");
            }
            const validationSelect = root.querySelector(
                "#security-user-validation-mode",
            );
            if (validationSelect instanceof HTMLSelectElement) {
                validationSelect.value = originalUserValidationMode;
            }
            const registrationsToggle = root.querySelector(
                "#security-enable-registrations",
            );
            const teacherApprovalToggle = root.querySelector(
                "#security-require-teacher-approval",
            );

            if (registrationsToggle instanceof HTMLInputElement) {
                registrationsToggle.checked = currentPublicRegistrationEnabled;
            }
            if (teacherApprovalToggle instanceof HTMLInputElement) {
                teacherApprovalToggle.checked = originalTeacherManualApproval;
            }
            const tfaEnforcementToggle = root.querySelector(
                "#security-enforce-tfa-for-new-users",
            );
            currentActiveTfaMethods = [...originalActiveTfaMethods];
            if (tfaEnforcementToggle instanceof HTMLInputElement) {
                tfaEnforcementToggle.checked = originalEnforceTfaForNewUsers;
            }
            renderTfaTables();
            for (const { key, id } of POLICY_FIELDS) {
                const policyInput = root.querySelector(`#${id}`);
                if (policyInput instanceof HTMLInputElement) {
                    policyInput.value = String(originalPasswordPolicy[key]);
                }
            }
            onDirtyChange?.(false);
        },

        renderContent() {
            const tooltipAria = i18n.t("ui.reuse.more_information");
            return `
        <div class="security-settings-form">
          <div class="components-section">
            <h3 class="components-section-heading">
              ${escapeHtml(i18n.t("ui.app.admin.security.trusted_domains_label"))}
              ${renderInfoTooltip(i18n.t("ui.app.admin.security.trusted_domains_hint"), tooltipAria)}
            </h3>
            <div class="security-field-row">
              <input
                id="security-trusted-domains"
                type="text"
                class="security-domains-input"
                placeholder="${escapeHtml(i18n.t("ui.app.admin.security.trusted_domains_placeholder"))}"
              />
            </div>
          </div>
          <div class="components-section">
            <h3 class="components-section-heading">
              ${escapeHtml(i18n.t("ui.app.admin.security.enable_registrations_label"))}
              ${renderInfoTooltip(i18n.t("ui.app.admin.security.enable_registrations_hint"), tooltipAria)}
            </h3>
            <div class="security-field-row">
              <label class="switch">
                <input id="security-enable-registrations" type="checkbox" />
                <span class="slider"></span>
              </label>
            </div>
          </div>
          <div class="components-section">
            <h3 class="components-section-heading">
              ${escapeHtml(i18n.t("ui.app.admin.security.user_validation_mode_label"))}
              ${renderInfoTooltip(i18n.t("ui.app.admin.security.user_validation_mode_hint"), tooltipAria)}
            </h3>
            <div class="security-field-row">
              <select id="security-user-validation-mode" class="theme-select">
                <option value="none">${escapeHtml(i18n.t("ui.app.admin.security.user_validation_mode.none"))}</option>
                <option value="smtp">${escapeHtml(i18n.t("ui.app.admin.security.user_validation_mode.smtp"))}</option>
              </select>
            </div>
          </div>
          <div class="components-section">
            <h3 class="components-section-heading">
              ${escapeHtml(i18n.t("ui.app.admin.security.require_teacher_approval_label"))}
              ${renderInfoTooltip(i18n.t("ui.app.admin.security.require_teacher_approval_hint"), tooltipAria)}
            </h3>
            <div class="security-field-row">
              <label class="switch">
                <input id="security-require-teacher-approval" type="checkbox" />
                <span class="slider"></span>
              </label>
            </div>
          </div>
          <div class="components-section">
            <h3 class="components-section-heading">
              ${escapeHtml(i18n.t("ui.app.admin.security.tfa_methods_heading"))}
              ${renderInfoTooltip(i18n.t("ui.app.admin.security.tfa_methods_hint"), tooltipAria)}
            </h3>
            <div class="security-field-row">
              <label class="switch">
                <input id="security-enforce-tfa-for-new-users" type="checkbox" />
                <span class="slider"></span>
              </label>
              <span>${escapeHtml(i18n.t("ui.app.admin.security.enforce_tfa_for_new_users_label"))}</span>
            </div>
          </div>
          <div class="components-section">
            <h3 class="components-section-heading">
              ${escapeHtml(i18n.t("ui.app.admin.security.password_policy_heading"))}
            </h3>
            ${POLICY_FIELDS.map(
                ({ id, min, i18nSuffix }) => `
            <div class="security-field-row">
              <label for="${id}">${escapeHtml(i18n.t(`ui.app.admin.security.${i18nSuffix}`))}</label>
              <input id="${id}" class="security-policy-number-input" type="number" min="${min}" max="128" />
            </div>`,
            ).join("")}
          </div>
        </div>`;
        },
    };
}

import { apiFetch } from "/static/reuse/api-client.js";
import { showToast } from "/static/reuse/toast.js";
import { openPopup } from "/static/reuse/popup.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { renderInfoTooltip } from "/static/reuse/info-tooltip.js";
import { formatTemplate } from "/static/reuse/format-template.js";
import { openPasswordResetPopup } from "/static/gateways/auth/security-prefs/password-reset.js";
import {
    loadTfaStatus,
    beginTfaSetup,
    verifyTfaSetup,
    cancelTfaSetup,
    disableTfaMethod,
    enableTfaMethod,
    loadTfaMethodDetails,
    savePreferredTfaMethods,
    rotateRecoveryCodes,
    loadRecoveryCodesStatus,
} from "/static/gateways/auth/security-prefs/tfa-api.js";

export function createSettingsSection({ i18n, root, markDirty }) {
    let capability = null;
    let lastUnsupportedToastKey = null;
    let tfaStatus = null;
    let recoveryCodesStatus = {
        codes: [],
        totalCount: 0,
        usedCount: 0,
        remainingCount: 0,
        lowThreshold: 2,
    };
    let generatedRecoveryCodes = [];
    let recoveryCodesVisible = false;
    let dragTfaMethodId = null;
    let enforcingTfaSetup = false;
    let tfaDragAndDropBound = false;
    let pendingPreferredIds = [];
    let savedPreferredIds = [];
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

    const fetchTfaStatus = () => loadTfaStatus(apiFetch);
    const fetchRecoveryCodesStatus = () => loadRecoveryCodesStatus(apiFetch);
    const beginSetup = (methodId) => beginTfaSetup(apiFetch, methodId);
    const verifySetup = (methodId, setupId, verification) =>
        verifyTfaSetup(apiFetch, methodId, setupId, verification);
    const cancelSetup = (methodId, setupId) =>
        cancelTfaSetup(apiFetch, methodId, setupId);
    const disableMethod = (methodId) => disableTfaMethod(apiFetch, methodId);
    const enableMethod = (methodId) => enableTfaMethod(apiFetch, methodId);
    const fetchMethodDetails = (methodId) =>
        loadTfaMethodDetails(apiFetch, methodId);
    const savePreferred = (methodIds) =>
        savePreferredTfaMethods(apiFetch, methodIds);
    const rotateCodes = () => rotateRecoveryCodes(apiFetch);

    function resolveTranslatedMessage(key) {
        if (typeof key !== "string" || !key.trim()) {
            return null;
        }
        const translated = i18n.t(key);
        if (translated && translated !== key) {
            return translated;
        }
        return null;
    }

    function resolveTfaErrorMessage(message) {
        const normalizedMessage = String(message ?? "").trim();
        const messageKeyByCode = {
            invalid_totp_code: "ui.app.login.tfa.error_invalid",
            invalid_recovery_code: "ui.app.login.tfa.error_invalid",
            code_required: "ui.app.login.tfa.error_invalid",
            recovery_code_required: "ui.app.login.tfa.error_invalid",
            setup_not_found: "gateway.auth.security.tfa_setup_failed",
            setup_expired: "gateway.auth.security.tfa_setup_failed",
            tfa_method_unavailable: "gateway.auth.security.tfa_setup_failed",
            method_not_configured: "gateway.auth.security.tfa_setup_failed",
            verification_failed: "gateway.auth.security.tfa_setup_failed",
        };
        const mappedMessage = resolveTranslatedMessage(
            messageKeyByCode[normalizedMessage],
        );
        if (mappedMessage) {
            return mappedMessage;
        }
        return (
            resolveTranslatedMessage(normalizedMessage) ||
            i18n.t("gateway.auth.security.tfa_setup_failed")
        );
    }

    function createQrImageSource(qrSvg) {
        if (typeof qrSvg !== "string" || !qrSvg.trim()) {
            return { src: "", revoke: () => {} };
        }
        try {
            const qrBlob = new Blob([qrSvg], { type: "image/svg+xml" });
            const qrBlobUrl = URL.createObjectURL(qrBlob);
            return {
                src: qrBlobUrl,
                revoke: () => URL.revokeObjectURL(qrBlobUrl),
            };
        } catch {
            return { src: "", revoke: () => {} };
        }
    }

    function makeEmptyMethodRow() {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.setAttribute("colspan", "2");
        cell.className = "language-table-empty-cell";
        cell.textContent = "\u00A0";
        row.append(cell);
        return row;
    }

    function makeEmptyRecoveryCodeRow() {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.setAttribute("colspan", "2");
        cell.className = "language-table-empty-cell";
        cell.textContent = i18n.t("gateway.auth.security.tfa_recovery_codes_none");
        row.append(cell);
        return row;
    }

    function renderTfaRows(methods, isPreferred) {
        if (!Array.isArray(methods) || methods.length === 0) {
            return makeEmptyMethodRow().outerHTML;
        }
        return methods
            .map(
                (method) =>
                    `<tr draggable="true" data-tfa-method-row="${escapeHtml(method.id)}">
                      <td>${isPreferred ? "\u2713\u00A0" : ""}${escapeHtml(method.name)}</td>
                      <td class="drag-handle">\u2B0D</td>
                    </tr>`,
            )
            .join("");
    }

    function getAllUniqueMethods() {
        const all = [
            ...(tfaStatus?.availableMethods ?? []),
            ...(tfaStatus?.enabledMethods ?? []),
        ];
        const seen = new Set();
        return all.filter((method) => {
            if (seen.has(method.id)) return false;
            seen.add(method.id);
            return true;
        });
    }

    function resolveTfaLists() {
        const allMethods = getAllUniqueMethods();
        const pendingSet = new Set(pendingPreferredIds);
        return {
            preferred: pendingPreferredIds
                .map((id) => allMethods.find((method) => method.id === id))
                .filter(Boolean),
            available: allMethods.filter(
                (method) => !pendingSet.has(method.id),
            ),
        };
    }

    function renderRecoveryCodesRows() {
        if (!Array.isArray(recoveryCodesStatus.codes)) {
            return makeEmptyRecoveryCodeRow().outerHTML;
        }
        if (recoveryCodesStatus.codes.length === 0) {
            return makeEmptyRecoveryCodeRow().outerHTML;
        }
        return recoveryCodesStatus.codes
            .map((entry, index) => {
                const codeText = generatedRecoveryCodes[index];
                const canRevealCode = typeof codeText === "string";
                const codeDisplay = canRevealCode
                    ? recoveryCodesVisible
                        ? escapeHtml(codeText)
                        : "\u2022\u2022\u2022\u2022-\u2022\u2022\u2022\u2022"
                    : `${i18n.t("gateway.auth.security.tfa_recovery_codes_code_prefix")} ${escapeHtml(entry.label)}`;
                return `
                    <tr data-recovery-code-row="${escapeHtml(entry.id)}">
                      <td class="settings-recovery-code-cell">${codeDisplay}</td>
                      <td class="settings-recovery-code-status-cell">${entry.used ? `<span class="settings-recovery-code-used-marker">\u2715 ${i18n.t("gateway.auth.security.tfa_recovery_codes_used")}</span>` : `<span class="settings-recovery-code-ready-marker">${i18n.t("gateway.auth.security.tfa_recovery_codes_ready_marker")}</span>`}</td>
                    </tr>
                `;
            })
            .join("");
    }

    function clearTfaDropMarkers() {
        settingsRoot
            .querySelectorAll(
                ".drop-target-before, .drop-target-after, .language-row-dragging",
            )
            .forEach((row) => {
                row.classList.remove(
                    "drop-target-before",
                    "drop-target-after",
                    "language-row-dragging",
                );
            });
    }

    function resolveTfaDropTarget(targetNode, clientY) {
        const targetTable = targetNode?.closest(
            "#available-tfa-methods, #preferred-tfa-methods",
        );
        const targetRow = targetNode?.closest("[data-tfa-method-row]");
        const targetIsAfter = Boolean(
            targetRow &&
            clientY >
                targetRow.getBoundingClientRect().top +
                    targetRow.getBoundingClientRect().height / 2,
        );
        return { targetTable, targetRow, targetIsAfter };
    }

    function insertPreferredMethodId({
        preferredMethodIds,
        methodId,
        targetRow,
        targetIsAfter,
    }) {
        const nextPreferredMethodIds = preferredMethodIds.filter(
            (entry) => entry !== methodId,
        );
        if (!targetRow) {
            nextPreferredMethodIds.push(methodId);
            return nextPreferredMethodIds;
        }
        const targetMethodId = targetRow.getAttribute("data-tfa-method-row");
        const targetIndex = nextPreferredMethodIds.indexOf(targetMethodId);
        if (targetIndex < 0) {
            nextPreferredMethodIds.push(methodId);
            return nextPreferredMethodIds;
        }
        nextPreferredMethodIds.splice(
            targetIsAfter ? targetIndex + 1 : targetIndex,
            0,
            methodId,
        );
        return nextPreferredMethodIds;
    }

    async function runTfaSetupFlow(methodId) {
        const setup = await beginSetup(methodId);
        if (!setup?.setupId) {
            showToast(i18n.t("gateway.auth.security.tfa_setup_failed"), {
                variant: "error",
            });
            return false;
        }
        let codeInput = null;
        const setupPrompt = setup.view?.prompt
            ? i18n.t(setup.view.prompt) || setup.view.prompt
            : "";
        const codeLabelKey = setup.view?.fields?.[0]?.label;
        const codeLabel = codeLabelKey
            ? i18n.t(codeLabelKey) || codeLabelKey
            : i18n.t("ui.app.login.tfa.code_label");
        const setupDetails =
            setup.view?.details && typeof setup.view.details === "object"
                ? setup.view.details
                : {};
        const manualSecret =
            typeof setupDetails.manualSecret === "string"
                ? setupDetails.manualSecret
                : "";
        const qrSvg =
            typeof setupDetails.qrSvg === "string" ? setupDetails.qrSvg : "";
        const qrImage = createQrImageSource(qrSvg);
        const detailsHtml = Object.entries(setupDetails)
            .filter(([key]) => key !== "manualSecret" && key !== "qrSvg")
            .map(
                ([key, value]) => `
                  <p><strong>${escapeHtml(key)}</strong>: ${escapeHtml(String(value))}</p>`,
            )
            .join("");
        let popupResult = null;
        try {
            popupResult = await openPopup({
                title: i18n.t("gateway.auth.security.tfa_setup_title"),
                maxWidth: "520px",
                body: () => `
                <div class="stack">
                  <p class="settings-tfa-setup-prompt">${escapeHtml(setupPrompt)}</p>
                  ${qrImage.src ? `<img src="${escapeHtml(qrImage.src)}" alt="${escapeHtml(i18n.t("gateway.auth.security.tfa_qr_code_alt"))}" class="settings-tfa-setup-qr" />` : ""}
                  ${manualSecret ? `<label>${escapeHtml(i18n.t("gateway.auth.security.tfa_manual_secret"))}<code class="settings-tfa-setup-code">${escapeHtml(manualSecret)}</code></label>` : ""}
                  ${detailsHtml}
                  <label>
                    ${escapeHtml(codeLabel)}
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
                onAction: async (actionId) => {
                    if (actionId !== "confirm") {
                        return true;
                    }
                    if (!(codeInput instanceof HTMLInputElement)) {
                        showToast(
                            i18n.t("gateway.auth.security.tfa_setup_failed"),
                            {
                                variant: "error",
                            },
                        );
                        return false;
                    }
                    const result = await verifySetup(methodId, setup.setupId, {
                        code: codeInput.value.trim(),
                    });
                    if (!result.ok) {
                        showToast(resolveTfaErrorMessage(result.message), {
                            variant: "error",
                        });
                        return false;
                    }
                    showToast(
                        `\u2713 ${i18n.t("gateway.auth.security.tfa_setup_success")}`,
                        {
                            variant: "success",
                        },
                    );
                    return true;
                },
            });
        } finally {
            qrImage.revoke();
        }
        if (popupResult !== "confirm") {
            await cancelSetup(methodId, setup.setupId);
            return false;
        }
        return true;
    }

    async function openConfiguredMethodPopup(methodId) {
        const details = await fetchMethodDetails(methodId);
        if (!details || typeof details !== "object") {
            showToast(
                i18n.t("gateway.auth.security.tfa_method_details_failed"),
                {
                    variant: "error",
                },
            );
            return false;
        }
        const manualSecret =
            typeof details.manualSecret === "string"
                ? details.manualSecret
                : "";
        const qrSvg = typeof details.qrSvg === "string" ? details.qrSvg : "";
        const qrImage = createQrImageSource(qrSvg);
        let action = null;
        try {
            action = await openPopup({
                title: i18n.t("gateway.auth.security.tfa_method_manage_title"),
                maxWidth: "520px",
                body: () => `
                <div class="stack">
                  <p class="settings-tfa-setup-prompt">${escapeHtml(i18n.t("gateway.auth.security.tfa_method_manage_prompt"))}</p>
                  ${qrImage.src ? `<img src="${escapeHtml(qrImage.src)}" alt="${escapeHtml(i18n.t("gateway.auth.security.tfa_qr_code_alt"))}" class="settings-tfa-setup-qr" />` : ""}
                  ${manualSecret ? `<label>${escapeHtml(i18n.t("gateway.auth.security.tfa_manual_secret"))}<code class="settings-tfa-setup-code">${escapeHtml(manualSecret)}</code></label>` : ""}
                </div>`,
                actions: [
                    {
                        id: "rotate",
                        label: i18n.t(
                            "gateway.auth.security.tfa_method_rotate",
                        ),
                        variant: "confirm",
                    },
                    {
                        id: "close",
                        label: i18n.t("ui.reuse.close"),
                        variant: "cancel",
                    },
                ],
            });
        } finally {
            qrImage.revoke();
        }
        if (action !== "rotate") {
            return false;
        }
        return runTfaSetupFlow(methodId);
    }

    function bindTfaDragAndDrop() {
        if (tfaDragAndDropBound) return;
        tfaDragAndDropBound = true;
        settingsRoot.addEventListener("dragstart", (event) => {
            const target =
                event.target instanceof Element ? event.target : null;
            if (!target) return;
            const row = target.closest("[data-tfa-method-row]");
            if (!row) return;
            dragTfaMethodId = row.getAttribute("data-tfa-method-row");
            row.classList.add("language-row-dragging");
            event.dataTransfer?.setData("text/plain", dragTfaMethodId || "");
        });

        settingsRoot.addEventListener("dragend", () => {
            clearTfaDropMarkers();
            dragTfaMethodId = null;
        });

        settingsRoot.addEventListener("dragover", (event) => {
            const target =
                event.target instanceof Element ? event.target : null;
            if (!target) return;
            const zone = target.closest(
                "#available-tfa-methods, #preferred-tfa-methods, [data-tfa-method-row]",
            );
            if (!zone) return;
            event.preventDefault();
            clearTfaDropMarkers();
            const row = zone.closest("[data-tfa-method-row]");
            if (row) {
                const rect = row.getBoundingClientRect();
                const isAfter = event.clientY > rect.top + rect.height / 2;
                row.classList.add(
                    isAfter ? "drop-target-after" : "drop-target-before",
                );
                return;
            }
            const placeholderRow = zone.querySelector(
                "tr:not([data-tfa-method-row])",
            );
            if (placeholderRow) {
                placeholderRow.classList.add("drop-target-before");
            }
        });

        settingsRoot.addEventListener("drop", (event) => {
            const target =
                event.target instanceof Element ? event.target : null;
            if (!target) return;
            const { targetTable, targetRow, targetIsAfter } =
                resolveTfaDropTarget(target, event.clientY);
            if (!targetTable) return;
            event.preventDefault();
            clearTfaDropMarkers();
            const methodId =
                dragTfaMethodId || event.dataTransfer?.getData("text/plain");
            dragTfaMethodId = null;
            if (!methodId) return;
            const isCurrentlyPreferred = pendingPreferredIds.includes(methodId);
            if (
                targetTable.id === "available-tfa-methods" &&
                isCurrentlyPreferred
            ) {
                const methodName =
                    getAllUniqueMethods().find(
                        (method) => method.id === methodId,
                    )?.name ?? methodId;
                pendingPreferredIds = pendingPreferredIds.filter(
                    (entry) => entry !== methodId,
                );
                showToast(
                    formatTemplate(
                        i18n.t("gateway.auth.security.tfa_method_deactivated"),
                        { method: methodName },
                    ),
                    { variant: "warning" },
                );
                rerender();
                markDirty?.("security-tfa", isDirtyTfa());
                return;
            }
            if (
                targetTable.id === "preferred-tfa-methods" &&
                !isCurrentlyPreferred
            ) {
                pendingPreferredIds = insertPreferredMethodId({
                    preferredMethodIds: pendingPreferredIds,
                    methodId,
                    targetRow,
                    targetIsAfter,
                });
                rerender();
                markDirty?.("security-tfa", isDirtyTfa());
                return;
            }
            if (
                targetTable.id === "preferred-tfa-methods" &&
                isCurrentlyPreferred
            ) {
                pendingPreferredIds = insertPreferredMethodId({
                    preferredMethodIds: pendingPreferredIds,
                    methodId,
                    targetRow,
                    targetIsAfter,
                });
                rerender();
                markDirty?.("security-tfa", isDirtyTfa());
            }
        });
    }

    async function enforceTfaSetupFlow() {
        if (enforcingTfaSetup) return;
        if (tfaStatus?.requiresSetup !== true) return;
        if ((tfaStatus?.enabledMethods?.length ?? 0) > 0) return;
        enforcingTfaSetup = true;
        try {
            while ((tfaStatus?.enabledMethods?.length ?? 0) === 0) {
                const available = resolveTfaLists().available;
                if (available.length === 0) {
                    break;
                }
                let methodSelect = null;
                const action = await openPopup({
                    title: i18n.t("gateway.auth.security.tfa_required_title"),
                    body: () => `
                    <div class="stack">
                      <p>${escapeHtml(i18n.t("gateway.auth.security.tfa_required_prompt"))}</p>
                      <select id="settings-required-tfa-method" class="theme-select">
                        ${available
                            .map(
                                (method) =>
                                    `<option value="${escapeHtml(method.id)}">${escapeHtml(method.name)}</option>`,
                            )
                            .join("")}
                      </select>
                    </div>`,
                    actions: [
                        {
                            id: "confirm",
                            label: i18n.t("ui.reuse.confirm"),
                            variant: "confirm",
                        },
                    ],
                    onOpen: (overlay) => {
                        methodSelect = overlay.querySelector(
                            "#settings-required-tfa-method",
                        );
                    },
                });
                if (
                    action !== "confirm" ||
                    !(methodSelect instanceof HTMLSelectElement)
                ) {
                    break;
                }
                const setupCompleted = await runTfaSetupFlow(
                    methodSelect.value,
                );
                if (!setupCompleted) continue;
                tfaStatus = await fetchTfaStatus();
                savedPreferredIds = (tfaStatus?.enabledMethods ?? []).map(
                    (method) => method.id,
                );
                pendingPreferredIds = [...savedPreferredIds];
                rerender();
            }
        } finally {
            if (generatedRecoveryCodes.length === 0) {
                recoveryCodesVisible = false;
            }
            enforcingTfaSetup = false;
        }
    }

    function bindTfaInteractions() {
        settingsRoot
            .querySelectorAll("#available-tfa-methods tr[data-tfa-method-row]")
            .forEach((row) => {
                if (!(row instanceof HTMLTableRowElement)) return;
                row.onclick = async () => {
                    const methodId = row.getAttribute("data-tfa-method-row");
                    if (!methodId) return;
                    const methodEntry = (
                        tfaStatus?.availableMethods ?? []
                    ).find((entry) => entry.id === methodId);
                    if (!methodEntry?.configuredAt) {
                        const setupCompleted = await runTfaSetupFlow(methodId);
                        if (!setupCompleted) return;
                        tfaStatus = await fetchTfaStatus();
                        savedPreferredIds = (
                            tfaStatus?.enabledMethods ?? []
                        ).map((method) => method.id);
                        pendingPreferredIds = [...savedPreferredIds];
                        markDirty?.("security-tfa", false);
                    } else {
                        await openConfiguredMethodPopup(methodId);
                        tfaStatus = await fetchTfaStatus();
                    }
                    rerender();
                };
            });

        settingsRoot
            .querySelectorAll("#preferred-tfa-methods tr[data-tfa-method-row]")
            .forEach((row) => {
                if (!(row instanceof HTMLTableRowElement)) return;
                row.onclick = async () => {
                    const methodId = row.getAttribute("data-tfa-method-row");
                    if (!methodId) return;
                    const updated = await openConfiguredMethodPopup(methodId);
                    if (!updated) return;
                    tfaStatus = await fetchTfaStatus();
                    rerender();
                };
            });

        const recoveryCodesButton = settingsRoot.querySelector(
            "#settings-recovery-codes-btn",
        );
        if (recoveryCodesButton instanceof HTMLButtonElement) {
            recoveryCodesButton.onclick = async () => {
                const recoveryCodes = await rotateCodes();
                if (!recoveryCodes) {
                    showToast(
                        i18n.t(
                            "gateway.auth.security.tfa_recovery_codes_failed",
                        ),
                        {
                            variant: "error",
                        },
                    );
                    return;
                }
                generatedRecoveryCodes = [...recoveryCodes];
                recoveryCodesVisible = false;
                recoveryCodesStatus = await fetchRecoveryCodesStatus();
                tfaStatus = await fetchTfaStatus();
                rerender();
                showToast(
                    i18n.t(
                        "gateway.auth.security.tfa_recovery_codes_generated",
                    ),
                    {
                        variant: "success",
                    },
                );
            };
        }
        const recoveryCodesToggleButton = settingsRoot.querySelector(
            "#settings-recovery-codes-toggle-btn",
        );
        if (recoveryCodesToggleButton instanceof HTMLButtonElement) {
            recoveryCodesToggleButton.onclick = () => {
                recoveryCodesVisible = !recoveryCodesVisible;
                rerender();
            };
        }
    }

    function rerender() {
        const panel = settingsRoot.querySelector("#auth-security-reset-panel");
        if (panel) {
            panel.innerHTML = renderBody();
        }
        bindTfaInteractions();
    }

    function renderBody() {
        const { available, preferred } = resolveTfaLists();
        const hasRecoveryCodes = tfaStatus?.hasRecoveryCodes === true;
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
        const recoveryCodesHint = renderInfoTooltip(
            i18n.t("gateway.auth.security.tfa_recovery_codes_hint"),
            i18n.t("ui.reuse.more_information"),
        );
        return `
      <div class="settings-auth-password-reset">
        <h3>${i18n.t("gateway.auth.security.reset_title")}</h3>
        ${reason}
        <button class="btn-animated" type="button" id="settings-reset-password-btn"${disabled}>${i18n.t("gateway.auth.security.reset_action")}</button>
      </div>
      <div class="settings-auth-tfa">
        <h3>${i18n.t("gateway.auth.security.tfa_section_title")}</h3>
        <div class="sub-composer-inner content-grid--two-column">
          <div class="widget-card">
            <div class="settings-language-heading-row">
              <h3>${i18n.t("gateway.auth.security.tfa_available_methods")}</h3>
            </div>
            <table id="available-tfa-methods" class="language-table">${renderTfaRows(available, false)}</table>
          </div>
          <div class="widget-card">
            <div class="settings-language-heading-row">
              <h3>${i18n.t("gateway.auth.security.tfa_preferred_methods")}</h3>
            </div>
            <table id="preferred-tfa-methods" class="language-table">${renderTfaRows(preferred, true)}</table>
          </div>
        </div>
      </div>
      <div class="settings-auth-recovery-codes">
        <h3>${i18n.t("gateway.auth.security.tfa_recovery_codes_title")}${recoveryCodesHint}</h3>
        <p>${i18n.t(hasRecoveryCodes ? "gateway.auth.security.tfa_recovery_codes_ready" : "gateway.auth.security.tfa_recovery_codes_missing")} ${i18n.t("gateway.auth.security.tfa_recovery_codes_remaining_label").replace("{count}", String(recoveryCodesStatus.remainingCount))}</p>
        <div class="settings-auth-recovery-actions">
          <button class="btn-animated" type="button" id="settings-recovery-codes-btn">${i18n.t(hasRecoveryCodes ? "gateway.auth.security.tfa_recovery_codes_action" : "gateway.auth.security.tfa_recovery_codes_create_action")}</button>
          <button class="btn-animated" type="button" id="settings-recovery-codes-toggle-btn" ${generatedRecoveryCodes.length === 0 ? "disabled" : ""}>${i18n.t(recoveryCodesVisible ? "gateway.auth.security.tfa_recovery_codes_hide" : "gateway.auth.security.tfa_recovery_codes_reveal")}</button>
        </div>
        <table id="settings-recovery-codes-table" class="language-table">${renderRecoveryCodesRows()}</table>
      </div>
    `;
    }

    function renderContent() {
        return `<div id="auth-security-reset-panel">${renderBody()}</div>`;
    }

    function isDirtyTfa() {
        if (pendingPreferredIds.length !== savedPreferredIds.length) {
            return true;
        }
        return pendingPreferredIds.some(
            (id, index) => id !== savedPreferredIds[index],
        );
    }

    return {
        id: "security",
        label: i18n.t("gateway.auth.security.section_title"),
        heading: i18n.t("gateway.auth.security.section_title"),
        preferenceKey: "settings-security-layout",
        renderContent,
        async onRender() {
            [capability, tfaStatus, recoveryCodesStatus] = await Promise.all([
                (async () => {
                    await loadCapability();
                    return capability;
                })(),
                fetchTfaStatus(),
                fetchRecoveryCodesStatus(),
            ]);
            savedPreferredIds = (tfaStatus?.enabledMethods ?? []).map(
                (method) => method.id,
            );
            pendingPreferredIds = [...savedPreferredIds];
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
                openPasswordResetPopup({
                    i18n,
                    apiFetch,
                    openPopup,
                    showToast,
                });
            };
            bindTfaInteractions();
            bindTfaDragAndDrop();
            enforceTfaSetupFlow();
        },
        isDirty: () => isDirtyTfa(),
        async save() {
            const currentStatus = await fetchTfaStatus();
            const currentEnabledIds = new Set(
                (currentStatus.enabledMethods ?? []).map((method) => method.id),
            );
            const allMethods = [
                ...(currentStatus.availableMethods ?? []),
                ...(currentStatus.enabledMethods ?? []),
            ];
            const allMethodsById = new Map(
                allMethods
                    .filter(
                        (method, index, arr) =>
                            arr.findIndex((entry) => entry.id === method.id) ===
                            index,
                    )
                    .map((method) => [method.id, method]),
            );
            for (const id of [...pendingPreferredIds]) {
                if (!currentEnabledIds.has(id)) {
                    const method = allMethodsById.get(id);
                    if (method?.configuredAt) {
                        await enableMethod(id);
                    } else {
                        const setupCompleted = await runTfaSetupFlow(id);
                        if (!setupCompleted) {
                            pendingPreferredIds = pendingPreferredIds.filter(
                                (entry) => entry !== id,
                            );
                        }
                    }
                }
            }
            for (const id of currentEnabledIds) {
                if (!pendingPreferredIds.includes(id)) {
                    await disableMethod(id);
                }
            }
            await savePreferred(pendingPreferredIds);
            tfaStatus = await fetchTfaStatus();
            savedPreferredIds = [...pendingPreferredIds];
            rerender();
            markDirty?.("security-tfa", false);
        },
        commit() {
            savedPreferredIds = [...pendingPreferredIds];
            markDirty?.("security-tfa", false);
        },
        discard() {
            pendingPreferredIds = [...savedPreferredIds];
            rerender();
            markDirty?.("security-tfa", false);
        },
    };
}

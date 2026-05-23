import { apiFetch } from "/static/reuse/api-client.js";
import { showToast } from "/static/reuse/toast.js";
import { openPopup } from "/static/reuse/popup.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { openPasswordResetPopup } from "/static/gateways/auth/security-prefs/password-reset.js";

export function createSettingsSection({ i18n, root }) {
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

    async function loadTfaStatus() {
        const response = await apiFetch("/api/v1/tfa/methods").catch(
            () => null,
        );
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

    async function enableTfaMethod(methodId) {
        const response = await apiFetch(
            `/api/v1/tfa/methods/${encodeURIComponent(methodId)}/enable`,
            { method: "POST" },
        );
        return response.ok;
    }

    async function loadTfaMethodDetails(methodId) {
        const response = await apiFetch(
            `/api/v1/tfa/methods/${encodeURIComponent(methodId)}/details`,
        );
        if (!response.ok) return null;
        const payload = await response.json().catch(() => null);
        return payload?.data?.details ?? null;
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

    async function loadRecoveryCodesStatus() {
        const response = await apiFetch("/api/v1/tfa/recovery-codes").catch(
            () => null,
        );
        if (!response?.ok) {
            return {
                codes: [],
                totalCount: 0,
                usedCount: 0,
                remainingCount: 0,
                lowThreshold: 2,
            };
        }
        const payload = await response.json().catch(() => null);
        const data = payload?.data;
        if (!data || typeof data !== "object") {
            return {
                codes: [],
                totalCount: 0,
                usedCount: 0,
                remainingCount: 0,
                lowThreshold: 2,
            };
        }
        const codes = Array.isArray(data.codes) ? data.codes : [];
        return {
            codes: codes.map((entry) => ({
                id: String(entry.id ?? ""),
                label: String(entry.label ?? ""),
                used: entry.used === true,
                usedAt:
                    typeof entry.usedAt === "string" && entry.usedAt.trim()
                        ? entry.usedAt
                        : null,
            })),
            totalCount: Number(data.totalCount ?? 0),
            usedCount: Number(data.usedCount ?? 0),
            remainingCount: Number(data.remainingCount ?? 0),
            lowThreshold: Number(data.lowThreshold ?? 2),
        };
    }

    function makeEmptyDropZoneRow() {
        return `<div class="settings-tfa-option-empty">\u00A0</div>`;
    }

    function renderTfaRows(methods) {
        if (!Array.isArray(methods) || methods.length === 0) {
            return makeEmptyDropZoneRow();
        }
        return methods
            .map(
                (method) => `
                <button
                    type="button"
                    class="settings-tfa-option${method.enabled ? " settings-tfa-option--enabled" : ""}${method.configuredAt ? " settings-tfa-option--configured" : ""}"
                    data-tfa-method-row="${escapeHtml(method.id)}"
                    draggable="true"
                    title="${escapeHtml(method.name)}"
                >
                  <span class="settings-tfa-option-label">${escapeHtml(method.name)}</span>
                  <span class="settings-tfa-option-badge">${method.enabled ? "\u2713" : method.configuredAt ? "\u2713" : "+"}</span>
                </button>`,
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

    function renderRecoveryCodesRows() {
        if (!Array.isArray(recoveryCodesStatus.codes)) {
            return makeEmptyDropZoneRow();
        }
        if (recoveryCodesStatus.codes.length === 0) {
            return makeEmptyDropZoneRow();
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
        const setup = await beginTfaSetup(methodId);
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
                    const result = await verifyTfaSetup(
                        methodId,
                        setup.setupId,
                        {
                            code: codeInput.value.trim(),
                        },
                    );
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
            await cancelTfaSetup(methodId, setup.setupId);
            return false;
        }
        return true;
    }

    async function openConfiguredMethodPopup(methodId) {
        const details = await loadTfaMethodDetails(methodId);
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
                ".settings-tfa-option-empty",
            );
            if (placeholderRow) {
                placeholderRow.classList.add("drop-target-before");
            }
        });

        settingsRoot.addEventListener("drop", async (event) => {
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
            let status = await loadTfaStatus();
            const isInPreferred = (status.enabledMethods ?? []).some(
                (entry) => entry.id === methodId,
            );
            const methodDetails =
                (status.availableMethods ?? []).find(
                    (entry) => entry.id === methodId,
                ) ??
                (status.enabledMethods ?? []).find(
                    (entry) => entry.id === methodId,
                ) ??
                null;
            if (targetTable.id === "available-tfa-methods" && isInPreferred) {
                await disableTfaMethod(methodId);
                status = await loadTfaStatus();
                showToast(
                    `\u2713 ${i18n.t("gateway.auth.security.tfa_method_moved_available")}`,
                    {
                        variant: "success",
                    },
                );
            }
            if (targetTable.id === "preferred-tfa-methods" && !isInPreferred) {
                const methodConfigured = Boolean(methodDetails?.configuredAt);
                let setupCompleted = false;
                if (methodConfigured) {
                    setupCompleted = await enableTfaMethod(methodId);
                    if (setupCompleted) {
                        showToast(
                            `\u2713 ${i18n.t("gateway.auth.security.tfa_method_enabled_success")}`,
                            {
                                variant: "success",
                            },
                        );
                    }
                } else {
                    setupCompleted = await runTfaSetupFlow(methodId);
                }
                if (!setupCompleted) {
                    tfaStatus = await loadTfaStatus();
                    const panel = settingsRoot.querySelector(
                        "#auth-security-reset-panel",
                    );
                    if (panel) panel.innerHTML = renderBody();
                    bindTfaInteractions();
                    return;
                }
                status = await loadTfaStatus();
            }
            let preferredMethodIds = (status.enabledMethods ?? []).map(
                (entry) => entry.id,
            );
            if (targetTable.id === "preferred-tfa-methods") {
                preferredMethodIds = insertPreferredMethodId({
                    preferredMethodIds,
                    methodId,
                    targetRow,
                    targetIsAfter,
                });
            }
            await savePreferredTfaMethods(preferredMethodIds);
            tfaStatus = await loadTfaStatus();
            const panel = settingsRoot.querySelector(
                "#auth-security-reset-panel",
            );
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
                tfaStatus = await loadTfaStatus();
                const panel = settingsRoot.querySelector(
                    "#auth-security-reset-panel",
                );
                if (panel) panel.innerHTML = renderBody();
                bindTfaInteractions();
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
            .querySelectorAll("#available-tfa-methods .settings-tfa-option")
            .forEach((optionButton) => {
                if (!(optionButton instanceof HTMLButtonElement)) return;
                optionButton.onclick = async () => {
                    const methodId = optionButton.getAttribute(
                        "data-tfa-method-row",
                    );
                    if (!methodId) return;
                    const methodEntry = (
                        tfaStatus?.availableMethods ?? []
                    ).find((entry) => entry.id === methodId);
                    if (!methodEntry?.configuredAt) {
                        const setupCompleted = await runTfaSetupFlow(methodId);
                        if (!setupCompleted) return;
                    } else {
                        await openConfiguredMethodPopup(methodId);
                    }
                    tfaStatus = await loadTfaStatus();
                    const panel = settingsRoot.querySelector(
                        "#auth-security-reset-panel",
                    );
                    if (panel) {
                        panel.innerHTML = renderBody();
                    }
                    bindTfaInteractions();
                };
            });

        settingsRoot
            .querySelectorAll("#preferred-tfa-methods .settings-tfa-option")
            .forEach((optionButton) => {
                if (!(optionButton instanceof HTMLButtonElement)) return;
                optionButton.onclick = async () => {
                    const methodId = optionButton.getAttribute(
                        "data-tfa-method-row",
                    );
                    if (!methodId) return;
                    const updated = await openConfiguredMethodPopup(methodId);
                    if (!updated) return;
                    tfaStatus = await loadTfaStatus();
                    const panel = settingsRoot.querySelector(
                        "#auth-security-reset-panel",
                    );
                    if (panel) {
                        panel.innerHTML = renderBody();
                    }
                    bindTfaInteractions();
                };
            });

        const recoveryCodesButton = settingsRoot.querySelector(
            "#settings-recovery-codes-btn",
        );
        if (recoveryCodesButton instanceof HTMLButtonElement) {
            recoveryCodesButton.onclick = async () => {
                const recoveryCodes = await rotateRecoveryCodes();
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
                recoveryCodesStatus = await loadRecoveryCodesStatus();
                tfaStatus = await loadTfaStatus();
                const panel = settingsRoot.querySelector(
                    "#auth-security-reset-panel",
                );
                if (panel) {
                    panel.innerHTML = renderBody();
                }
                bindTfaInteractions();
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
                const panel = settingsRoot.querySelector(
                    "#auth-security-reset-panel",
                );
                if (panel) {
                    panel.innerHTML = renderBody();
                }
                bindTfaInteractions();
            };
        }
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
        return `
      <div class="settings-auth-tfa">
        <h3>${i18n.t("gateway.auth.security.tfa_section_title")}</h3>
        <div class="content-grid--two-column">
          <div>
            <div class="settings-language-heading-row">
              <h3>${i18n.t("gateway.auth.security.tfa_available_methods")}</h3>
            </div>
            <div id="available-tfa-methods" class="settings-tfa-options-grid">${renderTfaRows(available)}</div>
          </div>
          <div>
            <div class="settings-language-heading-row">
              <h3>${i18n.t("gateway.auth.security.tfa_preferred_methods")}</h3>
            </div>
            <div id="preferred-tfa-methods" class="settings-tfa-options-grid">${renderTfaRows(preferred)}</div>
          </div>
        </div>
      </div>
      <div class="settings-auth-recovery-codes">
        <h3>${i18n.t("gateway.auth.security.tfa_recovery_codes_title")}</h3>
        <p>${i18n.t(hasRecoveryCodes ? "gateway.auth.security.tfa_recovery_codes_ready" : "gateway.auth.security.tfa_recovery_codes_missing")} ${i18n.t("gateway.auth.security.tfa_recovery_codes_remaining_label").replace("{count}", String(recoveryCodesStatus.remainingCount))}</p>
        <div class="settings-auth-recovery-actions">
          <button class="btn-animated" type="button" id="settings-recovery-codes-btn">${i18n.t(hasRecoveryCodes ? "gateway.auth.security.tfa_recovery_codes_action" : "gateway.auth.security.tfa_recovery_codes_create_action")}</button>
          <button class="btn-animated" type="button" id="settings-recovery-codes-toggle-btn" ${generatedRecoveryCodes.length === 0 ? "disabled" : ""}>${i18n.t(recoveryCodesVisible ? "gateway.auth.security.tfa_recovery_codes_hide" : "gateway.auth.security.tfa_recovery_codes_reveal")}</button>
        </div>
        <table id="settings-recovery-codes-table" class="language-table">${renderRecoveryCodesRows()}</table>
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
                loadTfaStatus(),
                loadRecoveryCodesStatus(),
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
        isDirty: () => false,
        save: async () => undefined,
        commit: () => undefined,
        discard: () => undefined,
    };
}

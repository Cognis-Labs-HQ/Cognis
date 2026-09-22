/**
 * Reusable configuration-form popup behavior.
 *
 * Public exports:
 *   resolveFieldErrorId(payload) — resolves a field identifier from an API error.
 *   markPopupFieldInvalid(overlay, fieldId, message) — marks one popup field invalid.
 *   openConfigFormPopup(options) — loads, renders, validates, and saves a config form.
 *
 * Usage:
 *   await openConfigFormPopup({ i18n, apiFetch, showToast, escapeHtml, loadUrl, saveUrl, titleKey, fields });
 *
 * @param {object} payload API error payload.
 * @returns {string|null} Field identifier when supplied.
 */
import { renderInfoTooltip } from "../info-tooltip.js";
import { openPopup } from "../popup.js";

/** @param {object} payload @returns {string|null} */
export function resolveFieldErrorId(payload) {
    const error = payload?.error;
    const fieldId = String(error?.fieldId ?? error?.field ?? "").trim();
    return fieldId || null;
}

/**
 * @param {HTMLElement} overlay
 * @param {string} fieldId
 * @param {string} message
 * @returns {boolean}
 */
export function markPopupFieldInvalid(overlay, fieldId, message) {
    if (!(overlay instanceof HTMLElement) || !fieldId) return false;
    const field = overlay.querySelector(`#${CSS.escape(fieldId)}`);
    if (!(field instanceof HTMLElement)) return false;
    const fieldWrapper = field.closest("label") ?? field.parentElement;
    if (!(fieldWrapper instanceof HTMLElement)) return false;
    const errorId = `${fieldId}-form-error`;
    let alert = fieldWrapper.querySelector(`#${CSS.escape(errorId)}`);
    if (!(alert instanceof HTMLElement)) {
        alert = document.createElement("div");
        alert.id = errorId;
        alert.className =
            "form-builder-floating-alert module-settings-popup-field-error";
        alert.setAttribute("aria-live", "polite");
        alert.innerHTML =
            '<ul class="form-builder-criteria-list"><li class="form-builder-criterion-item form-builder-criterion-item--unmet"></li></ul>';
        fieldWrapper.appendChild(alert);
    }
    const messageItem = alert.querySelector(".form-builder-criterion-item");
    if (messageItem instanceof HTMLElement) {
        messageItem.textContent = String(message ?? "");
    }
    fieldWrapper.classList.add(
        "form-builder-field",
        "form-builder-field--invalid",
    );
    field.classList.add("form-builder-input--invalid");
    field.setAttribute("aria-invalid", "true");
    field.setAttribute("aria-describedby", errorId);
    field.focus();
    field.addEventListener(
        "input",
        () => {
            field.removeAttribute("aria-invalid");
            field.removeAttribute("aria-describedby");
            field.classList.remove("form-builder-input--invalid");
            fieldWrapper.classList.remove("form-builder-field--invalid");
            alert.remove();
        },
        { once: true },
    );
    return true;
}

/** @param {object} options @returns {Promise<boolean>} */
export async function openConfigFormPopup({
    i18n,
    apiFetch,
    showToast,
    escapeHtml,
    loadUrl,
    saveUrl,
    titleKey,
    fields,
    noteKey,
    loadFailedKey,
    successKey,
    failedKey,
    powerState,
    enableTest,
}) {
    const loadResponse = await apiFetch(loadUrl);
    if (!loadResponse.ok) {
        showToast(i18n.t(loadFailedKey ?? failedKey), { variant: "error" });
        return false;
    }
    const loadPayload = await loadResponse.json().catch(() => ({ data: {} }));
    const config = loadPayload?.data ?? {};

    let popupOverlay = null;
    let didSave = false;
    const fieldRows = (Array.isArray(fields) ? fields : [])
        .map((field) => {
            const fieldId = String(field.id ?? "").trim();
            if (!fieldId) return "";
            const label = i18n.t(field.labelKey);
            const rawValue = config?.[field.configKey];
            const value = rawValue == null ? "" : String(rawValue);
            const placeholder = field.placeholderKey
                ? i18n.t(field.placeholderKey)
                : "";
            const description = field.descriptionKey
                ? i18n.t(field.descriptionKey)
                : "";
            const descriptorTooltip = description
                ? renderInfoTooltip(
                      description,
                      i18n.t("ui.reuse.more_information"),
                      `${fieldId}-descriptor`,
                  )
                : "";
            const inputType = ["url", "number", "password"].includes(field.type)
                ? field.type
                : "text";
            return `
      <label class="module-settings-popup-field">
        <span class="module-settings-popup-label-row"><span class="module-settings-popup-label">${escapeHtml(label)}</span>${descriptorTooltip}</span>
        <input id="${escapeHtml(fieldId)}" type="${escapeHtml(inputType)}" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}" />
      </label>
    `;
        })
        .join("");
    const noteBlock = noteKey
        ? `<p class="module-settings-popup-note">${escapeHtml(i18n.t(noteKey))}</p>`
        : "";
    const powerStateEnabled = powerState?.enabled === true;
    const powerToggleBlock = powerState
        ? `<div class="provider-popup-toggle-row module-settings-popup-power-row">
        <span class="provider-popup-toggle-label">${escapeHtml(i18n.t(powerState.labelKey ?? "ui.reuse.enable"))}</span>
        <label class="switch provider-popup-switch">
          <input type="checkbox" class="module-settings-popup-power-toggle"${powerStateEnabled ? " checked" : ""} />
          <span class="slider"></span>
        </label>
      </div>`
        : "";

    await openPopup({
        title: i18n.t(titleKey),
        body: () => `
      <div class="module-settings-popup-fields">
        ${powerToggleBlock}
        ${fieldRows}
      </div>
      ${noteBlock}
    `,
        actions: [
            { id: "save", label: i18n.t("ui.reuse.save"), variant: "confirm" },
            {
                id: "cancel",
                label: i18n.t("ui.reuse.cancel"),
                variant: "cancel",
            },
        ],
        closeProtection: true,
        onOpen: (overlay) => {
            popupOverlay = overlay;
        },
        onAction: async (action) => {
            if (action !== "save") return true;
            if (!(popupOverlay instanceof HTMLElement)) return false;

            const values = {};
            for (const field of fields ?? []) {
                const fieldId = String(field.id ?? "").trim();
                if (!fieldId) continue;
                const input = popupOverlay.querySelector(
                    `#${CSS.escape(fieldId)}`,
                );
                const rawValue =
                    input instanceof HTMLInputElement ? input.value.trim() : "";
                values[field.configKey] =
                    typeof field.serialize === "function"
                        ? field.serialize(rawValue)
                        : rawValue;
            }

            const saveResponse = await apiFetch(saveUrl, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(values),
            });
            const savePayload = await (typeof saveResponse.clone === "function"
                ? saveResponse
                      .clone()
                      .json()
                      .catch(() => ({}))
                : saveResponse.json().catch(() => ({})));

            if (!saveResponse.ok) {
                const message =
                    savePayload?.error?.message ?? i18n.t(failedKey);
                if (saveResponse.status === 400) {
                    const fieldId = resolveFieldErrorId(savePayload);
                    if (markPopupFieldInvalid(popupOverlay, fieldId, message)) {
                        return false;
                    }
                }
                showToast(i18n.t(failedKey), { variant: "error" });
                return false;
            }

            if (powerState && typeof powerState.onChange === "function") {
                const powerToggle = popupOverlay.querySelector(
                    ".module-settings-popup-power-toggle",
                );
                const requestedPower =
                    powerToggle instanceof HTMLInputElement
                        ? powerToggle.checked
                        : powerStateEnabled;
                if (
                    requestedPower !== powerStateEnabled &&
                    requestedPower &&
                    enableTest?.url
                ) {
                    const testResponse = await apiFetch(enableTest.url, {
                        method: enableTest.method ?? "POST",
                    });
                    if (!testResponse.ok) {
                        const testPayload = await testResponse
                            .json()
                            .catch(() => ({}));
                        showToast(
                            testPayload?.error?.message ??
                                i18n.t(enableTest.failedKey ?? failedKey),
                            { variant: "error" },
                        );
                        return false;
                    }
                }
                if (requestedPower !== powerStateEnabled) {
                    const powerChanged =
                        await powerState.onChange(requestedPower);
                    if (powerChanged === false) return false;
                }
            }

            didSave = true;
            showToast(i18n.t(successKey), { variant: "success" });
            return true;
        },
    });

    return didSave;
}

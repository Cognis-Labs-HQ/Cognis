import { createAdapterSettingsPopup } from "./reuse/settings-popup.js";

import { extendI18n } from "../../reuse/i18n.js";
import {
    markPopupFieldInvalid,
    resolveFieldErrorId,
} from "../../reuse/popup.js";

export function adapterConfigHasFields(payload) {
    const dataFields = Object.keys(payload.data ?? {});
    const environmentFields = Object.keys(payload.envValues ?? {});
    const requiredFields = Array.isArray(payload.requiredFields)
        ? payload.requiredFields
        : [];
    const schemaFields = Array.isArray(payload.schema)
        ? payload.schema.map((field) => field.key)
        : [];

    return [
        ...dataFields,
        ...environmentFields,
        ...requiredFields,
        ...schemaFields,
    ].some((fieldName) => fieldName !== "enabled");
}

export function createAdapterConfigPopup({
    i18n,
    escapeHtml,
    apiFetch,
    openPopup,
    showToast,
}) {
    function renderGenericAdapterForm(descriptors, testSchema) {
        const field = (name, descriptor, test = false) => {
            const {
                schemaType: type,
                schemaLabel: label,
                effectiveValue: value,
            } = descriptor;
            const attributes = `id="${escapeHtml(name)}" name="${escapeHtml(name)}"${test ? " data-provider-test-field" : ""}`;
            let input;
            if (type === "select") {
                input = `<select ${attributes} class="theme-select">${(
                    descriptor.schemaOptions ?? []
                )
                    .map((option) => {
                        const optionValue =
                            typeof option === "object" ? option.value : option;
                        const text =
                            typeof option === "object"
                                ? i18n.t(option.labelKey)
                                : String(option);
                        return `<option value="${escapeHtml(String(optionValue))}"${String(value) === String(optionValue) ? " selected" : ""}>${escapeHtml(text)}</option>`;
                    })
                    .join("")}</select>`;
            } else if (type === "boolean") {
                input = `<label class="switch"><input ${attributes} type="checkbox"${value === true || value === "true" ? " checked" : ""}/><span class="slider"></span></label>`;
            } else {
                if (
                    !["text", "password", "number", "email", "url"].includes(
                        type,
                    )
                )
                    throw new Error("invalid_provider_field_type");
                const inputValue =
                    type === "password" ? "" : escapeHtml(value ?? "");
                input = `<input ${attributes} class="${test ? "provider-test-input" : "provider-config-input"}" type="${type}" value="${inputValue}" />`;
            }
            const wrapper = type === "boolean" ? "div" : "label";
            return `<${wrapper} class="provider-popup-field" data-provider-field="${escapeHtml(name)}"><span class="provider-field-title">${escapeHtml(label)}<span class="provider-required-flag" data-provider-required="${escapeHtml(name)}" aria-hidden="true" hidden>*</span>${descriptor.envConflict ? `<span class="provider-field-env-warning" title="${escapeHtml(i18n.t("ui.app.admin.notif.field_env_conflict"))}">⚠</span>` : ""}</span>${input}</${wrapper}>`;
        };
        return `<div class="provider-popup-form">
            <div class="provider-popup-toggle-row"><span class="provider-popup-toggle-label">${i18n.t("ui.app.admin.state.active")}</span><label class="switch provider-popup-switch"><input id="enabled" type="checkbox" name="enabled" class="provider-enable-toggle" disabled /><span class="slider"></span></label></div>
            <div class="provider-fields">${Object.entries(descriptors)
                .filter(([name]) => name !== "enabled")
                .map(([name, descriptor]) => field(name, descriptor))
                .join("")}</div>
            ${testSchema === null ? "" : `<div class="provider-test-row">${testSchema.map((entry) => field(entry.key, { schemaType: entry.type, schemaLabel: i18n.t(entry.label), effectiveValue: "" }, true)).join("")}<button class="btn-animated provider-test-btn" type="button">${i18n.t("ui.reuse.test")}</button></div>`}
        </div>`;
    }

    function buildConfigPayload(
        popupFormElement,
        { omitBlankPasswords = false } = {},
    ) {
        const config = {};
        popupFormElement
            .querySelectorAll("[name]:not([data-provider-test-field])")
            .forEach((field) => {
                if (field instanceof HTMLInputElement) {
                    if (field.type === "checkbox") {
                        config[field.name] = field.checked;
                        return;
                    }
                    if (
                        omitBlankPasswords &&
                        field.type === "password" &&
                        field.value === ""
                    ) {
                        return;
                    }
                    config[field.name] =
                        field.type === "number"
                            ? Number(field.value)
                            : field.value;
                    return;
                }
                if (field instanceof HTMLSelectElement) {
                    config[field.name] = field.value;
                }
            });
        return config;
    }

    function loadConfigIntoForm(popupFormElement, config) {
        for (const [fieldName, value] of Object.entries(config)) {
            const field = popupFormElement.querySelector(
                `[name="${CSS.escape(fieldName)}"]`,
            );
            if (field instanceof HTMLInputElement) {
                if (field.type === "checkbox") {
                    field.checked = value === true || value === "true";
                } else {
                    field.value = value == null ? "" : String(value);
                }
            } else if (field instanceof HTMLSelectElement) {
                field.value = value == null ? "" : String(value);
            }
        }
        popupFormElement.dispatchEvent(new Event("input", { bubbles: true }));
    }

    return {
        async openAdapterConfig(
            name,
            {
                signal,
                gatewayId,
                adapterId,
                configUrl,
                testUrl,
                enableUrl,
                disableUrl,
                adapterEnabled,
                adapterLocked,
                onSaved,
            } = {},
        ) {
            if (!configUrl || signal?.aborted) return false;
            let response;
            try {
                response = await apiFetch(configUrl, { signal });
            } catch (error) {
                if (signal?.aborted) return false;
                throw error;
            }
            if (signal?.aborted) return false;
            if (!response.ok) return false;
            const payload = await response.json();
            if (payload.stringsBaseUrl)
                i18n = await extendI18n(i18n, [payload.stringsBaseUrl]);
            if (signal?.aborted) return false;
            const openSettingsPopup = createAdapterSettingsPopup(openPopup, {
                gatewayId,
                adapterId,
                signal,
            });
            const configPopupScriptUrl = String(
                payload.configPopupScriptUrl ?? "",
            ).trim();
            if (configPopupScriptUrl) {
                const extension = await import(configPopupScriptUrl).catch(
                    () => null,
                );
                if (signal?.aborted) return false;
                if (typeof extension?.openAdapterConfig !== "function") {
                    showToast(i18n.t("ui.reuse.load_failed"), {
                        variant: "error",
                    });
                    return false;
                }
                await extension.openAdapterConfig({
                    signal,
                    configUrl,
                    configPayload: payload,
                    enableUrl,
                    disableUrl,
                    adapterEnabled,
                    adapterLocked,
                    onSaved,
                    i18n,
                    escapeHtml,
                    apiFetch,
                    openPopup: openSettingsPopup,
                    showToast,
                    buildConfigPayload,
                });
                return true;
            }
            if (!adapterConfigHasFields(payload)) return false;
            const databaseData = payload.data ?? {};
            const environmentData = payload.envValues ?? {};
            const requiredFields = Array.isArray(payload.requiredFields)
                ? payload.requiredFields
                : [];
            const supportsTest = payload.supportsTest === true;
            const supportsReset = payload.supportsReset === true;
            const schemaFields = Array.isArray(payload.schema)
                ? payload.schema
                : [];

            const fieldNames = new Set(schemaFields.map((field) => field.key));
            const descriptors = {};
            for (const field of fieldNames) {
                const rawDatabase = databaseData[field];
                const rawEnvironment = environmentData[field];
                const databaseValue =
                    rawDatabase != null && rawDatabase !== ""
                        ? String(rawDatabase)
                        : undefined;
                const environmentValue =
                    rawEnvironment != null && rawEnvironment !== ""
                        ? String(rawEnvironment)
                        : undefined;
                let effectiveValue;
                let source;
                if (databaseValue !== undefined) {
                    effectiveValue = databaseValue;
                    source = "db";
                } else if (environmentValue !== undefined) {
                    effectiveValue = environmentValue;
                    source = "env";
                } else {
                    effectiveValue = undefined;
                    source = "none";
                }
                const schemaEntry = schemaFields.find(
                    (entry) => entry.key === field,
                );
                descriptors[field] = {
                    dbValue: databaseValue,
                    envValue: environmentValue,
                    effectiveValue,
                    source,
                    envConflict:
                        databaseValue !== undefined &&
                        environmentValue !== undefined &&
                        databaseValue !== environmentValue,
                    required: requiredFields.includes(field),
                    schemaType: schemaEntry?.type ?? null,
                    schemaLabel: i18n.t(schemaEntry.label),
                    schemaOptions: schemaEntry?.options ?? null,
                    visibleWhen: schemaEntry?.visibleWhen,
                    requiredWhen: schemaEntry?.requiredWhen,
                    configuredSecret: (
                        payload.configuredSecretFields ?? []
                    ).includes(field),
                };
            }

            let popupFormElement = null;
            let resetPending = false;

            function conditionMatches(condition) {
                if (!condition) return true;
                const input = getRequiredInput(condition.field);
                return (
                    input !== null &&
                    (input.type === "checkbox"
                        ? input.checked
                        : input.value) === condition.equals
                );
            }

            function currentRequiredFields() {
                return Object.entries(descriptors)
                    .filter(
                        ([field, descriptor]) =>
                            conditionMatches(descriptor.visibleWhen) &&
                            (descriptor.requiredWhen
                                ? conditionMatches(descriptor.requiredWhen)
                                : requiredFields.includes(field)),
                    )
                    .map(([field]) => field);
            }

            function fieldFilled(field) {
                const input = getRequiredInput(field);
                return (
                    input !== null &&
                    (input.value.trim() !== "" ||
                        (descriptors[field]?.configuredSecret &&
                            input.type === "password" &&
                            !resetPending))
                );
            }

            function getRequiredInput(field) {
                const input = popupFormElement?.querySelector(
                    `[name="${CSS.escape(field)}"]`,
                );
                return input instanceof HTMLInputElement ||
                    input instanceof HTMLSelectElement
                    ? input
                    : null;
            }

            function requiredAllFilled() {
                return currentRequiredFields().every(fieldFilled);
            }

            function updateRequiredHighlights() {
                const requiredTooltip = i18n.t(
                    "ui.app.admin.notif.required_field",
                );
                const currentRequiredSet = new Set(currentRequiredFields());
                const validationFieldSet = new Set(Object.keys(descriptors));
                for (const field of validationFieldSet) {
                    const input = getRequiredInput(field);
                    if (input === null) continue;
                    const label = input.closest("[data-provider-field]");
                    const isRequired = currentRequiredSet.has(field);
                    const visible = conditionMatches(
                        descriptors[field].visibleWhen,
                    );
                    if (label) label.hidden = !visible;
                    const isEmpty = !fieldFilled(field);
                    const isMissing = isRequired && isEmpty;
                    const requiresInput =
                        isRequired &&
                        !(
                            descriptors[field].configuredSecret &&
                            input.type === "password" &&
                            !resetPending &&
                            input.value === ""
                        );
                    input.toggleAttribute("required", requiresInput);
                    const requiredMarker = label?.querySelector(
                        `[data-provider-required="${CSS.escape(field)}"]`,
                    );
                    if (requiredMarker instanceof HTMLElement) {
                        requiredMarker.hidden = !isRequired;
                    }
                    if (label) {
                        label.classList.toggle(
                            "provider-field-required",
                            isMissing,
                        );
                        label.classList.toggle(
                            "provider-field-missing",
                            isMissing,
                        );
                        if (isMissing) {
                            label.setAttribute("title", requiredTooltip);
                        } else {
                            label.removeAttribute("title");
                        }
                    }
                }
            }

            await openSettingsPopup({
                title: name,
                body: renderGenericAdapterForm(
                    descriptors,
                    supportsTest ? (payload.testSchema ?? []) : null,
                ),
                maxWidth: "640px",
                actions: [
                    {
                        id: "save",
                        label: i18n.t("ui.app.admin.notif.save_settings"),
                        variant: "confirm",
                    },
                    ...(supportsReset
                        ? [
                              {
                                  id: "reset",
                                  label: i18n.t("ui.reuse.reset"),
                                  variant: "danger",
                              },
                          ]
                        : []),
                    {
                        id: "cancel",
                        label: i18n.t("ui.reuse.cancel"),
                        variant: "cancel",
                    },
                ],
                onAction: async (action, overlay) => {
                    if (action === "reset") {
                        if (!(popupFormElement instanceof HTMLElement))
                            return false;
                        loadConfigIntoForm(popupFormElement, environmentData);
                        resetPending = true;
                        return false;
                    }
                    if (action !== "save") return true;
                    if (!(popupFormElement instanceof HTMLElement))
                        return false;
                    updateRequiredHighlights();
                    const missingRequiredField = currentRequiredFields().find(
                        (field) => {
                            const input = getRequiredInput(field);
                            return !fieldFilled(field);
                        },
                    );
                    if (missingRequiredField) {
                        markPopupFieldInvalid(
                            overlay,
                            missingRequiredField,
                            i18n.t("ui.app.admin.notif.required_field"),
                        );
                        return false;
                    }
                    const config = buildConfigPayload(popupFormElement, {
                        omitBlankPasswords: true,
                    });
                    const saveResponse = await apiFetch(
                        configUrl,
                        resetPending
                            ? { method: "DELETE" }
                            : {
                                  method: "PUT",
                                  headers: {
                                      "content-type": "application/json",
                                  },
                                  body: JSON.stringify(config),
                              },
                    );
                    const savePayload = await (typeof saveResponse.clone ===
                    "function"
                        ? saveResponse
                              .clone()
                              .json()
                              .catch(() => ({}))
                        : saveResponse.json().catch(() => ({})));
                    if (!saveResponse.ok) {
                        const messageKey = savePayload?.error?.messageKey;
                        const message = messageKey
                            ? i18n.t(messageKey)
                            : i18n.t("ui.reuse.save_failed");
                        if (saveResponse.status === 400) {
                            const fieldId = resolveFieldErrorId(savePayload);
                            if (
                                markPopupFieldInvalid(overlay, fieldId, message)
                            ) {
                                return false;
                            }
                        }
                        showToast(i18n.t("ui.reuse.save_failed"), {
                            variant: "error",
                        });
                        return false;
                    }
                    await onSaved?.();
                    showToast(i18n.t("ui.app.admin.settings_saved"), {
                        variant: "success",
                    });
                    return true;
                },
                closeProtection: true,
                onOpen: (overlay) => {
                    popupFormElement = overlay.querySelector(
                        ".provider-popup-form",
                    );
                    if (!popupFormElement) return;

                    const toggle = popupFormElement.querySelector(
                        ".provider-enable-toggle",
                    );
                    if (!toggle) return;

                    function syncToggle() {
                        const areAllRequiredFieldsFilled = requiredAllFilled();
                        toggle.disabled =
                            adapterLocked || !areAllRequiredFieldsFilled;
                        if (!areAllRequiredFieldsFilled) {
                            toggle.checked = false;
                        }
                    }

                    if (requiredAllFilled()) {
                        toggle.disabled = Boolean(adapterLocked);
                        toggle.checked = Boolean(adapterEnabled);
                    }

                    updateRequiredHighlights();
                    syncToggle();

                    popupFormElement.addEventListener("input", () => {
                        resetPending = false;
                        updateRequiredHighlights();
                        syncToggle();
                    });

                    const testButton =
                        popupFormElement.querySelector(".provider-test-btn");
                    if (testButton && testUrl) {
                        testButton.addEventListener("click", async () => {
                            const testFields = [
                                ...popupFormElement.querySelectorAll(
                                    "[data-provider-test-field]",
                                ),
                            ];
                            if (
                                testFields.some(
                                    (field) =>
                                        !field.reportValidity() ||
                                        !field.value.trim(),
                                )
                            )
                                return;
                            const testValues = Object.fromEntries(
                                testFields.map((field) => [
                                    field.name,
                                    field.value.trim(),
                                ]),
                            );
                            const config = buildConfigPayload(
                                popupFormElement,
                                {
                                    omitBlankPasswords: true,
                                },
                            );
                            const testResponse = await apiFetch(testUrl, {
                                method: "POST",
                                headers: {
                                    "content-type": "application/json",
                                },
                                body: JSON.stringify({ ...testValues, config }),
                            });
                            showToast(
                                testResponse.ok
                                    ? i18n.t("ui.app.admin.notif.test_sent")
                                    : i18n.t("ui.app.admin.notif.test_failed"),
                                {
                                    variant: testResponse.ok
                                        ? "success"
                                        : "error",
                                },
                            );
                        });
                    }
                },
            });
            return true;
        },
    };
}

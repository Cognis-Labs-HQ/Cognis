import {
    markPopupFieldInvalid,
    resolveFieldErrorId,
} from "../../reuse/popup.js";

export function createAdapterConfigPopup({
    i18n,
    escapeHtml,
    apiFetch,
    openPopup,
    showToast,
}) {
    /**
     * Maps a raw backend field name to a human-readable label using existing
     * i18n keys. Falls back to converting camelCase to Title Case for unknown
     * fields.
     *
     * @param {string} name
     * @returns {string}
     */
    function fieldNameToLabel(name) {
        const knownLabels = {
            host: i18n.t("ui.app.admin.notif.smtp_host"),
            port: i18n.t("ui.app.admin.notif.smtp_port"),
            from: i18n.t("ui.app.admin.notif.smtp_from"),
            senderName: i18n.t("ui.app.admin.notif.smtp_sender_name"),
            user: i18n.t("ui.app.admin.notif.smtp_user"),
            password: i18n.t("ui.app.admin.notif.smtp_password"),
            secure: i18n.t("ui.app.admin.notif.smtp_secure"),
            allowSelfSigned: i18n.t(
                "ui.app.admin.notif.smtp_allow_self_signed",
            ),
            authDisabled: i18n.t("ui.app.admin.notif.smtp_auth_disabled"),
            codeLength: i18n.t("ui.app.admin.notif.smtp_code_length"),
        };
        if (knownLabels[name]) return knownLabels[name];
        return name
            .replace(/([A-Z])/g, " $1")
            .replace(/^./, (character) => character.toUpperCase())
            .trim();
    }

    function renderGenericAdapterForm(
        descriptors,
        requiredFields,
        showTestControls,
    ) {
        const requiredSet = new Set(requiredFields);
        const requiredTooltip = i18n.t("ui.app.admin.notif.required_field");
        const conflictTitle = i18n.t("ui.app.admin.notif.field_env_conflict");

        function fieldLabel(name, labelText, inputHtml) {
            const descriptor = descriptors[name];
            const isRequired = requiredSet.has(name);
            const requiredMarker = `<span class="provider-required-flag" data-provider-required="${escapeHtml(name)}" aria-hidden="true"${isRequired ? "" : " hidden"}>*</span>`;
            const isEmpty = !descriptor?.effectiveValue;
            const hasConflict = descriptor?.envConflict === true;
            const requiredClass =
                isRequired && isEmpty
                    ? " provider-field-required provider-field-missing"
                    : "";
            const labelTitle =
                isRequired && isEmpty ? ` title="${requiredTooltip}"` : "";
            const conflictWarning = hasConflict
                ? `<span class="provider-field-env-warning" title="${conflictTitle}">⚠</span>`
                : "";
            return `<label class="provider-popup-field${requiredClass}"${labelTitle}><span class="provider-field-title">${escapeHtml(labelText)}${requiredMarker}${conflictWarning}</span>${inputHtml}</label>`;
        }

        const fieldKeys = Object.keys(descriptors).filter(
            (name) => name !== "enabled",
        );

        const authFieldNames = new Set(["user", "password"]);

        const selectFieldKeys = fieldKeys.filter(
            (name) => descriptors[name]?.schemaType === "select",
        );

        const textFieldKeys = fieldKeys.filter((name) => {
            if (name === "secure") return false;
            if (name === "authDisabled") return false;
            if (descriptors[name]?.schemaType === "select") return false;
            const rawValue = descriptors[name]?.effectiveValue;
            return !(
                rawValue === true ||
                rawValue === false ||
                rawValue === "true" ||
                rawValue === "false"
            );
        });

        const boolFieldKeys = fieldKeys.filter((name) => {
            if (name === "secure") return false;
            if (authFieldNames.has(name)) return false;
            if (descriptors[name]?.schemaType === "select") return false;
            const rawValue = descriptors[name]?.effectiveValue;
            return (
                rawValue === true ||
                rawValue === false ||
                rawValue === "true" ||
                rawValue === "false"
            );
        });

        const hasSecure = "secure" in descriptors;
        const authFieldKeys = textFieldKeys.filter((name) =>
            authFieldNames.has(name),
        );
        const nonAuthTextFieldKeys = textFieldKeys.filter(
            (name) => !authFieldNames.has(name),
        );

        const selectFieldsHtml = selectFieldKeys
            .map((name) => {
                const descriptor = descriptors[name];
                const value = descriptor?.effectiveValue ?? "";
                const options = Array.isArray(descriptor?.schemaOptions)
                    ? descriptor.schemaOptions
                    : [];
                const label = descriptor?.schemaLabel ?? fieldNameToLabel(name);
                const optionsHtml = options
                    .map(
                        (option) =>
                            `<option value="${escapeHtml(String(option))}"${value === String(option) ? " selected" : ""}>${escapeHtml(String(option))}</option>`,
                    )
                    .join("");
                return fieldLabel(
                    name,
                    label,
                    `<select id="${escapeHtml(name)}" name="${escapeHtml(name)}" class="theme-select">${optionsHtml}</select>`,
                );
            })
            .join("");

        const secureFieldHtml = hasSecure
            ? (() => {
                  const value = descriptors["secure"]?.effectiveValue ?? "none";
                  return fieldLabel(
                      "secure",
                      fieldNameToLabel("secure"),
                      `<select id="secure" name="secure" class="theme-select">
                <option value="none"${value === "none" ? " selected" : ""}>${i18n.t("ui.app.admin.notif.smtp_secure_none")}</option>
                <option value="starttls"${value === "starttls" ? " selected" : ""}>${i18n.t("ui.app.admin.notif.smtp_secure_starttls")}</option>
                <option value="tls"${value === "tls" ? " selected" : ""}>${i18n.t("ui.app.admin.notif.smtp_secure_tls")}</option>
              </select>`,
                  );
              })()
            : "";

        const nonAuthFieldsHtml = nonAuthTextFieldKeys
            .map((name) => {
                const descriptor = descriptors[name];
                const value = escapeHtml(descriptor?.effectiveValue ?? "");
                const isPassword =
                    name.toLowerCase().includes("password") ||
                    name.toLowerCase().includes("secret");
                const isPort =
                    name === "port" || name.toLowerCase().endsWith("port");
                const isNumber = isPort || name === "codeLength";
                const usesNumberInput =
                    isNumber || descriptor?.schemaType === "number";

                let inputHtml;
                if (isPassword) {
                    inputHtml = `<input id="${escapeHtml(name)}" name="${escapeHtml(name)}" type="password" value="" />`;
                } else if (usesNumberInput) {
                    inputHtml = `<input id="${escapeHtml(name)}" name="${escapeHtml(name)}" type="number" value="${value}" />`;
                } else {
                    inputHtml = `<input id="${escapeHtml(name)}" name="${escapeHtml(name)}" type="text" value="${value}" />`;
                }

                return fieldLabel(name, fieldNameToLabel(name), inputHtml);
            })
            .join("");

        const authFieldsHtml = authFieldKeys
            .map((name) => {
                const descriptor = descriptors[name];
                const value = escapeHtml(descriptor?.effectiveValue ?? "");
                const inputHtml =
                    name === "password"
                        ? `<input id="${escapeHtml(name)}" name="${escapeHtml(name)}" type="password" value="" />`
                        : `<input id="${escapeHtml(name)}" name="${escapeHtml(name)}" type="text" value="${value}" />`;
                return fieldLabel(name, fieldNameToLabel(name), inputHtml);
            })
            .join("");

        const authFieldsBlock =
            authFieldKeys.length > 0
                ? `<div class="provider-auth-fields">${authFieldsHtml}</div>`
                : "";

        const boolFieldsHtml = boolFieldKeys.length
            ? `<div class="provider-option-toggles">${boolFieldKeys
                  .map((name) => {
                      const rawValue = descriptors[name]?.effectiveValue;
                      const checked =
                          rawValue === true || rawValue === "true"
                              ? " checked"
                              : "";
                      const isAuthDisabled = name === "authDisabled";
                      return `<div class="provider-option-row${isAuthDisabled ? " provider-auth-toggle-row" : ""}">
          <span class="provider-option-label">${escapeHtml(fieldNameToLabel(name))}</span>
          <label class="switch">
            <input id="${escapeHtml(name)}" name="${escapeHtml(name)}" type="checkbox"${checked} />
            <span class="slider"></span>
          </label>
        </div>`;
                  })
                  .join("")}</div>`
            : "";

        return `
    <div class="provider-popup-form">
      <div class="provider-popup-toggle-row">
        <span class="provider-popup-toggle-label">${i18n.t("ui.app.admin.notif.enable_provider")}</span>
        <label class="switch provider-popup-switch">
          <input id="enabled" type="checkbox" name="enabled" class="provider-enable-toggle" disabled />
          <span class="slider"></span>
        </label>
      </div>
      <div class="provider-fields">
        ${selectFieldsHtml}
        ${secureFieldHtml}
        ${nonAuthFieldsHtml}
      </div>
      ${authFieldsBlock}
      ${boolFieldsHtml}
      ${
          showTestControls
              ? `<div class="provider-test-row">
        <input class="provider-test-input" type="email" placeholder="${escapeHtml(i18n.t("ui.app.admin.notif.test_email_to"))}" />
        <button class="btn-animated provider-test-btn" type="button">${i18n.t("ui.app.admin.notif.test_email")}</button>
      </div>`
              : ""
      }
    </div>
  `;
    }

    function buildConfigPayload(
        popupFormEl,
        { omitBlankPasswords = false } = {},
    ) {
        const config = {};
        popupFormEl.querySelectorAll("[name]").forEach((field) => {
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
                    field.type === "number" ? Number(field.value) : field.value;
                return;
            }
            if (field instanceof HTMLSelectElement) {
                config[field.name] = field.value;
            }
        });
        return config;
    }

    return {
        async openAdapterConfig(name, { configUrl, testUrl, onSaved } = {}) {
            if (!configUrl) return;
            const response = await apiFetch(configUrl);
            if (!response.ok) return;
            const payload = await response.json();
            const configPopupScriptUrl = String(
                payload.configPopupScriptUrl ?? "",
            ).trim();
            if (configPopupScriptUrl) {
                const extension = await import(configPopupScriptUrl).catch(
                    () => null,
                );
                if (typeof extension?.openAdapterConfig !== "function") {
                    showToast(i18n.t("ui.reuse.load_failed"), {
                        variant: "error",
                    });
                    return;
                }
                await extension.openAdapterConfig({
                    configUrl,
                    configPayload: payload,
                    onSaved,
                    i18n,
                    escapeHtml,
                    apiFetch,
                    openPopup,
                    showToast,
                    buildConfigPayload,
                    fieldNameToLabel,
                });
                return;
            }
            const dbData = payload.data ?? {};
            const envData = payload.envValues ?? {};
            const requiredFields = Array.isArray(payload.requiredFields)
                ? payload.requiredFields
                : [];
            const supportsTest = payload.supportsTest === true;
            const supportsReset = payload.supportsReset === true;
            const schemaFields = Array.isArray(payload.schema)
                ? payload.schema
                : [];

            const fieldNames = new Set([
                ...Object.keys(dbData),
                ...Object.keys(envData),
                ...requiredFields,
                ...schemaFields.map((field) => field.key),
            ]);
            const descriptors = {};
            for (const field of fieldNames) {
                const rawDb = dbData[field];
                const rawEnv = envData[field];
                const dbValue =
                    rawDb != null && rawDb !== "" ? String(rawDb) : undefined;
                const envValue =
                    rawEnv != null && rawEnv !== ""
                        ? String(rawEnv)
                        : undefined;
                let effectiveValue;
                let source;
                if (dbValue !== undefined) {
                    effectiveValue = dbValue;
                    source = "db";
                } else if (envValue !== undefined) {
                    effectiveValue = envValue;
                    source = "env";
                } else {
                    effectiveValue = undefined;
                    source = "none";
                }
                const schemaEntry = schemaFields.find(
                    (entry) => entry.key === field,
                );
                descriptors[field] = {
                    dbValue,
                    envValue,
                    effectiveValue,
                    source,
                    envConflict:
                        dbValue !== undefined &&
                        envValue !== undefined &&
                        dbValue !== envValue,
                    required: requiredFields.includes(field),
                    schemaType: schemaEntry?.type ?? null,
                    schemaLabel: schemaEntry?.label ?? null,
                    schemaOptions: schemaEntry?.options ?? null,
                };
            }

            let popupFormEl = null;

            function currentRequiredFields() {
                const authDisabledInput = popupFormEl?.querySelector(
                    '[name="authDisabled"]',
                );
                const isAuthDisabled =
                    authDisabledInput instanceof HTMLInputElement &&
                    authDisabledInput.checked;
                const currentFields = new Set(
                    requiredFields.filter(
                        (field) =>
                            !isAuthDisabled ||
                            (field !== "user" && field !== "password"),
                    ),
                );
                if (!isAuthDisabled) {
                    for (const authField of ["user", "password"]) {
                        if (authField in descriptors) {
                            currentFields.add(authField);
                        }
                    }
                }
                return [...currentFields];
            }

            function getRequiredInput(field) {
                const input = popupFormEl?.querySelector(
                    `[name="${CSS.escape(field)}"]`,
                );
                return input instanceof HTMLInputElement ? input : null;
            }

            function requiredAllFilled() {
                return currentRequiredFields().every((field) => {
                    const input = getRequiredInput(field);
                    return input !== null && input.value.trim() !== "";
                });
            }

            function updateRequiredHighlights() {
                const requiredTooltip = i18n.t(
                    "ui.app.admin.notif.required_field",
                );
                const currentRequiredSet = new Set(currentRequiredFields());
                const validationFieldSet = new Set(requiredFields);
                for (const authField of ["user", "password"]) {
                    if (authField in descriptors) {
                        validationFieldSet.add(authField);
                    }
                }
                for (const field of validationFieldSet) {
                    const input = getRequiredInput(field);
                    if (input === null) continue;
                    const label = input.closest("label");
                    const isRequired = currentRequiredSet.has(field);
                    const isEmpty = input.value.trim() === "";
                    const isMissing = isRequired && isEmpty;
                    input.toggleAttribute("required", isRequired);
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

            await openPopup({
                title: name,
                body: renderGenericAdapterForm(
                    descriptors,
                    requiredFields,
                    supportsTest,
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
                        const resetResponse = await apiFetch(configUrl, {
                            method: "DELETE",
                        });
                        if (!resetResponse.ok) {
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
                    }
                    if (action !== "save") return true;
                    if (!(popupFormEl instanceof HTMLElement)) return false;
                    updateRequiredHighlights();
                    const missingRequiredField = currentRequiredFields().find(
                        (field) => {
                            const input = getRequiredInput(field);
                            return input === null || input.value.trim() === "";
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
                    const config = buildConfigPayload(popupFormEl);
                    const saveResponse = await apiFetch(configUrl, {
                        method: "PUT",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify(config),
                    });
                    const savePayload = await (typeof saveResponse.clone ===
                    "function"
                        ? saveResponse
                              .clone()
                              .json()
                              .catch(() => ({}))
                        : saveResponse.json().catch(() => ({})));
                    if (!saveResponse.ok) {
                        const message =
                            savePayload?.error?.message ??
                            i18n.t("ui.reuse.save_failed");
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
                    popupFormEl = overlay.querySelector(".provider-popup-form");
                    if (!popupFormEl) return;

                    const toggle = popupFormEl.querySelector(
                        ".provider-enable-toggle",
                    );
                    if (!toggle) return;

                    function syncToggle() {
                        const areAllRequiredFieldsFilled = requiredAllFilled();
                        toggle.disabled = !areAllRequiredFieldsFilled;
                        if (!areAllRequiredFieldsFilled) {
                            toggle.checked = false;
                        }
                    }

                    const enabledValue = descriptors["enabled"]?.effectiveValue;
                    const isEnabledByConfig =
                        enabledValue !== "false" && enabledValue !== false;
                    if (requiredAllFilled()) {
                        toggle.disabled = false;
                        toggle.checked = isEnabledByConfig;
                    }

                    updateRequiredHighlights();
                    syncToggle();

                    popupFormEl.addEventListener("input", () => {
                        updateRequiredHighlights();
                        syncToggle();
                    });

                    const authDisabledCheckbox = popupFormEl.querySelector(
                        '[name="authDisabled"]',
                    );
                    const authFieldsEl = popupFormEl.querySelector(
                        ".provider-auth-fields",
                    );
                    if (
                        authDisabledCheckbox instanceof HTMLInputElement &&
                        authFieldsEl instanceof HTMLElement
                    ) {
                        const isAuthOff = authDisabledCheckbox.checked;
                        authFieldsEl.style.display = isAuthOff ? "none" : "";
                        authDisabledCheckbox.addEventListener("change", () => {
                            authFieldsEl.style.display =
                                authDisabledCheckbox.checked ? "none" : "";
                            updateRequiredHighlights();
                            syncToggle();
                        });
                    }

                    const testButton =
                        popupFormEl.querySelector(".provider-test-btn");
                    const testInput = popupFormEl.querySelector(
                        ".provider-test-input",
                    );

                    if (testButton && testInput && testUrl) {
                        testButton.addEventListener("click", async () => {
                            const recipient =
                                testInput instanceof HTMLInputElement
                                    ? testInput.value.trim()
                                    : "";
                            if (!recipient) {
                                showToast(
                                    i18n.t(
                                        "ui.app.admin.notif.test_email_required",
                                    ),
                                    {
                                        variant: "error",
                                    },
                                );
                                return;
                            }
                            const config = buildConfigPayload(popupFormEl, {
                                omitBlankPasswords: true,
                            });
                            const testResponse = await apiFetch(testUrl, {
                                method: "POST",
                                headers: {
                                    "content-type": "application/json",
                                },
                                body: JSON.stringify({ to: recipient, config }),
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
        },
    };
}

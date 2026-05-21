/**
 * Reusable form builder and validator for dashboard and auth pages.
 *
 * Builds form markup from a structured field schema and attaches runtime
 * validation, required markers, invalid-state styling, and optional
 * per-criterion status alerts.
 *
 * Public exports:
 *   createFormBuilder(ctx, options) — returns a builder that can render form
 *     HTML and attach controllers for validation/value collection.
 *
 * Usage:
 *   const formBuilder = createFormBuilder(
 *     { i18n, escapeHtml },
 *     {
 *       formId: 'register-form',
 *       submitLabelKey: 'ui.app.register.submit',
 *       fields: [
 *         {
 *           name: 'username',
 *           labelKey: 'ui.app.register.username',
 *           required: true,
 *           criteria: [
 *             {
 *               id: 'username-max',
 *               type: 'maxLength',
 *               value: 25,
 *               messageKey: 'ui.app.register.error.username_too_long',
 *             },
 *           ],
 *         },
 *       ],
 *     },
 *   );
 *   const html = formBuilder.render();
 *   const controller = formBuilder.attach(document.querySelector('#register-form'));
 *
 * @param {{ i18n: { t: (key: string) => string }, escapeHtml: (value: string) => string }} ctx
 * @param {{
 *   formId: string,
 *   formClassName?: string,
 *   submitButtonClassName?: string,
 *   submitLabelKey: string,
 *   fields: Array<{
 *     name: string,
 *     labelKey: string,
 *     type?: 'text'|'email'|'password'|'number'|'select',
 *     required?: boolean,
 *     disabled?: boolean,
 *     value?: string,
 *     className?: string,
 *     options?: Array<{ value: string, label: string, selected?: boolean }>,
 *     floatingTitleKey?: string,
 *     attributes?: Record<string, string|number|boolean>,
 *     criteria?: Array<{
 *       id: string,
 *       type?: 'maxLength'|'pattern'|'custom',
 *       value?: number|RegExp|string,
 *       test?: (value: string, fieldValues: Record<string, string>) => boolean,
 *       messageKey: string,
 *       messageParams?: Record<string, string|number>,
 *       mode?: 'live'|'submit',
 *     }>,
 *     criteriaDisplay?: 'inline'|'floating-alert',
 *   }>,
 * }} options
 * @returns {{ render: () => string, attach: (formElement: HTMLFormElement, attachOptions?: { signal?: AbortSignal }) => { validateField: (fieldName: string, forceTouched?: boolean) => boolean, validateAll: (forceTouched?: boolean) => boolean, getValues: () => Record<string, string>, detach: () => void } }}
 */
export function createFormBuilder(ctx, options) {
    const i18n = ctx?.i18n;
    const escapeHtml = ctx?.escapeHtml;
    const fields = Array.isArray(options?.fields) ? options.fields : [];
    const formId = String(options?.formId ?? "").trim();
    const formClassName = String(options?.formClassName ?? "").trim();
    const submitButtonClassName = String(
        options?.submitButtonClassName ?? "btn-confirm btn-animated",
    ).trim();
    const submitLabelKey = String(
        options?.submitLabelKey ?? "ui.reuse.save",
    ).trim();

    function renderAttribute(name, value) {
        if (value === true) {
            return ` ${escapeHtml(name)}`;
        }
        if (value === false || value == null) {
            return "";
        }
        return ` ${escapeHtml(name)}="${escapeHtml(String(value))}"`;
    }

    function resolveMessage(messageKey, messageParams = {}) {
        let translatedMessage = i18n.t(messageKey);
        for (const [parameterKey, parameterValue] of Object.entries(
            messageParams,
        )) {
            translatedMessage = translatedMessage.replace(
                `{${parameterKey}}`,
                String(parameterValue),
            );
        }
        return translatedMessage;
    }

    function renderField(fieldConfig) {
        const fieldName = String(fieldConfig?.name ?? "").trim();
        if (!fieldName) {
            return "";
        }
        const type = String(fieldConfig?.type ?? "text").trim();
        const inputId = `form-builder-${fieldName}`;
        const label = i18n.t(fieldConfig.labelKey);
        const required = fieldConfig.required === true;
        const disabled = fieldConfig.disabled === true;
        const value =
            fieldConfig.value == null ? "" : String(fieldConfig.value);
        const className = String(fieldConfig.className ?? "").trim();
        const fieldClassName = className
            ? `form-builder-field ${className}`
            : "form-builder-field";
        const criteriaDisplay =
            fieldConfig.criteriaDisplay === "floating-alert"
                ? "floating-alert"
                : "inline";
        const floatingTitle = fieldConfig.floatingTitleKey
            ? resolveMessage(fieldConfig.floatingTitleKey)
            : "";

        const attributes = [];
        for (const [attributeName, attributeValue] of Object.entries(
            fieldConfig.attributes ?? {},
        )) {
            attributes.push(renderAttribute(attributeName, attributeValue));
        }
        if (required) {
            attributes.push(renderAttribute("required", true));
        }
        if (disabled) {
            attributes.push(renderAttribute("disabled", true));
        }

        const requiredFlag = required
            ? `<p class="form-builder-required-flag" data-form-builder-required="${escapeHtml(fieldName)}">*</p>`
            : "";

        const criteriaItems = (
            Array.isArray(fieldConfig.criteria) ? fieldConfig.criteria : []
        )
            .map((criterionConfig) => {
                const criterionId = String(criterionConfig?.id ?? "").trim();
                if (!criterionId) {
                    return "";
                }
                return `<li class="form-builder-criterion-item" data-form-builder-criterion="${escapeHtml(fieldName)}:${escapeHtml(criterionId)}">${escapeHtml(resolveMessage(criterionConfig.messageKey, criterionConfig.messageParams))}</li>`;
            })
            .join("");

        const floatingAlert =
            criteriaDisplay === "floating-alert" && criteriaItems
                ? `<div class="form-builder-floating-alert" data-form-builder-floating="${escapeHtml(fieldName)}">${floatingTitle ? `<p class="form-builder-floating-title">${escapeHtml(floatingTitle)}</p>` : ""}<ul class="form-builder-criteria-list">${criteriaItems}</ul></div>`
                : "";

        const inlineCriteria =
            criteriaDisplay === "inline" && criteriaItems
                ? `<ul class="form-builder-criteria-list form-builder-criteria-list--inline">${criteriaItems}</ul>`
                : "";

        const inputMarkup =
            type === "select"
                ? `<select id="${escapeHtml(inputId)}" name="${escapeHtml(fieldName)}" class="form-builder-input"${attributes.join("")}>
            ${(Array.isArray(fieldConfig.options) ? fieldConfig.options : [])
                .map((optionConfig) => {
                    const optionValue = String(optionConfig?.value ?? "");
                    const optionLabel = String(optionConfig?.label ?? "");
                    const isSelected =
                        optionConfig?.selected === true ||
                        optionValue === value;
                    return `<option value="${escapeHtml(optionValue)}"${isSelected ? " selected" : ""}>${escapeHtml(optionLabel)}</option>`;
                })
                .join("")}
          </select>`
                : `<input
          id="${escapeHtml(inputId)}"
          name="${escapeHtml(fieldName)}"
          type="${escapeHtml(type)}"
          class="form-builder-input"
          value="${escapeHtml(value)}"${attributes.join("")}
        />`;

        return `
      <label class="${fieldClassName}" data-form-builder-field="${escapeHtml(fieldName)}">
        <span>${escapeHtml(label)}</span>
        ${inputMarkup}
        ${requiredFlag}
        ${inlineCriteria}
        ${floatingAlert}
      </label>
    `;
    }

    function render() {
        const renderedFields = fields
            .map((fieldConfig) => renderField(fieldConfig))
            .join("");
        const formClassAttribute = formClassName ? ` ${formClassName}` : "";
        return `
      <form id="${escapeHtml(formId)}" class="form-builder stack${formClassAttribute}">
        ${renderedFields}
        <button type="submit" class="${escapeHtml(submitButtonClassName)}">${escapeHtml(i18n.t(submitLabelKey))}</button>
      </form>
    `;
    }

    function createFieldValues(formElement) {
        const fieldValues = {};
        for (const fieldConfig of fields) {
            const fieldName = String(fieldConfig?.name ?? "").trim();
            if (!fieldName) {
                continue;
            }
            const fieldInput = formElement.elements.namedItem(fieldName);
            fieldValues[fieldName] =
                fieldInput instanceof HTMLInputElement ||
                fieldInput instanceof HTMLSelectElement
                    ? String(fieldInput.value ?? "")
                    : "";
        }
        return fieldValues;
    }

    function evaluateCriterion(criterionConfig, value, fieldValues) {
        if (criterionConfig?.type === "maxLength") {
            const maxLength = Number(criterionConfig.value ?? 0);
            return Number.isFinite(maxLength)
                ? value.length <= maxLength
                : true;
        }
        if (criterionConfig?.type === "pattern") {
            if (criterionConfig.value instanceof RegExp) {
                return criterionConfig.value.test(value);
            }
            if (typeof criterionConfig.value === "string") {
                const patternExpression = new RegExp(criterionConfig.value);
                return patternExpression.test(value);
            }
            return true;
        }
        if (
            criterionConfig?.type === "custom" ||
            typeof criterionConfig?.test === "function"
        ) {
            return criterionConfig.test?.(value, fieldValues) !== false;
        }
        return true;
    }

    function attach(formElement, attachOptions = {}) {
        const touchedFieldNames = new Set();

        function updateCriterionVisualState(
            fieldName,
            fieldConfig,
            fieldValue,
            fieldValues,
            shouldForceEvaluation,
        ) {
            const criteria = Array.isArray(fieldConfig.criteria)
                ? fieldConfig.criteria
                : [];
            let allCriteriaValid = true;
            for (const criterionConfig of criteria) {
                const criterionId = String(criterionConfig?.id ?? "").trim();
                if (!criterionId) {
                    continue;
                }
                const criterionElement = formElement.querySelector(
                    `[data-form-builder-criterion="${fieldName}:${criterionId}"]`,
                );
                if (!(criterionElement instanceof HTMLElement)) {
                    continue;
                }
                const criterionMode =
                    criterionConfig.mode === "submit" ? "submit" : "live";
                const shouldEvaluateCriterion =
                    shouldForceEvaluation || criterionMode === "live";
                const criterionValid = shouldEvaluateCriterion
                    ? evaluateCriterion(
                          criterionConfig,
                          fieldValue,
                          fieldValues,
                      )
                    : true;
                criterionElement.classList.toggle(
                    "form-builder-criterion-item--met",
                    criterionValid,
                );
                criterionElement.classList.toggle(
                    "form-builder-criterion-item--unmet",
                    !criterionValid,
                );
                if (!criterionValid) {
                    allCriteriaValid = false;
                }
            }
            return allCriteriaValid;
        }

        function validateField(fieldName, forceTouched = false) {
            if (forceTouched) {
                touchedFieldNames.add(fieldName);
            }
            const fieldConfig = fields.find(
                (entry) => entry.name === fieldName,
            );
            if (!fieldConfig) {
                return true;
            }
            const fieldInput = formElement.elements.namedItem(fieldName);
            if (
                !(fieldInput instanceof HTMLInputElement) &&
                !(fieldInput instanceof HTMLSelectElement)
            ) {
                return true;
            }
            const fieldValues = createFieldValues(formElement);
            const fieldValue = String(fieldInput.value ?? "");
            const required = fieldConfig.required === true;
            const fieldHasValue = fieldValue.trim().length > 0;
            const shouldEvaluateNow =
                forceTouched ||
                touchedFieldNames.has(fieldName) ||
                fieldValue.length > 0;
            const criteriaValid = updateCriterionVisualState(
                fieldName,
                fieldConfig,
                fieldValue,
                fieldValues,
                shouldEvaluateNow,
            );
            const fieldValid =
                (!required || fieldHasValue) &&
                (!shouldEvaluateNow || criteriaValid);
            const fieldWrapper = formElement.querySelector(
                `[data-form-builder-field="${fieldName}"]`,
            );
            if (fieldWrapper instanceof HTMLElement) {
                fieldWrapper.classList.toggle(
                    "form-builder-field--invalid",
                    !fieldValid,
                );
                fieldWrapper.classList.toggle(
                    "form-builder-field--required-empty",
                    required && !fieldHasValue,
                );
            }
            fieldInput.classList.toggle(
                "form-builder-input--invalid",
                !fieldValid,
            );
            return fieldValid;
        }

        function validateAll(forceTouched = false) {
            return fields.every((fieldConfig) =>
                validateField(fieldConfig.name, forceTouched),
            );
        }

        const listenerOptions = attachOptions.signal
            ? { signal: attachOptions.signal }
            : undefined;

        for (const fieldConfig of fields) {
            const fieldName = String(fieldConfig?.name ?? "").trim();
            if (!fieldName) {
                continue;
            }
            const fieldInput = formElement.elements.namedItem(fieldName);
            if (
                !(fieldInput instanceof HTMLInputElement) &&
                !(fieldInput instanceof HTMLSelectElement)
            ) {
                continue;
            }
            fieldInput.addEventListener(
                "input",
                () => {
                    if (String(fieldInput.value ?? "").length > 0) {
                        touchedFieldNames.add(fieldName);
                    }
                    validateField(fieldName, false);
                },
                listenerOptions,
            );
            fieldInput.addEventListener(
                "change",
                () => {
                    if (String(fieldInput.value ?? "").length > 0) {
                        touchedFieldNames.add(fieldName);
                    }
                    validateField(fieldName, false);
                },
                listenerOptions,
            );
            fieldInput.addEventListener(
                "blur",
                () => {
                    touchedFieldNames.add(fieldName);
                    validateField(fieldName, true);
                },
                listenerOptions,
            );
        }

        return {
            validateField,
            validateAll,
            getValues: () => createFieldValues(formElement),
            detach: () => undefined,
        };
    }

    return {
        render,
        attach,
    };
}

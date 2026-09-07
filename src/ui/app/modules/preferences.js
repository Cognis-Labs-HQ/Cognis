import { escapeHtml } from "../../reuse/escape-html.js";
import { openPopup } from "../../reuse/popup.js";
import { renderInfoTooltip } from "../../reuse/info-tooltip.js";
import { createFormBuilder } from "../../reuse/form-builder.js";
import { extendI18n } from "../../reuse/i18n.js";
import { loadModuleConfig, saveModuleConfig } from "./api.js";

export function missingRequiredModulePreferenceKeys(definitions, values) {
    return definitions
        .filter((definition) => definition.required)
        .filter((definition) => {
            const value = values?.[definition.key];
            if (
                definition.type === "password" &&
                values?.[`${definition.key}Configured`] === true
            ) {
                return false;
            }
            if (definition.type === "boolean")
                return typeof value !== "boolean";
            if (definition.type === "number") {
                return typeof value !== "number" || !Number.isFinite(value);
            }
            return typeof value !== "string" || value.trim().length === 0;
        })
        .map((definition) => definition.key);
}

export async function assertRequiredModulePreferences(
    module,
    message,
    loadConfig = loadModuleConfig,
) {
    const definitions = module.ui?.preferences ?? [];
    if (!definitions.some((definition) => definition.required)) return true;
    let values;
    try {
        values = await loadConfig(module.id);
    } catch (error) {
        if (error?.status === 404) return false;
        throw error;
    }
    const missingKeys = missingRequiredModulePreferenceKeys(
        definitions,
        values,
    );
    if (!missingKeys.length) return true;
    const error = new Error(message);
    error.code = "module_config_required";
    error.missingKeys = missingKeys;
    throw error;
}

export function readModulePreferenceValues(
    form,
    definitions,
    { preservePasswordMask = false } = {},
) {
    return Object.fromEntries(
        definitions.map((definition) => {
            const input = form.elements.namedItem(definition.key);
            let value =
                definition.type === "boolean"
                    ? input.checked
                    : definition.type === "number"
                      ? Number(input.value)
                      : input.value;
            if (definition.type === "password" && value === "****") {
                value = preservePasswordMask ? value : "";
            }
            return [definition.key, value];
        }),
    );
}

export async function openModulePreferences(module, labels) {
    const definitions = module.ui?.preferences ?? [];
    if (!definitions.length) return;
    const values = await loadModuleConfig(module.id);
    const moduleI18n = await extendI18n(labels.i18n, module.ui?.stringsBaseUrl);
    const localizedDefinitions = definitions.map((definition) => ({
        ...definition,
        label: moduleI18n.t(definition.labelKey),
        description: definition.descriptionKey
            ? moduleI18n.t(definition.descriptionKey)
            : undefined,
    }));
    const fieldValue = (definition) => {
        const value = values?.[definition.key] ?? definition.default ?? "";
        if (
            definition.type === "password" &&
            !value &&
            values?.[`${definition.key}Configured`] === true
        ) {
            return "****";
        }
        return value;
    };
    const formBuilder = createFormBuilder(
        { i18n: moduleI18n, escapeHtml, renderInfoTooltip },
        {
            formId: "module-preferences-form",
            formClassName: "module-settings-popup-fields",
            includeSubmitButton: false,
            fields: localizedDefinitions.map((definition) => ({
                name: definition.key,
                label: definition.label,
                type:
                    definition.type === "boolean"
                        ? "checkbox"
                        : definition.type,
                secret: definition.type === "password",
                required:
                    definition.required === true &&
                    definition.type !== "boolean",
                value: String(fieldValue(definition)),
                infoTooltip: definition.description
                    ? {
                          text: definition.description,
                          ariaLabel: labels.information,
                          id: `module-preference-${definition.key}-descriptor`,
                      }
                    : undefined,
            })),
        },
    );
    let formController;
    let savedValues = null;
    const action = await openPopup({
        title: labels.title,
        body: formBuilder.render(),
        actions: [
            { id: "save", label: labels.save, variant: "confirm" },
            { id: "cancel", label: labels.cancel, variant: "neutral" },
        ],
        closeProtection: true,
        onOpen: (overlay) => {
            const form = overlay.querySelector("#module-preferences-form");
            formController = formBuilder.attach(form);
        },
        onAction: async (action, overlay) => {
            if (action !== "save") return;
            if (!formController?.validateAll(true)) return false;
            const form = overlay.querySelector("#module-preferences-form");
            const submittedValues = readModulePreferenceValues(
                form,
                localizedDefinitions,
            );
            savedValues = readModulePreferenceValues(
                form,
                localizedDefinitions,
                { preservePasswordMask: true },
            );
            await saveModuleConfig(module.id, submittedValues);
        },
    });
    formController?.detach();
    return action === "save" ? savedValues : null;
}

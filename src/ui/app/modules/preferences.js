import { showToast } from "../../reuse/toast.js";
import { reportClientError } from "../../reuse/error-reporting.js";
import { escapeHtml } from "../../reuse/escape-html.js";
import { openPopup } from "../../reuse/popup.js";
import { renderInfoTooltip } from "../../reuse/info-tooltip.js";
import { createFormBuilder } from "../../reuse/form-builder.js";
import { extendI18n } from "../../reuse/i18n.js";
import {
    loadModuleConfig,
    saveModuleConfig,
    runModuleConfigAction,
} from "./api.js";

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
    const configActions = module.ui?.configActions ?? [];
    const objectUrls = new Set();
    const controller = new AbortController();
    let previewAudio;
    let actionPending = false;
    let formController;
    let savedValues = null;
    const action = await openPopup({
        title: labels.title,
        body: formBuilder.render(),
        actions: [
            ...configActions.map((action) => ({
                id: `config:${action.id}`,
                label: moduleI18n.t(action.labelKey),
                variant: "neutral",
            })),
            { id: "save", label: labels.save, variant: "confirm" },
            { id: "cancel", label: labels.cancel, variant: "neutral" },
        ],
        closeProtection: true,
        onOpen: (overlay) => {
            const form = overlay.querySelector("#module-preferences-form");
            formController = formBuilder.attach(form);
        },
        onAction: async (action, overlay) => {
            const configuredAction = configActions.find(
                (item) => action === `config:${item.id}`,
            );
            if (configuredAction) {
                if (actionPending) return false;
                actionPending = true;
                const form = overlay.querySelector("#module-preferences-form");
                try {
                    const result = await runModuleConfigAction(
                        module.id,
                        configuredAction,
                        readModulePreferenceValues(form, localizedDefinitions),
                        controller.signal,
                    );
                    if (controller.signal.aborted) return false;
                    if (configuredAction.result === "options") {
                        const input = form.elements.namedItem(
                            configuredAction.fieldKey,
                        );
                        if (!input || !Array.isArray(result?.options))
                            throw new Error("invalid_config_options");
                        const listId = `module-config-options-${configuredAction.fieldKey}`;
                        let list = form.querySelector(`#${listId}`);
                        if (!list) {
                            list = document.createElement("datalist");
                            list.id = listId;
                            form.append(list);
                        }
                        list.replaceChildren(
                            ...result.options.map((option) => {
                                const element =
                                    document.createElement("option");
                                element.value = option.value;
                                element.label = option.label;
                                return element;
                            }),
                        );
                        if (!input.value && result.options[0])
                            input.value = result.options[0].value;
                        input.setAttribute("list", listId);
                        input.focus();
                    } else {
                        const objectUrl = URL.createObjectURL(result);
                        objectUrls.add(objectUrl);
                        let preview = form.querySelector(
                            "audio[data-config-preview]",
                        );
                        if (!preview) {
                            preview = document.createElement("audio");
                            preview.controls = true;
                            preview.dataset.configPreview = "true";
                            form.append(preview);
                        }
                        if (preview.src) {
                            URL.revokeObjectURL(preview.src);
                            objectUrls.delete(preview.src);
                        }
                        previewAudio = preview;
                        preview.src = objectUrl;
                        await preview.play();
                    }
                } catch (error) {
                    if (controller.signal.aborted) return false;
                    reportClientError({
                        component: "modules",
                        operation: "configAction",
                        moduleId: module.id,
                        errorName: error?.name,
                    });
                    showToast(
                        labels.i18n.t("ui.app.modules.config_action_failed"),
                        { variant: "error" },
                    );
                }
                actionPending = false;
                return false;
            }
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
    controller.abort();
    previewAudio?.pause();
    formController?.detach();
    for (const objectUrl of objectUrls) URL.revokeObjectURL(objectUrl);
    return action === "save" ? savedValues : null;
}

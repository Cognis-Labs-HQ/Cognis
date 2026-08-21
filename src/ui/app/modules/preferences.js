import { escapeHtml } from "../../reuse/escape-html.js";
import { openPopup } from "../../reuse/popup.js";
import { renderInfoTooltip } from "../../reuse/info-tooltip.js";
import { extendI18n } from "../../reuse/i18n.js";
import { loadModuleConfig, saveModuleConfig } from "./api.js";

export function missingRequiredModulePreferenceKeys(definitions, values) {
    return definitions
        .filter((definition) => definition.required)
        .filter((definition) => {
            const value = values?.[definition.key];
            if (definition.type === "boolean")
                return typeof value !== "boolean";
            if (definition.type === "number") {
                return typeof value !== "number" || !Number.isFinite(value);
            }
            return typeof value !== "string" || value.trim().length === 0;
        })
        .map((definition) => definition.key);
}

export async function assertRequiredModulePreferences(module, message) {
    const definitions = module.ui?.preferences ?? [];
    if (!definitions.some((definition) => definition.required)) return;
    const values = await loadModuleConfig(module.id);
    const missingKeys = missingRequiredModulePreferenceKeys(
        definitions,
        values,
    );
    if (!missingKeys.length) return;
    const error = new Error(message);
    error.code = "module_config_required";
    error.missingKeys = missingKeys;
    throw error;
}

export function renderModulePreferenceField(
    definition,
    value,
    informationLabel,
) {
    const id = `module-preference-${definition.key}`;
    const descriptor = definition.description
        ? renderInfoTooltip(
              definition.description,
              informationLabel,
              `${id}-descriptor`,
          )
        : "";
    const label = `<span class="module-settings-popup-label-row"><span class="module-settings-popup-label">${escapeHtml(definition.label)}</span>${descriptor}</span>`;
    if (definition.type === "boolean") {
        return `<label class="module-settings-popup-field module-settings-popup-field--boolean" for="${escapeHtml(id)}">${label}<input id="${escapeHtml(id)}" name="${escapeHtml(definition.key)}" type="checkbox"${value ? " checked" : ""}></label>`;
    }
    return `<label class="module-settings-popup-field" for="${escapeHtml(id)}">${label}<input id="${escapeHtml(id)}" name="${escapeHtml(definition.key)}" type="${definition.type === "number" ? "number" : "text"}" value="${escapeHtml(value ?? "")}"${definition.required ? " required" : ""}></label>`;
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
    const action = await openPopup({
        title: labels.title,
        body: `<form class="module-settings-popup-fields" data-module-preferences>${localizedDefinitions
            .map((definition) =>
                renderModulePreferenceField(
                    definition,
                    values?.[definition.key] ?? definition.default,
                    labels.information,
                ),
            )
            .join("")}</form>`,
        actions: [
            { id: "save", label: labels.save, variant: "confirm" },
            { id: "cancel", label: labels.cancel, variant: "neutral" },
        ],
        closeProtection: true,
        onAction: async (action, overlay) => {
            if (action !== "save") return;
            const form = overlay.querySelector("[data-module-preferences]");
            const values = Object.fromEntries(
                localizedDefinitions.map((definition) => {
                    const input = form.elements.namedItem(definition.key);
                    const value =
                        definition.type === "boolean"
                            ? input.checked
                            : definition.type === "number"
                              ? Number(input.value)
                              : input.value;
                    return [definition.key, value];
                }),
            );
            await saveModuleConfig(module.id, values);
        },
    });
    return action === "save";
}

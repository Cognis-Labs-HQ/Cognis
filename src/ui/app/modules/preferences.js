import { escapeHtml } from "../../reuse/escape-html.js";
import { openPopup } from "../../reuse/popup.js";
import { renderInfoTooltip } from "../../reuse/info-tooltip.js";
import { loadModulePreferences, saveModulePreferences } from "./api.js";

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
    return `<label class="module-settings-popup-field" for="${escapeHtml(id)}">${label}<input id="${escapeHtml(id)}" name="${escapeHtml(definition.key)}" type="${definition.type === "number" ? "number" : "text"}" value="${escapeHtml(value ?? "")}"></label>`;
}

export async function openModulePreferences(module, labels) {
    const payload = await loadModulePreferences(module.id);
    const definitions = payload.definitions ?? [];
    if (!definitions.length) return;
    await openPopup({
        title: labels.title,
        body: `<form class="module-settings-popup-fields" data-module-preferences>${definitions
            .map((definition) =>
                renderModulePreferenceField(
                    definition,
                    payload.values?.[definition.key] ?? definition.default,
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
                definitions.map((definition) => {
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
            await saveModulePreferences(module.id, values);
        },
    });
}

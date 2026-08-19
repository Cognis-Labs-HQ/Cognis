import { escapeHtml } from "../../reuse/escape-html.js";
import { openPopup } from "../../reuse/popup.js";
import { loadModulePreferences, saveModulePreferences } from "./api.js";

function renderField(definition, value) {
    const id = `module-preference-${definition.key}`;
    const description = definition.description
        ? `<small>${escapeHtml(definition.description)}</small>`
        : "";
    if (definition.type === "boolean") {
        return `<label for="${escapeHtml(id)}"><input id="${escapeHtml(id)}" name="${escapeHtml(definition.key)}" type="checkbox"${value ? " checked" : ""}> ${escapeHtml(definition.label)}${description}</label>`;
    }
    return `<label for="${escapeHtml(id)}"><span>${escapeHtml(definition.label)}</span><input id="${escapeHtml(id)}" name="${escapeHtml(definition.key)}" type="${definition.type === "number" ? "number" : "text"}" value="${escapeHtml(value ?? "")}">${description}</label>`;
}

export async function openModulePreferences(module, labels) {
    const payload = await loadModulePreferences(module.id);
    const definitions = payload.definitions ?? [];
    if (!definitions.length) return;
    await openPopup({
        title: labels.title,
        body: `<form data-module-preferences>${definitions
            .map((definition) =>
                renderField(
                    definition,
                    payload.values?.[definition.key] ?? definition.default,
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

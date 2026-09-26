import { escapeHtml } from "/static/reuse/escape-html.js";
import { localizedLabel } from "./presentation.js";

export function inputForField(field, value, language, i18n) {
    const label = localizedLabel(field.metadata, language);
    const name = `field:${field.id}`;
    const control = field.input?.control;
    const options = field.input?.options ?? [];
    if (field.type === "strokePattern")
        return `<input name="${escapeHtml(name)}" type="hidden" data-library-provider-field>`;
    if (control === "audioFile") {
        const namespace = field.input?.file?.namespace ?? "";
        const prefix = field.input?.file?.prefix ?? `${language}/`;
        const filename =
            typeof value === "string" && value.startsWith("file:")
                ? value.slice("file:".length).split("/").at(-1)
                : "";
        return `<label class="library-audio-field" data-library-audio-field data-field-id="${escapeHtml(field.id)}" data-namespace="${escapeHtml(namespace)}" data-prefix="${escapeHtml(prefix)}"><span>${escapeHtml(label)} (${escapeHtml(i18n.t("gateway.study.library_optional"))})</span><span class="library-audio-filename" data-library-audio-filename${filename ? "" : " hidden"}>${escapeHtml(filename)}</span><input name="${escapeHtml(name)}" type="hidden" value="${escapeHtml(value ?? "")}"><input type="file" accept="audio/mpeg,audio/ogg,audio/wav,audio/webm,audio/mp4"></label>`;
    }
    if (control === "singleSelect" || control === "multiSelect")
        return `<label><span>${escapeHtml(label)}</span><select name="${escapeHtml(name)}"${control === "multiSelect" ? " multiple" : ""}${field.input?.immutable ? " disabled" : ""}${field.required ? " required" : ""}>${options.map((option) => `<option value="${escapeHtml(option.value)}"${(Array.isArray(value) ? value.includes(option.value) : value === option.value) ? " selected" : ""}>${escapeHtml(localizedLabel(option.metadata, language))}</option>`).join("")}</select></label>`;
    const valueKind = field.validation?.kind ?? field.type;
    if (valueKind === "boolean")
        return `<label class="library-admin-checkbox"><input name="${escapeHtml(name)}" type="checkbox" class="choice-checkbox"${value === true ? " checked" : ""}> <span>${escapeHtml(label)}</span></label>`;
    if (valueKind === "localizedText") {
        const translations =
            value && typeof value === "object" && !Array.isArray(value)
                ? value
                : {};
        const uiLanguages = ["de", "en", "id", "ja"];
        return `<fieldset class="library-admin-localized-field"><legend>${escapeHtml(label)}</legend>${uiLanguages
            .map((locale) => [locale, translations[locale] ?? ""])
            .map(
                ([locale, text]) =>
                    `<label><span>${escapeHtml(locale)}</span><input name="${escapeHtml(`${name}:${locale}`)}" value="${escapeHtml(String(text))}"${field.required ? " required" : ""}></label>`,
            )
            .join("")}</fieldset>`;
    }
    if (
        field.type === "stringList" ||
        field.validation?.kind === "list" ||
        control === "tagList"
    )
        return `<div class="library-tag-field" data-library-tag-field><span>${escapeHtml(label)}</span><div class="library-tag-list">${(Array.isArray(value) ? value : []).map((item) => `<button type="button" class="btn-neutral" data-library-tag="${escapeHtml(item)}">${escapeHtml(item)} ×</button>`).join("")}</div><input data-library-tag-input aria-label="${escapeHtml(label)}"><input name="${escapeHtml(name)}" type="hidden" value="${escapeHtml((Array.isArray(value) ? value : []).join("\u001f"))}"${field.required ? " required" : ""}></div>`;
    const inputType =
        ["number", "integer"].includes(field.type) ||
        field.validation?.kind === "number" ||
        control === "number"
            ? "number"
            : "text";
    const step =
        field.type === "integer" || field.validation?.integer ? "1" : "any";
    return `<label><span>${escapeHtml(label)}</span><input name="${escapeHtml(name)}" type="${inputType}"${inputType === "number" ? ` step="${step}"` : ""} value="${escapeHtml(value ?? "")}"${field.required ? " required" : ""}${field.input?.immutable ? " disabled" : ""}></label>`;
}

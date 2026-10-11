import { DEFINITION_LANGUAGES } from "./definition-languages.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { localizedLabel } from "./presentation.js";

export function inputForField(field, value, language, i18n) {
    if (field.hidden === true) return "";
    const label = localizedLabel(field.metadata, language);
    const name = `field:${field.id}`;
    const control = field.input?.control;
    const options = field.input?.options ?? [];
    if (field.type === "strokePattern")
        return `<section class="library-stroke-pattern" data-library-stroke-pattern="${escapeHtml(field.id)}"><h3>${escapeHtml(label)}</h3><canvas class="library-stroke-pattern-preview" width="64" height="64" aria-label="${escapeHtml(label)}" hidden></canvas><div data-library-stroke-lookup></div><input name="${escapeHtml(name)}" type="hidden" data-library-provider-field></section>`;
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
        return `<fieldset class="library-admin-localized-field"><legend>${escapeHtml(label)}</legend>${DEFINITION_LANGUAGES.map(
            (locale) => [locale, translations[locale] ?? ""],
        )
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
        return `<label><span>${escapeHtml(label)}</span><textarea name="${escapeHtml(name)}"${field.required ? " required" : ""}${field.input?.immutable ? " disabled" : ""}>${escapeHtml((Array.isArray(value) ? value : []).join("\n"))}</textarea></label>`;
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

export function renderStrokePatternPreviews(form) {
    form.querySelectorAll("[data-library-stroke-pattern]").forEach(
        (section) => {
            const fieldId = section.dataset.libraryStrokePattern;
            const pattern =
                form.elements[`field:${fieldId}`]?.libraryFieldValue;
            const canvas = section.querySelector("canvas");
            const strokes = Array.isArray(pattern?.strokes)
                ? pattern.strokes
                : [];
            canvas.hidden = strokes.length === 0;
            section
                .querySelectorAll("[data-library-lookup-provider]")
                .forEach((button) => {
                    button.hidden = strokes.length > 0;
                });
            if (!strokes.length) return;
            const context = canvas.getContext("2d");
            if (!context) return;
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.strokeStyle = getComputedStyle(canvas).color;
            context.lineWidth = 3;
            context.lineCap = "round";
            context.lineJoin = "round";
            for (const stroke of strokes) {
                const points = Array.isArray(stroke?.points)
                    ? stroke.points
                    : [];
                if (!points.length) continue;
                context.beginPath();
                points.forEach((point, index) => {
                    const x = 6 + Number(point.x) * (canvas.width - 12);
                    const y = 6 + Number(point.y) * (canvas.height - 12);
                    if (index === 0) context.moveTo(x, y);
                    else context.lineTo(x, y);
                });
                context.stroke();
            }
        },
    );
}

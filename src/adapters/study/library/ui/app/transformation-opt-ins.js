import { escapeHtml } from "/static/reuse/escape-html.js";
import { localizedLabel } from "./presentation.js";

export function renderTransformationOptIns(schema) {
    return (schema?.transformSets ?? [])
        .filter((set) => set.optInTag)
        .map(
            (set) =>
                `<label data-library-transform-opt-in hidden><input type="checkbox" class="choice-checkbox" data-transform-tag="${escapeHtml(set.optInTag)}" data-match-tags="${escapeHtml(JSON.stringify(set.matchTags))}"><span>${escapeHtml(localizedLabel(set.metadata, schema.language))}</span></label>`,
        )
        .join("");
}

export function bindTransformationOptIns(form, maxTags) {
    const field = form.elements.tags;
    const controls = form.querySelectorAll("[data-library-transform-opt-in]");
    const sync = () => {
        const tags = field.value.split("\u001f").filter(Boolean);
        controls.forEach((label) => {
            const control = label.querySelector("input");
            label.hidden = !JSON.parse(control.dataset.matchTags).every((tag) =>
                tags.includes(tag),
            );
            control.checked = tags.includes(control.dataset.transformTag);
            control.disabled =
                label.hidden || (!control.checked && tags.length >= maxTags);
        });
    };
    controls.forEach((label) => {
        label.querySelector("input").addEventListener("change", (event) => {
            const tags = new Set(field.value.split("\u001f").filter(Boolean));
            const tag = event.target.dataset.transformTag;
            if (event.target.checked && tags.size < maxTags) tags.add(tag);
            else tags.delete(tag);
            form.setLibraryTags([...tags]);
        });
    });
    field.addEventListener("change", sync);
    sync();
}

import { escapeHtml } from "/static/reuse/escape-html.js";
import { localizedLabel } from "./presentation.js";

export function renderTransformationOptIns(schema) {
    const groups = new Map();
    for (const set of schema?.transformSets ?? []) {
        const group = groups.get(set.flag) ?? {
            tag: set.flag,
            metadata: set.metadata,
            matches: [],
        };
        group.matches.push(set.matchTags);
        groups.set(set.flag, group);
    }
    return `<div class="library-transform-opt-ins">${[...groups.values()].map((group) => `<label data-library-transform-opt-in hidden><input type="checkbox" class="choice-checkbox" data-transform-tag="${escapeHtml(group.tag)}" data-match-groups="${escapeHtml(JSON.stringify(group.matches))}"><span>${escapeHtml(localizedLabel(group.metadata, schema.language))}</span></label>`).join("")}</div>`;
}

export function bindTransformationOptIns(form, maxTags, signal) {
    const field = form.elements.tags;
    const readOnly = field.disabled;
    const controls = form.querySelectorAll("[data-library-transform-opt-in]");
    const sync = () => {
        const tags = field.value.split("\u001f").filter(Boolean);
        controls.forEach((label) => {
            const control = label.querySelector("input");
            label.hidden = !JSON.parse(control.dataset.matchGroups).some(
                (group) => group.every((tag) => tags.includes(tag)),
            );
            control.checked = tags.includes(control.dataset.transformTag);
            control.disabled =
                readOnly ||
                label.hidden ||
                (!control.checked && tags.length >= maxTags);
        });
    };
    controls.forEach((label) => {
        label.querySelector("input").addEventListener(
            "change",
            (event) => {
                const tags = new Set(
                    field.value.split("\u001f").filter(Boolean),
                );
                const tag = event.target.dataset.transformTag;
                if (event.target.checked && tags.size < maxTags) tags.add(tag);
                else tags.delete(tag);
                form.setLibraryTags([...tags]);
            },
            { signal },
        );
    });
    field.addEventListener("change", sync, { signal });
    sync();
}

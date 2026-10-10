import { escapeHtml } from "/static/reuse/escape-html.js";
import { localizedLabel } from "./presentation.js";
import { literalCompositionToken } from "./composition-tokens.js";

export function renderComposerExtras(constructor, layer, entries, schema) {
    const tagCarousels = (constructor.tag_carousels ?? []).map((carousel) => {
        const relationship = (layer.relationships ?? []).find(
            ({ id }) => id === carousel.relationship,
        );
        const items = entries.filter(
            (entry) =>
                entry.layer === relationship?.targetLayer &&
                entry.schemaId === schema.id &&
                entry.hidden !== true &&
                (entry.tags ?? []).includes(carousel.tag),
        );
        return `<fieldset class="library-composer-extra"><legend>${escapeHtml(localizedLabel(carousel.metadata, schema.language) || carousel.id)}</legend><div class="library-composer-extra-row" role="group">${items.map((entry) => `<button class="btn-neutral" type="button" aria-pressed="false" data-library-tag-carousel-entry="${escapeHtml(entry.id)}" data-library-tag-carousel-relationship="${escapeHtml(carousel.relationship)}">${escapeHtml(entry.label)}</button>`).join("")}</div></fieldset>`;
    });
    const literalCarousels = (constructor.literal_carousels ?? []).map(
        (carousel) =>
            `<fieldset class="library-composer-extra"><legend>${escapeHtml(localizedLabel(carousel.metadata, schema.language) || carousel.id)}</legend><div class="library-composer-extra-row library-composer-extra-row--literal" aria-readonly="true">${carousel.values.map((value) => `<button class="btn-neutral" type="button" data-library-literal="${escapeHtml(value)}">${escapeHtml(value)}</button>`).join("")}</div></fieldset>`,
    );
    return [...tagCarousels, ...literalCarousels].join("");
}

export function bindComposerExtras(form, onChange = () => {}) {
    form.querySelectorAll("[data-library-tag-carousel-entry]").forEach(
        (control) => {
            const select =
                form.elements[
                    `relationship:${control.dataset.libraryTagCarouselRelationship}`
                ];
            const selected = Array.from(select?.selectedOptions ?? []).some(
                ({ value }) =>
                    value === control.dataset.libraryTagCarouselEntry,
            );
            control.classList.toggle("is-selected", selected);
            control.setAttribute("aria-pressed", String(selected));
        },
    );
    form.addEventListener("click", (event) => {
        const tagged = event.target.closest(
            "[data-library-tag-carousel-entry]",
        );
        if (tagged) {
            const entryId = tagged.dataset.libraryTagCarouselEntry;
            const relationshipId =
                tagged.dataset.libraryTagCarouselRelationship;
            const select = form.elements[`relationship:${relationshipId}`];
            const option = Array.from(select?.options ?? []).find(
                ({ value }) => value === entryId,
            );
            if (!option) return;
            const selected = true;
            option.selected = selected;
            if (selected) select.append(option);
            form.compositionOrder ??= [];
            form.compositionOrder.push(entryId);
            tagged.classList.toggle("is-selected", selected);
            tagged.setAttribute("aria-pressed", String(selected));
            onChange();
            form.dispatchEvent(new CustomEvent("library-composition-change"));
            return;
        }
        const literal = event.target.closest("[data-library-literal]");
        if (!literal) return;
        form.compositionOrder ??= [];
        form.compositionOrder.push(
            literalCompositionToken(literal.dataset.libraryLiteral),
        );
        onChange();
        form.dispatchEvent(new CustomEvent("library-composition-change"));
    });
}

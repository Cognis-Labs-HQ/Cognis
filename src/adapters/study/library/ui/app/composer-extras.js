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
        return `<fieldset class="library-composer-extra"><legend>${escapeHtml(localizedLabel(carousel.metadata, schema.language) || carousel.id)}</legend><div class="library-composer-extra-row">${items.map((entry) => `<button class="btn-neutral" type="button" data-library-tag-carousel-entry="${escapeHtml(entry.id)}" data-library-tag-carousel-relationship="${escapeHtml(carousel.relationship)}">${escapeHtml(entry.label)}</button>`).join("")}</div></fieldset>`;
    });
    const literalCarousels = (constructor.literal_carousels ?? []).map(
        (carousel) =>
            `<fieldset class="library-composer-extra"><legend>${escapeHtml(localizedLabel(carousel.metadata, schema.language) || carousel.id)}</legend><div class="library-composer-extra-row library-composer-extra-row--literal" aria-readonly="true">${carousel.values.map((value) => `<button class="btn-neutral" type="button" data-library-literal="${escapeHtml(value)}">${escapeHtml(value)}</button>`).join("")}</div></fieldset>`,
    );
    return [...tagCarousels, ...literalCarousels].join("");
}

export function bindComposerExtras(form, onChange = () => {}) {
    form.addEventListener("click", (event) => {
        const tagged = event.target.closest(
            "[data-library-tag-carousel-entry]",
        );
        if (tagged) {
            form.querySelector(
                `[data-horizontal-carousel="${CSS.escape(tagged.dataset.libraryTagCarouselRelationship)}"] [data-carousel-value="${CSS.escape(tagged.dataset.libraryTagCarouselEntry)}"]`,
            )?.click();
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

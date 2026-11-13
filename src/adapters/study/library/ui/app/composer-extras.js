import { renderHorizontalCarousel } from "/static/reuse/horizontal-carousel.js";
import { cardPreview } from "./reuse/card-preview.js";
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
        return `<div class="library-composer-tag-carousel">${renderHorizontalCarousel(
            {
                id: carousel.relationship,
                label:
                    localizedLabel(carousel.metadata, schema.language) ||
                    carousel.id,
                items: items.map((entry) => ({
                    value: entry.id,
                    label: entry.label,
                    preview: cardPreview(
                        entry,
                        entries,
                        schema,
                        document.documentElement.lang,
                    ),
                })),
                allowAdd: false,
            },
        )}</div>`;
    });
    const literalCarousels = (constructor.literal_carousels ?? []).map(
        (carousel) =>
            `<fieldset class="library-composer-extra"><legend>${escapeHtml(localizedLabel(carousel.metadata, schema.language) || carousel.id)}</legend><div class="library-composer-extra-row library-composer-extra-row--literal" aria-readonly="true">${carousel.values.map((value) => `<button class="btn-neutral" type="button" data-library-literal="${escapeHtml(value)}">${escapeHtml(value)}</button>`).join("")}</div></fieldset>`,
    );
    return [...tagCarousels, ...literalCarousels].join("");
}

export function bindComposerExtras(form, onChange = () => {}) {
    form.querySelectorAll(
        ".library-composer-tag-carousel [data-carousel-value]",
    ).forEach((control) => {
        const relationship = control.closest("[data-horizontal-carousel]")
            .dataset.horizontalCarousel;
        const selected = Array.from(
            form.elements[`relationship:${relationship}`]?.selectedOptions ??
                [],
        ).some(({ value }) => value === control.dataset.carouselValue);
        control.classList.toggle("is-selected", selected);
        control.setAttribute("aria-pressed", String(selected));
    });
    form.addEventListener("click", (event) => {
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

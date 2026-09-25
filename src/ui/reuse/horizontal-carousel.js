/**
 * Renders and binds an accessible horizontal item carousel with ordered selection.
 *
 * Public exports:
 * - `renderHorizontalCarousel`: renders carousel markup for a collection of items.
 * - `mountHorizontalCarousels`: binds scrolling, ordered selection, and add actions.
 *
 * @example
 * root.innerHTML = renderHorizontalCarousel({ id: "words", label: "Words", items });
 * mountHorizontalCarousels(root, { onChange: ({ values }) => save(values) });
 */

import { escapeHtml } from "./escape-html.js";
import { createAnchoredPopup } from "./popup.js";

/**
 * Render an accessible horizontal carousel.
 * @param {{id: string, label: string, items: Array<{value: string, label: string, preview?: string}>, selectedValues?: string[], addLabel?: string, allowAdd?: boolean}} options Carousel data.
 * @returns {string} Safe carousel HTML.
 */
export function renderHorizontalCarousel({
    id,
    label,
    items,
    selectedValues = [],
    addLabel = "Add",
    allowAdd = true,
}) {
    const order = new Map(
        selectedValues.map((value, index) => [value, index + 1]),
    );
    return `<section class="horizontal-carousel" data-horizontal-carousel="${escapeHtml(id)}"><header><span>${escapeHtml(label)}</span><output data-carousel-selection aria-live="polite"></output></header><div class="horizontal-carousel-row"><div class="horizontal-carousel-viewport"><div class="horizontal-carousel-track">${items.map(({ value, label: itemLabel, preview = "" }) => `<button class="btn-neutral horizontal-carousel-item${order.has(value) ? " is-selected" : ""}" type="button" data-carousel-value="${escapeHtml(value)}" aria-pressed="${order.has(value)}"><span>${escapeHtml(itemLabel)}</span><small data-carousel-order>${order.get(value) ?? ""}</small>${preview ? `<span class="horizontal-carousel-preview" role="tooltip"><strong>${escapeHtml(itemLabel)}</strong><span>${escapeHtml(preview)}</span></span>` : ""}</button>`).join("")}</div></div>${allowAdd ? `<button class="btn-confirm horizontal-carousel-add" type="button" data-carousel-add aria-label="${escapeHtml(addLabel)}">+</button>` : ""}</div></section>`;
}

/**
 * Bind every horizontal carousel below a root element.
 * @param {ParentNode} root Carousel container.
 * @param {{signal?: AbortSignal, onChange?: (detail: {id: string, values: string[]}) => void, onAdd?: (detail: {id: string, carousel: HTMLElement}) => void}} options Event callbacks.
 * @returns {void}
 */
export function mountHorizontalCarousels(
    root,
    { signal, onChange = () => {}, onAdd = () => {} } = {},
) {
    const previewOverlay = createAnchoredPopup({
        className: "horizontal-carousel-preview is-portal",
    });
    const hidePreview = (event) => {
        const trigger = event?.target?.closest?.(
            ".horizontal-carousel-item, .library-composer-suggestion",
        );
        if (
            trigger &&
            event.relatedTarget instanceof Node &&
            trigger.contains(event.relatedTarget)
        )
            return;
        previewOverlay.hide();
    };
    const showPreview = (trigger) => {
        const preview = trigger.querySelector(".horizontal-carousel-preview");
        if (!preview) return;
        previewOverlay.show(trigger, preview.innerHTML);
    };
    const selectedItems = (carousel) =>
        Array.from(
            carousel.querySelectorAll("[data-carousel-value].is-selected"),
        ).sort((left, right) => {
            const leftOrder = Number(
                left.querySelector("[data-carousel-order]").textContent,
            );
            const rightOrder = Number(
                right.querySelector("[data-carousel-order]").textContent,
            );
            return (
                (leftOrder || Number.MAX_SAFE_INTEGER) -
                (rightOrder || Number.MAX_SAFE_INTEGER)
            );
        });
    const values = (carousel) =>
        selectedItems(carousel).map((item) => item.dataset.carouselValue);
    const refresh = (carousel) => {
        carousel.querySelectorAll("[data-carousel-value]").forEach((item) => {
            const selected = item.classList.contains("is-selected");
            item.setAttribute("aria-pressed", String(selected));
            item.querySelector("[data-carousel-order]").textContent = selected
                ? String(
                      values(carousel).indexOf(item.dataset.carouselValue) + 1,
                  )
                : "";
        });
        const output = carousel.querySelector("[data-carousel-selection]");
        if (output) output.textContent = values(carousel).length || "";
    };
    root.querySelectorAll("[data-horizontal-carousel]").forEach(refresh);
    root.addEventListener(
        "pointerover",
        (event) => {
            const trigger = event.target.closest(
                ".horizontal-carousel-item, .library-composer-suggestion",
            );
            if (trigger) showPreview(trigger);
        },
        { signal },
    );
    root.addEventListener("pointerout", hidePreview, { signal });
    root.addEventListener(
        "focusin",
        (event) => {
            const trigger = event.target.closest(
                ".horizontal-carousel-item, .library-composer-suggestion",
            );
            if (trigger) showPreview(trigger);
        },
        { signal },
    );
    root.addEventListener("focusout", hidePreview, { signal });
    signal?.addEventListener("abort", () => previewOverlay.destroy(), {
        once: true,
    });
    root.addEventListener(
        "click",
        (event) => {
            const carousel = event.target.closest("[data-horizontal-carousel]");
            if (!carousel || !root.contains(carousel)) return;
            if (event.target.closest("[data-carousel-add]")) {
                onAdd({ id: carousel.dataset.horizontalCarousel, carousel });
                return;
            }
            const item = event.target.closest("[data-carousel-value]");
            if (!item) return;
            if (!item.classList.contains("is-selected"))
                item.querySelector("[data-carousel-order]").textContent =
                    String(selectedItems(carousel).length + 1);
            item.classList.toggle("is-selected");
            refresh(carousel);
            onChange({
                id: carousel.dataset.horizontalCarousel,
                values: values(carousel),
            });
        },
        { signal },
    );
}

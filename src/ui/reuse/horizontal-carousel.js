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

/**
 * Render an accessible horizontal carousel.
 * @param {{id: string, label: string, items: Array<{value: string, label: string}>, selectedValues?: string[], addLabel?: string, previousLabel?: string, nextLabel?: string}} options Carousel data.
 * @returns {string} Safe carousel HTML.
 */
export function renderHorizontalCarousel({
    id,
    label,
    items,
    selectedValues = [],
    addLabel = "Add",
    previousLabel = "Previous",
    nextLabel = "Next",
}) {
    const order = new Map(
        selectedValues.map((value, index) => [value, index + 1]),
    );
    return `<section class="horizontal-carousel" data-horizontal-carousel="${escapeHtml(id)}"><header><span>${escapeHtml(label)}</span><output data-carousel-selection aria-live="polite"></output></header><div class="horizontal-carousel-row"><button class="btn-neutral horizontal-carousel-scroll" type="button" data-carousel-scroll="previous" aria-label="${escapeHtml(previousLabel)}">‹</button><div class="horizontal-carousel-viewport"><div class="horizontal-carousel-track">${items.map(({ value, label: itemLabel }) => `<button class="btn-neutral horizontal-carousel-item${order.has(value) ? " is-selected" : ""}" type="button" data-carousel-value="${escapeHtml(value)}" aria-pressed="${order.has(value)}"><span>${escapeHtml(itemLabel)}</span><small data-carousel-order>${order.get(value) ?? ""}</small></button>`).join("")}</div></div><button class="btn-neutral horizontal-carousel-scroll" type="button" data-carousel-scroll="next" aria-label="${escapeHtml(nextLabel)}">›</button><button class="btn-confirm horizontal-carousel-add" type="button" data-carousel-add aria-label="${escapeHtml(addLabel)}">+</button></div></section>`;
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
    const values = (carousel) =>
        Array.from(
            carousel.querySelectorAll("[data-carousel-value].is-selected"),
            (item) => item.dataset.carouselValue,
        );
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
        "click",
        (event) => {
            const carousel = event.target.closest("[data-horizontal-carousel]");
            if (!carousel || !root.contains(carousel)) return;
            const scroll = event.target.closest("[data-carousel-scroll]");
            if (scroll) {
                carousel
                    .querySelector(".horizontal-carousel-viewport")
                    ?.scrollBy({
                        left:
                            scroll.dataset.carouselScroll === "previous"
                                ? -320
                                : 320,
                        behavior: "smooth",
                    });
                return;
            }
            if (event.target.closest("[data-carousel-add]")) {
                onAdd({ id: carousel.dataset.horizontalCarousel, carousel });
                return;
            }
            const item = event.target.closest("[data-carousel-value]");
            if (!item) return;
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

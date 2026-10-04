/**
 * Renders and binds an accessible horizontal item carousel with ordered selection.
 *
 * Public exports:
 * - `renderHorizontalCarousel`: renders carousel markup for a collection of items.
 * - `mountHorizontalCarousels`: binds scrolling, ordered selection, and add actions.
 * - `appendHorizontalCarouselItem`: appends a newly created item using the canonical item markup.
 *
 * @example
 * root.innerHTML = renderHorizontalCarousel({ id: "words", label: "Words", items });
 * mountHorizontalCarousels(root, { onChange: ({ values }) => save(values) });
 */

import { escapeHtml } from "./escape-html.js";
import { createAnchoredPopup } from "./popup.js";

function carouselItemMarkup({ value, label, preview = "" }, selected, order) {
    return `<button class="btn-neutral horizontal-carousel-item${selected ? " is-selected" : ""}" type="button" data-carousel-value="${escapeHtml(value)}" aria-pressed="${selected}"><span>${escapeHtml(label)}</span><small data-carousel-order>${selected ? order : ""}</small><span class="horizontal-carousel-preview" role="tooltip"><strong>${escapeHtml(label)}</strong>${preview ? `<span>${escapeHtml(preview)}</span>` : ""}</span></button>`;
}

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
    return `<section class="horizontal-carousel" data-horizontal-carousel="${escapeHtml(id)}"><header><span>${escapeHtml(label)}</span><output data-carousel-selection aria-live="polite"></output></header><div class="horizontal-carousel-row"><div class="horizontal-carousel-viewport"><div class="horizontal-carousel-track">${items.map((item) => carouselItemMarkup(item, order.has(item.value), order.get(item.value))).join("")}</div></div>${allowAdd ? `<button class="btn-confirm horizontal-carousel-add" type="button" data-carousel-add aria-label="${escapeHtml(addLabel)}">+</button>` : ""}</div></section>`;
}

/**
 * Append a carousel item using the same markup as initial rendering.
 * @param {HTMLElement} carousel Carousel root.
 * @param {{value: string, label: string, preview?: string}} item Item data.
 * @param {{selected?: boolean}} options Initial selection state.
 * @returns {HTMLElement | null} The appended item element.
 */
export function appendHorizontalCarouselItem(
    carousel,
    item,
    { selected = false } = {},
) {
    const track = carousel.querySelector(".horizontal-carousel-track");
    if (!track) return null;
    const order = selected
        ? carousel.querySelectorAll("[data-carousel-value].is-selected")
              .length + 1
        : "";
    track.insertAdjacentHTML(
        "beforeend",
        carouselItemMarkup(item, selected, order),
    );
    return track.lastElementChild;
}

/**
 * Clear every selected item and selection counter in one carousel.
 * @param {HTMLElement} carousel Carousel root.
 * @returns {void}
 */
export function clearHorizontalCarouselSelection(carousel) {
    carousel.querySelectorAll("[data-carousel-value]").forEach((item) => {
        item.classList.remove("is-selected");
        item.setAttribute("aria-pressed", "false");
        const order = item.querySelector("[data-carousel-order]");
        if (order) order.textContent = "";
    });
    const output = carousel.querySelector("[data-carousel-selection]");
    if (output) output.textContent = "";
}

/**
 * Bind every horizontal carousel below a root element.
 * @param {ParentNode} root Carousel container.
 * @param {{signal?: AbortSignal, onChange?: (detail: {id: string, values: string[]}) => void, onAdd?: (detail: {id: string, carousel: HTMLElement}) => void, onActivate?: (detail: {id: string, item: HTMLElement, selected: boolean}) => Promise<{value?: string, label?: string} | false | void> | {value?: string, label?: string} | false | void, selectionOrder?: (detail: {id: string, value: string, localIndex: number}) => number | undefined}} options Event callbacks and optional shared selection ordering.
 * @returns {void}
 */
export function mountHorizontalCarousels(
    root,
    {
        signal,
        onChange = () => {},
        onAdd = () => {},
        onActivate = () => {},
        selectionOrder = ({ localIndex }) => localIndex,
    } = {},
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
            const localIndex =
                values(carousel).indexOf(item.dataset.carouselValue) + 1;
            item.querySelector("[data-carousel-order]").textContent = selected
                ? String(
                      selectionOrder({
                          id: carousel.dataset.horizontalCarousel,
                          value: item.dataset.carouselValue,
                          localIndex,
                      }) ?? localIndex,
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
        async (event) => {
            const carousel = event.target.closest("[data-horizontal-carousel]");
            if (!carousel || !root.contains(carousel)) return;
            if (event.target.closest("[data-carousel-add]")) {
                onAdd({ id: carousel.dataset.horizontalCarousel, carousel });
                return;
            }
            const item = event.target.closest("[data-carousel-value]");
            if (!item) return;
            const activation = await onActivate({
                id: carousel.dataset.horizontalCarousel,
                item,
                selected: item.classList.contains("is-selected"),
            });
            if (activation === false) return;
            if (activation?.value)
                item.dataset.carouselValue = activation.value;
            if (activation?.label)
                item.querySelector(":scope > span").textContent =
                    activation.label;
            if (!item.classList.contains("is-selected"))
                item.querySelector("[data-carousel-order]").textContent =
                    String(selectedItems(carousel).length + 1);
            item.classList.toggle("is-selected");
            refresh(carousel);
            onChange({
                id: carousel.dataset.horizontalCarousel,
                values: values(carousel),
            });
            root.querySelectorAll("[data-horizontal-carousel]").forEach(
                refresh,
            );
        },
        { signal },
    );
}

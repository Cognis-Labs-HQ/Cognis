/**
 * Renders a consistent tokenized composition input for card and relationship editors.
 *
 * Public exports:
 * - `renderCompositionItems`: renders removable selected-value tokens.
 * - `bindCompositionReordering`: binds pointer dragging of individual token placements.
 * - `renderCompositionInput`: renders selected tokens, text input, suggestions, and an optional save action.
 *
 * @example
 * root.innerHTML = renderCompositionInput({ id: 'words', label: 'Input', items });
 * bindCompositionReordering(root, { onMove: ({ from, to }) => reorder(from, to) });
 */

import { escapeHtml } from "./escape-html.js";

function renderAttributes(attributes = {}) {
    return Object.entries(attributes)
        .filter(([, value]) => value !== false && value !== undefined)
        .map(([name, value]) =>
            value === true
                ? ` ${escapeHtml(name)}`
                : ` ${escapeHtml(name)}="${escapeHtml(String(value))}"`,
        )
        .join("");
}

/**
 * Render removable composition tokens.
 * @param {{items?: Array<{value: string, label: string}>, removeLabel?: (label: string) => string, itemAttributes?: (item: {value: string, label: string}, index: number) => Record<string, string | boolean>}} options Token rendering options.
 * @returns {string} Safe token markup.
 */
export function renderCompositionItems({
    items = [],
    removeLabel = (label) => label,
    itemAttributes = () => ({}),
} = {}) {
    return items
        .map(
            (item, index) =>
                `<span class="btn-neutral composition-input-item" data-composition-value="${escapeHtml(item.value)}"${renderAttributes(itemAttributes(item, index))}><span>${escapeHtml(item.label)}</span><button class="btn-cancel" type="button" data-composition-remove aria-label="${escapeHtml(removeLabel(item.label))}">×</button></span>`,
        )
        .join("");
}

/**
 * Render a tokenized composition input.
 * @param {{id: string, label: string, items?: Array<{value: string, label: string}>, value?: string, required?: boolean, removeLabel?: (label: string) => string, containerAttributes?: Record<string, string | boolean>, inputAttributes?: Record<string, string | boolean>, itemsAttributes?: Record<string, string | boolean>, itemAttributes?: (item: {value: string, label: string}, index: number) => Record<string, string | boolean>, saveAction?: {label: string, attributes?: Record<string, string | boolean>}}} options Input rendering options.
 * @returns {string} Safe composition input HTML.
 */
export function renderCompositionInput({
    id,
    label,
    items = [],
    value = "",
    required = false,
    removeLabel,
    containerAttributes,
    inputAttributes,
    itemsAttributes,
    itemAttributes,
    saveAction,
}) {
    const save = saveAction
        ? `<button class="btn-confirm" type="button"${renderAttributes(saveAction.attributes)}>${escapeHtml(saveAction.label)}</button>`
        : "";
    return `<span class="composition-input" data-composition-input="${escapeHtml(id)}"${renderAttributes(containerAttributes)}><span class="composition-input-items" data-composition-items="${escapeHtml(id)}" aria-live="polite"${renderAttributes(itemsAttributes)}>${renderCompositionItems({ items, removeLabel, itemAttributes })}</span><input autocomplete="off" aria-label="${escapeHtml(label)}" value="${escapeHtml(value)}"${required ? " required" : ""}${renderAttributes(inputAttributes)}><span class="composition-input-suggestions" data-composition-suggestions></span>${save}</span>`;
}

/**
 * Bind pointer dragging to reorder individual composition placements.
 * @example
 * bindCompositionReordering(form, { signal, onMove: ({ from, to }) => reorder(from, to) });
 * @param {HTMLElement} root Editor root containing token fields.
 * @param {{signal?: AbortSignal, onMove: (detail: {kind: string, from: number, to: number}) => void}} options Reordering callback and lifecycle.
 * @returns {void}
 */
export function bindCompositionReordering(root, { signal, onMove }) {
    let dragging = null;
    const clear = () => {
        root.querySelectorAll(".is-dragging, .is-drop-target").forEach(
            (item) => {
                item.classList.remove("is-dragging", "is-drop-target");
                delete item.dataset.compositionDrop;
            },
        );
        dragging = null;
    };
    root.addEventListener(
        "pointerdown",
        (event) => {
            const item = event.target.closest("[data-composition-index]");
            if (!item || event.button !== 0 || event.target.closest("button"))
                return;
            const field = item.closest("[data-composition-kind]");
            if (!field) return;
            event.preventDefault();
            dragging = {
                pointerId: event.pointerId,
                from: Number(item.dataset.compositionIndex),
                to: Number(item.dataset.compositionIndex),
                kind: field.dataset.compositionKind,
                x: event.clientX,
                moved: false,
                item,
            };
            root.setPointerCapture(event.pointerId);
        },
        { signal },
    );
    root.addEventListener(
        "pointermove",
        (event) => {
            if (!dragging || event.pointerId !== dragging.pointerId) return;
            if (Math.abs(event.clientX - dragging.x) < 5 && !dragging.moved)
                return;
            dragging.moved = true;
            dragging.item.classList.add("is-dragging");
            const target = document
                .elementFromPoint(event.clientX, event.clientY)
                ?.closest("[data-composition-index]");
            root.querySelectorAll(".is-drop-target").forEach((item) => {
                item.classList.remove("is-drop-target");
                delete item.dataset.compositionDrop;
            });
            if (
                !target ||
                target.closest("[data-composition-kind]")?.dataset
                    .compositionKind !== dragging.kind
            )
                return;
            dragging.to = Number(target.dataset.compositionIndex);
            if (dragging.to !== dragging.from) {
                target.dataset.compositionDrop =
                    dragging.to < dragging.from ? "before" : "after";
                target.classList.add("is-drop-target");
            }
        },
        { signal },
    );
    root.addEventListener(
        "pointerup",
        (event) => {
            if (!dragging || event.pointerId !== dragging.pointerId) return;
            const placement = dragging;
            clear();
            if (root.hasPointerCapture(event.pointerId))
                root.releasePointerCapture(event.pointerId);
            if (placement.moved && placement.from !== placement.to)
                onMove({
                    kind: placement.kind,
                    from: placement.from,
                    to: placement.to,
                });
        },
        { signal },
    );
    root.addEventListener("pointercancel", clear, { signal });
    signal?.addEventListener("abort", clear, { once: true });
}

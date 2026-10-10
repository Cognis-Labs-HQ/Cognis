/**
 * Renders a consistent tokenized composition input for card and relationship editors.
 *
 * Public exports:
 * - `renderCompositionItems`: renders removable selected-value tokens.
 * - `renderCompositionInput`: renders selected tokens, text input, suggestions, and an optional save action.
 *
 * @example
 * root.innerHTML = renderCompositionInput({ id: 'words', label: 'Input', items });
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

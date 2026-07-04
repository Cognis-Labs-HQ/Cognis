/**
 * Lightweight DOM focus preservation utilities.
 *
 * Exports:
 *   - `captureFocus()` — records the currently focused element.
 *   - `restoreFocus(saved)` — returns focus to the saved element when it is
 *     still in the document and focus has moved elsewhere (e.g. after a DOM
 *     replacement).
 *
 * Usage example:
 *   ```js
 *   const savedFocus = captureFocus();
 *   content.outerHTML = newMarkup;           // replaces DOM, loses focus
 *   restoreFocus(savedFocus);               // silently no-ops if not needed
 *   ```
 *
 * @module focus-guard
 */

/**
 * Returns the currently focused HTMLElement, or null when nothing focusable
 * is active (e.g. focus is on the body or a non-HTMLElement node).
 *
 * @returns {HTMLElement|null}
 */
export function captureFocus() {
    return document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
}

/**
 * Refocuses a previously captured element when all of these conditions hold:
 *   1. `saved` is a valid HTMLElement.
 *   2. `saved` is still attached to the document.
 *   3. Focus has moved away from `saved` (e.g. because the DOM was mutated).
 *   4. `saved` exposes a `.focus()` method.
 *
 * Uses `preventScroll: true` to avoid unexpected viewport jumps.
 *
 * @param {HTMLElement|null} saved - Element captured by `captureFocus`.
 * @returns {void}
 */
export function restoreFocus(saved) {
    if (
        saved instanceof HTMLElement &&
        saved !== document.activeElement &&
        document.contains(saved) &&
        typeof saved.focus === "function"
    ) {
        saved.focus({ preventScroll: true });
    }
}

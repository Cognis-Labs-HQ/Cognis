/**
 * Provides DOM positioning helpers for the page composer.
 *
 * Public exports:
 *   getFloatingSlot(root, id) — locates a named floating composer slot.
 *   restoreWindowScrollPosition(left, top) — restores scroll after rendering.
 *
 * Usage:
 *   const slot = getFloatingSlot(root, "actions");
 *   restoreWindowScrollPosition(window.scrollX, window.scrollY);
 *
 * @param {HTMLElement} root Composer root element.
 * @param {string} id Floating slot identifier.
 * @returns {HTMLElement|null} Matching floating slot, when present.
 */
export function getFloatingSlot(root, id) {
    return root.querySelector(`[data-floating-slot="${CSS.escape(id)}"]`);
}

/**
 * @param {number} left Horizontal scroll offset.
 * @param {number} top Vertical scroll offset.
 * @returns {void}
 */
export function restoreWindowScrollPosition(left, top) {
    window.requestAnimationFrame(() => {
        window.scrollTo({
            left,
            top,
            behavior: "auto",
        });
    });
}

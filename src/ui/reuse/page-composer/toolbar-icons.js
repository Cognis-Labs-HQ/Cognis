/**
 * Renders page-composer toolbar icons backed by reusable SVG assets.
 *
 * Public exports:
 *   renderToolbarToggleIcon(open) — returns the toolbar state icon markup.
 *
 * Usage:
 *   button.innerHTML = renderToolbarToggleIcon(true);
 *
 * @param {boolean} open Whether the toolbar drawer is open.
 * @returns {string} Accessible decorative icon markup.
 */
export function renderToolbarToggleIcon(open) {
    const iconClass = open
        ? "toolbar-mobile-toggle-icon--toolbar-close"
        : "toolbar-mobile-toggle-icon--toolbar-menu";
    return `<span class="toolbar-mobile-toggle-icon ${iconClass}" aria-hidden="true"></span>`;
}

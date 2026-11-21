/**
 * Renders page-composer toolbar icons backed by reusable SVG assets.
 *
 * Public exports:
 *   renderToolbarToggleIcon() — returns the toolbar state icon markup.
 *
 * Usage:
 *   button.innerHTML = renderToolbarToggleIcon();
 *
 * @returns {string} Accessible decorative icon markup.
 */
export function renderToolbarToggleIcon() {
    return '<span class="toolbar-mobile-toggle-icon" aria-hidden="true"></span>';
}

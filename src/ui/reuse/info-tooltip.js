/**
 * Reusable info-tooltip component for delivering contextual help text inline.
 *
 * Renders a small ℹ icon button that reveals a tooltip panel on hover or
 * keyboard focus. Prefer this over inline hint text for any description
 * longer than one short phrase — it keeps forms and headings visually clean
 * while still making the context available on demand.
 *
 * Public exports:
 *   renderInfoTooltip(text, ariaLabel?, id?) — Returns an HTML string: a positioned
 *     wrapper containing the icon button and the tooltip panel.
 *
 * Usage:
 *   import { renderInfoTooltip } from '../../reuse/info-tooltip.js';
 *
 *   const heading = `
 *     <h3>
 *       ${escapeHtml(label)}
 *       ${renderInfoTooltip(i18n.t('my.hint.key'))}
 *     </h3>
 *   `;
 *
 * @param {string} text   — Plain text to show inside the tooltip panel.
 *                           Do not pass raw HTML; the value is escaped.
 * @param {string} [ariaLabel] — Accessible label for the icon button.
 *                               Pass `i18n.t('ui.reuse.info_tooltip_aria')`.
 *                               Defaults to 'More information'.
 * @param {string} [id]   — Optional stable id prefix; generated when omitted.
 * @returns {string}
 */

import { escapeHtml } from "./escape-html.js";

let _seq = 0;

export function renderInfoTooltip(text, ariaLabel = "More information", id) {
    const uid = id ?? `info-tooltip-${++_seq}`;
    return `<span class="info-tooltip" data-info-tooltip="${uid}">
      <button
        class="info-tooltip__btn"
        type="button"
        aria-label="${escapeHtml(ariaLabel)}"
        aria-describedby="${uid}"
        tabindex="0"
      >ℹ</button>
      <span class="info-tooltip__panel" id="${uid}" role="tooltip">${escapeHtml(text)}</span>
    </span>`;
}

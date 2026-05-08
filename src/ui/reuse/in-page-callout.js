/**
 * Reusable in-page callout template helper for rendering inline notices.
 *
 * Public exports:
 *   renderInPageCallout(options) — Returns a BookStack-style callout HTML string with variant styling.
 *
 * Usage:
 *   import { renderInPageCallout } from '../../reuse/in-page-callout.js';
 *
 *   const html = renderInPageCallout({
 *     variant: 'danger',
 *     title: i18n.t('ui.reuse.generic.error'),
 *   });
 *
 * @param {{
 *   variant?: 'info' | 'success' | 'warning' | 'danger',
 *   title: string,
 *   body?: string,
 *   icon?: string
 * }} options
 * @returns {string}
 */

import { escapeHtml } from "./escape-html.js";

const ICONS = {
    info: "ℹ",
    success: "✓",
    warning: "⚠",
    danger: "⨯",
};

const VARIANT_CLASSES = {
    info: "in-page-callout--info",
    success: "in-page-callout--success",
    warning: "in-page-callout--warning",
    danger: "in-page-callout--danger",
};

export function renderInPageCallout({
    variant = "info",
    title,
    body = "",
    icon,
}) {
    const safeVariant = ["info", "success", "warning", "danger"].includes(
        variant,
    )
        ? variant
        : "info";
    const displayIcon = icon ?? ICONS[safeVariant];
    return `
      <section class="in-page-callout ${VARIANT_CLASSES[safeVariant]}" role="status">
        <div class="in-page-callout__icon" aria-hidden="true">${escapeHtml(displayIcon)}</div>
        <div class="in-page-callout__content">
          <h3 class="in-page-callout__title">${escapeHtml(title)}</h3>
          ${
              body
                  ? `<p class="in-page-callout__body">${escapeHtml(body)}</p>`
                  : ""
          }
        </div>
      </section>
    `;
}

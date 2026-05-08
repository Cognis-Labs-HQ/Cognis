/**
 * Shared minimal auth shell layout used by login and registration pages.
 *
 * Public exports:
 *   renderAuthBrandline(brandName, tagline) — HTML for the branded logo/name/tagline header block.
 *   renderAuthLayout(opts)                  — HTML for the full two-column auth page shell.
 *
 * Usage:
 *   import { renderAuthBrandline, renderAuthLayout } from '../../reuse/auth-layout.js';
 *   const brandlineHtml = renderAuthBrandline(
 *     i18n.t('ui.shared.brand.name'),
 *     i18n.t('ui.app.login.hero.tagline'),
 *   );
 *   const html = renderAuthLayout({
 *     introPanelAriaLabel: i18n.t('ui.app.login.intro.aria'),
 *     introPanelHtml: brandlineHtml + `<p class="auth-intro">...</p>`,
 *     formPanelAriaLabel: i18n.t('ui.app.login.title'),
 *     formPanelHtml: `<h2 class="auth-heading">...</h2><form>...</form>`,
 *   });
 */

import { escapeHtml } from "./escape-html.js";

/**
 * @param {string} brandName - Translated brand name string.
 * @param {string} tagline   - Translated tagline string.
 * @returns {string} HTML string for the shared brand logo/name/tagline block.
 */
export function renderAuthBrandline(brandName, tagline) {
    return `
    <div class="auth-brandline">
      <img src="/static/assets/icons/cognis-icon.png" alt="" class="auth-icon" />
      <div>
        <h1 class="auth-title">${escapeHtml(brandName)}</h1>
        <p class="auth-typing">${escapeHtml(tagline)}</p>
      </div>
    </div>
  `;
}

/**
 * @param {{ introPanelAriaLabel: string, introPanelHtml: string, formPanelAriaLabel: string, formPanelHtml: string }} opts
 * @returns {string} HTML string for the full auth page two-column shell.
 */
export function renderAuthLayout({
    introPanelAriaLabel,
    introPanelHtml,
    formPanelAriaLabel,
    formPanelHtml,
}) {
    return `
    <section class="auth-page auth-page--frame">
      <div class="auth-layout">
        <aside class="panel auth-intro" aria-label="${escapeHtml(introPanelAriaLabel)}">${introPanelHtml}</aside>
        <main class="panel auth-panel" aria-label="${escapeHtml(formPanelAriaLabel)}">${formPanelHtml}</main>
      </div>
    </section>
  `;
}

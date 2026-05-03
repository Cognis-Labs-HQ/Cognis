/**
 * HTML escaping utility.
 *
 * Public exports:
 *   escapeHtml(value) — escapes &, <, >, and " in a string to their HTML entity equivalents.
 *
 * Usage:
 *   import { escapeHtml } from '../reuse/escape-html.js';
 *   element.innerHTML = `<span>${escapeHtml(userInput)}</span>`;
 *
 * @param {string|null|undefined} value — the raw value to escape.
 * @returns {string} the escaped string.
 */

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

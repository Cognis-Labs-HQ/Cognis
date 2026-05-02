const cache = new Map();

/**
 * Loads an HTML template by name from /dashboard/static/templates/.
 * Results are cached in memory so repeated calls are free.
 *
 * Usage:
 *   const html = await loadTemplate('dashboard-layout');
 *
 * @param {string} name  Template filename without extension
 * @returns {Promise<string>}
 */
export async function loadTemplate(name) {
  if (cache.has(name)) return cache.get(name);
  const response = await fetch(`/dashboard/static/templates/${name}.html`);
  const html = await response.text();
  cache.set(name, html);
  return html;
}

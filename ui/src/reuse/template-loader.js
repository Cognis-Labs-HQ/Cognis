const cache = new Map();

export async function loadTemplate(name) {
  if (cache.has(name)) return cache.get(name);
  const response = await fetch(`/dashboard/static/public/templates/${name}.html`);
  const html = await response.text();
  cache.set(name, html);
  return html;
}

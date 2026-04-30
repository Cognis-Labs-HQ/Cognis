import { renderDashboardLayout } from '../layouts/dashboard-layout.js';
import { apiFetch } from '../reuse/api-client.js';
import { renderMarkdown } from '../reuse/markdown-renderer.js';

const root = document.querySelector('#app');

async function loadDocsIndex() {
  const response = await apiFetch('/api/v1/docs');
  const payload = await response.json();
  return payload.data;
}

function renderSidebarLinks(items) {
  return items.map((item) => `<li><button data-slug="${item.slug}">${item.slug}</button></li>`).join('');
}

async function showDoc(slug) {
  const response = await apiFetch(`/api/v1/docs/${slug}`);
  const payload = await response.json();
  root.querySelector('#doc').innerHTML = renderMarkdown(payload.data.markdown);
}

const docs = await loadDocsIndex();
await renderDashboardLayout(root, {
  sidebar: '<h1>Product Docs</h1><p>Production feature documentation.</p>',
  topbar: 'Docs',
  content: `
    <section class="docs-layout">
      <aside class="docs-sidebar">
        <h3>Navigation</h3>
        <ul>${renderSidebarLinks(docs)}</ul>
      </aside>
      <article id="doc" class="docs-viewer"></article>
    </section>
  `
});

root.querySelectorAll('[data-slug]').forEach((button) => {
  button.addEventListener('click', () => showDoc(button.dataset.slug));
});

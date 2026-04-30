import { renderDashboardLayout } from '../layouts/dashboard-layout.js';
import { apiFetch } from '../reuse/api-client.js';
import { renderMarkdown } from '../reuse/markdown-renderer.js';

const root = document.querySelector('#app');

async function loadDocsIndex() {
  const response = await apiFetch('/api/v1/docs');
  const payload = await response.json();
  return payload.data;
}

function toTitleCase(slug) {
  return slug
    .split('/')
    .pop()
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function renderSidebarLinks(items) {
  return items.map((item) => `<li><button data-slug="${item.slug}">${toTitleCase(item.slug)}</button></li>`).join('');
}

async function showDoc(slug) {
  const response = await apiFetch(`/api/v1/docs/${slug}`);
  const payload = await response.json();
  root.querySelector('#doc').innerHTML = renderMarkdown(payload.data.markdown);
}

const docs = await loadDocsIndex();
await renderDashboardLayout(root, {
  pageContext: '<h1>Docs</h1><p>Developer documentation.</p>',
  topbar: '',
  toolbar: `<h3>Navigation</h3><ul>${renderSidebarLinks(docs)}</ul>`,
  content: `<article id="doc" class="docs-viewer"></article>`
});

root.querySelectorAll('[data-slug]').forEach((button) => {
  button.addEventListener('click', () => showDoc(button.dataset.slug));
});

const defaultDoc = docs.find((doc) => doc.slug === 'overview')?.slug ?? docs[0]?.slug;
if (defaultDoc) await showDoc(defaultDoc);

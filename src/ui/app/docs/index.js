import { renderDashboardLayout } from '../../layouts/dashboard-layout.js';
import { apiFetch } from '../../reuse/api-client.js';
import { applyDocumentTitle, createI18n } from '../../reuse/i18n.js';
import { renderMarkdown } from '../../reuse/markdown-renderer.js';

const root = document.querySelector('#app');
const i18n = await createI18n();
applyDocumentTitle(i18n, 'ui.page.title.docs');

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

function normalizeDocSlug(href) {
  return href
    .replace(/^\.\//, '')
    .replace(/^\//, '')
    .replace(/^api\/v1\/docs\//, '')
    .replace(/\.md$/i, '');
}

function renderSidebarLinks(items) {
  return items.map((item) => `<li><button data-slug="${item.slug}">${toTitleCase(item.slug)}</button></li>`).join('');
}

async function showDoc(slug) {
  const response = await apiFetch(`/api/v1/docs/${slug}`);
  const payload = await response.json();
  root.querySelector('#doc').innerHTML = renderMarkdown(payload.data.markdown);

  root.querySelectorAll('[data-slug]').forEach((button) => {
    const isActive = button.dataset.slug === slug;
    button.classList.toggle('active', isActive);
    if (isActive) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
}

const docs = await loadDocsIndex();
await renderDashboardLayout(root, {
  pageContext: `<h1>${i18n.t('ui.app.docs.page_title')}</h1><p>${i18n.t('ui.app.docs.page_subtitle')}</p>`,
  topbar: '',
  toolbar: `<h3>${i18n.t('ui.reuse.navigation')}</h3><ul>${renderSidebarLinks(docs)}</ul>`,
  content: `<article id="doc" class="docs-viewer"></article>`
});

root.querySelectorAll('[data-slug]').forEach((button) => {
  button.addEventListener('click', () => showDoc(button.dataset.slug));
});

root.querySelector('#doc')?.addEventListener('click', async (event) => {
  const link = event.target.closest('a[href]');
  if (!link) return;

  const href = link.getAttribute('href') || '';
  if (href.startsWith('http://') || href.startsWith('https://')) return;

  const slug = normalizeDocSlug(href);
  if (!slug) return;

  event.preventDefault();
  await showDoc(slug);
});

const defaultDoc = docs.find((doc) => doc.slug === 'overview')?.slug ?? docs[0]?.slug;
if (defaultDoc) await showDoc(defaultDoc);

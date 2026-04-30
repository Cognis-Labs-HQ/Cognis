import { renderDashboardLayout } from '../layouts/dashboard-layout.js';

const root = document.querySelector('#app');
const indexRes = await fetch('/api/v1/docs');
const indexBody = await indexRes.json();
const links = indexBody.data.map((d) => `<li><button data-slug="${d.slug}">${d.slug}</button></li>`).join('');
await renderDashboardLayout(root, { sidebar: '<h1>Product Docs</h1><p>Production feature documentation.</p>', topbar: 'Docs', content: `<ul>${links}</ul><article id="doc"></article>` });
root.querySelectorAll('[data-slug]').forEach((button) => button.addEventListener('click', async () => {
  const res = await fetch(`/api/v1/docs/${button.dataset.slug}`);
  const body = await res.json();
  root.querySelector('#doc').textContent = body.data.markdown;
}));

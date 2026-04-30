import { renderDashboardLayout } from '../layouts/dashboard-layout.js';
import { apiFetch } from '../reuse/api-client.js';

function renderMarkdown(md) {
  return md
    .replace(/^### (.*)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*)$/gm, '<h2>$1</h2>')
    .replace(/^# (.*)$/gm, '<h1>$1</h1>')
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/^- (.*)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
    .replace(/\n\n/g, '<p></p>');
}

const root = document.querySelector('#app');
const indexRes = await apiFetch('/api/v1/docs');
const indexBody = await indexRes.json();
const links = indexBody.data.map((d) => `<li><button data-slug="${d.slug}">${d.slug}</button></li>`).join('');
await renderDashboardLayout(root, { sidebar: '<h1>Product Docs</h1><p>Production feature documentation.</p>', topbar: 'Docs', content: `<ul>${links}</ul><article id="doc" class="panel"></article>` });
root.querySelectorAll('[data-slug]').forEach((button) => button.addEventListener('click', async () => {
  const res = await apiFetch(`/api/v1/docs/${button.dataset.slug}`);
  const body = await res.json();
  root.querySelector('#doc').innerHTML = renderMarkdown(body.data.markdown);
}));

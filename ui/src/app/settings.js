import { renderDashboardLayout } from '../layouts/dashboard-layout.js';
import { apiFetch } from '../reuse/api-client.js';

const root = document.querySelector('#app');

function section(label, content) {
  return `<section class="widget-card"><h3>${label}</h3>${content}</section>`;
}

async function savePrefs(prefs) {
  const account = localStorage.getItem('cognis_account');
  if (!account) return;
  await apiFetch(`/api/v1/users/${encodeURIComponent(account)}/preferences/ui-preferences`, {
    method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ layout: prefs })
  });
}

await renderDashboardLayout(root, {
  pageContext: '<h1>Settings</h1><p>Manage your user preferences.</p>',
  toolbar: '<h3>Preferences</h3><ul><li><button disabled>Profile</button></li><li><button disabled>Appearance</button></li></ul>',
  content: `<article class="docs-viewer">${section('Appearance', `
      <label>Animation <select id="pref-animation"><option>none</option><option>fade</option><option>float</option></select></label><br/>
      <label>Greeting font <input id="pref-font" placeholder="Inter, Arial, sans-serif"/></label><br/>
      <label>Greeting size <input id="pref-font-size" type="number" min="0.8" max="2" step="0.05"/></label><br/>
      <button id="save-prefs">Save Preferences</button>
    `)}</article>`
});

root.querySelector('#save-prefs')?.addEventListener('click', async () => {
  const prefs = {
    animation: root.querySelector('#pref-animation')?.value || 'none',
    greetingFont: root.querySelector('#pref-font')?.value || 'Inter, Arial, sans-serif',
    greetingFontSize: Number(root.querySelector('#pref-font-size')?.value || 1.4)
  };
  await savePrefs(prefs);
  localStorage.setItem('cognis_ui_preferences', JSON.stringify(prefs));
  alert('Preferences saved.');
});

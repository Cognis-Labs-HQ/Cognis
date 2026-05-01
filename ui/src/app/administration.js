import { renderDashboardLayout } from '../layouts/dashboard-layout.js';

const root = document.querySelector('#app');

await renderDashboardLayout(root, {
  pageContext: '<h1>Administration</h1><p>Admin-only tools and controls.</p>',
  toolbar: '<h3>Admin</h3><ul><li><a href="/modules">Modules</a></li></ul>',
  content: `
    <article class="docs-viewer">
      <section class="widget-card">
        <h3>Module Management</h3>
        <p>Enable/disable installed modules and inspect runtime status.</p>
        <p><a href="/modules">Go to Modules Overview</a></p>
      </section>
    </article>
  `
});

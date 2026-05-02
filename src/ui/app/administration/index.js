import { renderDashboardLayout } from '../../layouts/dashboard-layout.js';
import { apiFetch } from '../../reuse/api-client.js';
import { applyDocumentTitle, createI18n } from '../../reuse/i18n.js';

const root = document.querySelector('#app');
const i18n = await createI18n();
applyDocumentTitle(i18n, 'ui.page.title.administration');

const DEFAULT_SECTION = 'modules';

async function loadModules() {
  const response = await apiFetch('/api/v1/modules');
  const payload = await response.json();
  return payload.data ?? [];
}

async function loadIntegrity() {
  const response = await apiFetch('/api/v1/modules/integrity');
  const payload = await response.json();
  return payload.data ?? [];
}

async function toggleModule(moduleId, action) {
  await apiFetch(`/api/v1/modules/${encodeURIComponent(moduleId)}/${action}`, { method: 'POST' });
}

function getStatePill(status) {
  if (status === 'enabled') return { label: i18n.t('ui.app.admin.state.active'), className: 'pill-active' };
  if (status === 'available') return { label: i18n.t('ui.app.admin.state.available'), className: 'pill-available' };
  return { label: i18n.t('ui.app.admin.state.disabled'), className: 'pill-disabled' };
}

function renderDetailsList(mod) {
  const details = [
    [i18n.t('ui.reuse.generic.id'), mod.id],
    [i18n.t('ui.reuse.generic.version'), mod.version],
    [i18n.t('ui.app.admin.publisher'), mod.publisher || i18n.t('ui.app.admin.unknown')],
    [i18n.t('ui.reuse.generic.class'), mod.class],
    [i18n.t('ui.app.admin.capabilities'), (mod.capabilities || []).join(', ') || i18n.t('ui.app.admin.none')],
  ];

  return details
    .map(([key, value]) => `<li class="module-detail-item"><span class="module-detail-key">${key}</span><span class="module-detail-value">${value}</span></li>`)
    .join('');
}

function renderModulesContent(modules) {
  return modules
    .map((mod) => {
      const pill = getStatePill(mod.status);
      const disableBlocked = mod.class === 'core';

      return `
        <details class="module-row" data-module="${mod.id}">
          <summary>
            <span><strong>${mod.name}</strong></span>
            <span class="state-pill ${pill.className}">${pill.label}</span>
            <span class="module-chevron">▾</span>
          </summary>
          <div class="module-meta">
            <ul class="module-details">${renderDetailsList(mod)}</ul>
            <label class="switch">
              <input type="checkbox" data-module="${mod.id}" ${mod.status === 'enabled' ? 'checked' : ''} ${disableBlocked ? 'disabled' : ''} />
              <span class="slider"></span>
            </label>
          </div>
        </details>
      `;
    })
    .join('');
}

function renderIntegrityContent(integrityRows) {
  if (!integrityRows.length) return `<p>${i18n.t('ui.app.admin.no_integrity')}</p>`;

  const byModule = new Map();
  for (const row of integrityRows) {
    if (!byModule.has(row.moduleId)) byModule.set(row.moduleId, []);
    byModule.get(row.moduleId).push(row);
  }

  const sections = [];
  for (const [moduleId, rows] of byModule) {
    const items = rows
      .map((row) => {
        const mismatchDetails =
          row.status !== 'ok'
            ? ` (${i18n.t('ui.app.admin.expected')} ${row.expected}, ${i18n.t('ui.app.admin.got')} ${row.actual ?? i18n.t('ui.app.admin.missing')})`
            : '';
        return `<li class="integrity-${row.status}">${row.file}: ${row.status}${mismatchDetails}</li>`;
      })
      .join('');
    sections.push(`
      <div class="integrity-module">
        <h3>${moduleId}</h3>
        <ul class="integrity-list">${items}</ul>
      </div>
    `);
  }
  return sections.join('');
}

function applyToolbarActiveState() {
  const hash = window.location.hash.slice(1) || DEFAULT_SECTION;
  root.querySelectorAll('.toolbar button[data-section]').forEach((btn) => {
    const isActive = btn.dataset.section === hash;
    btn.classList.toggle('active', isActive);
    if (isActive) btn.setAttribute('aria-current', 'page');
    else btn.removeAttribute('aria-current');
  });
  root.querySelectorAll('.content-section[data-section]').forEach((sec) => {
    sec.classList.toggle('active', sec.dataset.section === hash);
  });
}

function bindModuleToggles() {
  root.querySelectorAll('input[type="checkbox"][data-module]').forEach((toggle) => {
    toggle.addEventListener('change', async () => {
      const moduleId = toggle.dataset.module;
      const action = toggle.checked ? 'enable' : 'disable';

      if (action === 'disable') {
        const confirmed = window.confirm(`${i18n.t('ui.app.admin.disable_confirm')} "${moduleId}"?`);
        if (!confirmed) {
          window.location.reload();
          return;
        }
      }

      await toggleModule(moduleId, action);
      const modules = await loadModules();
      const modulesCard = root.querySelector('.content-section[data-section="modules"] .widget-card');
      if (modulesCard) {
        modulesCard.innerHTML = `<h2>${i18n.t('ui.reuse.modules')}</h2>${renderModulesContent(modules)}`;
        bindModuleToggles();
      }
    });
  });
}

function bindIntegrityRerun() {
  const rerunButton = root.querySelector('#rerun-integrity');
  if (!rerunButton) return;
  rerunButton.addEventListener('click', async () => {
    /** @type {HTMLButtonElement} */
    const btn = rerunButton;
    btn.disabled = true;
    btn.textContent = i18n.t('ui.app.admin.checking');
    const integrityRows = await loadIntegrity();
    const integrityCard = root.querySelector('.content-section[data-section="integrity"] .widget-card');
    if (integrityCard) {
      integrityCard.innerHTML = `
        <div class="integrity-header">
          <h2>${i18n.t('ui.reuse.file_integrity')}</h2>
          <button id="rerun-integrity" class="btn-confirm" type="button">${i18n.t('ui.reuse.generic.refresh')}</button>
        </div>
        ${renderIntegrityContent(integrityRows)}
      `;
      bindIntegrityRerun();
    }
  });
}

const [modules, integrityRows] = await Promise.all([loadModules(), loadIntegrity()]);

const modulesSection = `
  <div class="content-section" data-section="modules">
    <section class="widget-card">
      <h2>${i18n.t('ui.reuse.modules')}</h2>
      ${renderModulesContent(modules)}
    </section>
  </div>`;

const integritySection = `
  <div class="content-section" data-section="integrity">
    <section class="widget-card">
      <div class="integrity-header">
        <h2>${i18n.t('ui.reuse.file_integrity')}</h2>
        <button id="rerun-integrity" class="btn-confirm" type="button">${i18n.t('ui.reuse.generic.refresh')}</button>
      </div>
      ${renderIntegrityContent(integrityRows)}
    </section>
  </div>`;

await renderDashboardLayout(root, {
  pageContext: `<h1>${i18n.t('ui.app.admin.page_title')}</h1><p>${i18n.t('ui.app.admin.page_subtitle')}</p>`,
  toolbar: `
    <h2>${i18n.t('ui.app.admin.page_title')}</h2>
    <ul>
      <li><button data-section="modules">${i18n.t('ui.reuse.modules')}</button></li>
      <li><button data-section="integrity">${i18n.t('ui.reuse.file_integrity')}</button></li>
    </ul>
  `,
  content: `<article class="content-panel">${modulesSection}${integritySection}</article>`,
});

root.querySelectorAll('.toolbar button[data-section]').forEach((btn) => {
  btn.addEventListener('click', () => {
    window.location.hash = btn.dataset.section;
  });
});

window.addEventListener('hashchange', applyToolbarActiveState);
applyToolbarActiveState();

bindModuleToggles();
bindIntegrityRerun();


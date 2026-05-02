import { apiFetch } from '../../reuse/api-client.js';
import { applyDocumentTitle, createI18n } from '../../reuse/i18n.js';
import { createPageComposer } from '../../reuse/page-composer.js';
import { openPopup } from '../../reuse/popup.js';

const root = document.querySelector('#app');
const i18n = await createI18n();
applyDocumentTitle(i18n, 'ui.page.title.administration');

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

async function loadTutorialsConfig() {
  try {
    const response = await fetch('/api/v1/system/ui-config');
    if (!response.ok) return { tutorialsEnabled: false, envAllowed: false };
    const payload = await response.json();
    return {
      tutorialsEnabled: payload.data?.tutorialsEnabled !== false,
      envAllowed: payload.data?.tutorialsEnabled !== false || typeof payload.data?.tutorialsEnabled === 'undefined',
    };
  } catch {
    return { tutorialsEnabled: false, envAllowed: false };
  }
}

async function setTutorialsRuntime(enabled) {
  const response = await apiFetch('/api/v1/system/config/tutorials', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ enabled }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.error?.message ?? i18n.t('ui.app.admin.tutorials_toggle_error'));
  }
  const payload = await response.json();
  return payload.data?.tutorialsEnabled;
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

function renderTutorialsContent(config) {
  const envNote = config.envAllowed
    ? `<p class="tutorials-env-note tutorials-env-note--allowed">${i18n.t('ui.app.admin.tutorials_env_allowed')}</p>`
    : `<p class="tutorials-env-note tutorials-env-note--blocked">${i18n.t('ui.app.admin.tutorials_env_blocked')}</p>`;

  const statusNote = config.tutorialsEnabled
    ? `<p class="tutorials-status tutorials-status--on">${i18n.t('ui.app.admin.tutorials_runtime_on')}</p>`
    : `<p class="tutorials-status tutorials-status--off">${i18n.t('ui.app.admin.tutorials_runtime_off')}</p>`;

  const toggleLabel = config.tutorialsEnabled
    ? i18n.t('ui.app.admin.tutorials_toggle_disable')
    : i18n.t('ui.app.admin.tutorials_toggle_enable');

  const toggleDisabled = !config.envAllowed ? 'disabled' : '';

  return `
    ${envNote}
    ${statusNote}
    <button
      id="tutorials-toggle-btn"
      class="btn-confirm btn-animated"
      type="button"
      ${toggleDisabled}
    >${toggleLabel}</button>
  `;
}

function bindModuleToggles() {
  root.querySelectorAll('input[type="checkbox"][data-module]').forEach((toggle) => {
    toggle.addEventListener('change', async () => {
      const moduleId = toggle.dataset.module;
      const previousState = !toggle.checked;
      const action = toggle.checked ? 'enable' : 'disable';

      if (action === 'disable') {
        const result = await openPopup({
          title: i18n.t('ui.app.admin.disable_confirm'),
          body: `<strong>${moduleId}</strong>`,
          variant: 'danger',
          actions: [
            { id: 'confirm', label: i18n.t('ui.reuse.generic.disable'), variant: 'confirm' },
            { id: 'cancel',  label: i18n.t('ui.reuse.popup.cancel'),    variant: 'cancel'  },
          ],
        });
        if (result !== 'confirm') {
          toggle.checked = previousState;
          return;
        }
      }

      await toggleModule(moduleId, action);
      modules = await loadModules();
      composer.refresh(elements);
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
    integrityRows = await loadIntegrity();
    composer.refresh(elements);
  });
}

function bindTutorialsToggle() {
  const btn = root.querySelector('#tutorials-toggle-btn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    try {
      const newEnabled = await setTutorialsRuntime(!tutorialsConfig.tutorialsEnabled);
      tutorialsConfig = {
        tutorialsEnabled: newEnabled,
        envAllowed: tutorialsConfig.envAllowed,
      };
      composer.refresh(elements);
    } catch (err) {
      await openPopup({
        title: i18n.t('ui.app.admin.tutorials_toggle_error'),
        body: err.message || i18n.t('ui.app.admin.tutorials_toggle_error'),
        variant: 'danger',
      });
      btn.disabled = false;
    }
  });
}

let [modules, integrityRows, tutorialsConfig] = await Promise.all([
  loadModules(),
  loadIntegrity(),
  loadTutorialsConfig(),
]);
let composer;

const elements = [
  {
    id: 'modules',
    label: i18n.t('ui.reuse.modules'),
    subComposerOptions: {
      allowCustomization: false,
      preferenceKey: 'administration-modules-layout',
      heading: i18n.t('ui.reuse.modules'),
      elements: [
        {
          id: 'modules-list',
          label: i18n.t('ui.reuse.modules'),
          pinned: true,
          render: () => renderModulesContent(modules),
        },
      ],
      onRender: () => {
        bindModuleToggles();
      },
    },
  },
  {
    id: 'integrity',
    label: i18n.t('ui.reuse.file_integrity'),
    subComposerOptions: {
      allowCustomization: false,
      preferenceKey: 'administration-integrity-layout',
      heading: i18n.t('ui.reuse.file_integrity'),
      elements: [
        {
          id: 'integrity-content',
          label: i18n.t('ui.reuse.file_integrity'),
          pinned: true,
          render: () => `
            <div class="integrity-header">
              <button id="rerun-integrity" class="btn-confirm btn-animated" type="button">${i18n.t('ui.reuse.generic.refresh')}</button>
            </div>
            ${renderIntegrityContent(integrityRows)}
          `,
        },
      ],
      onRender: () => {
        bindIntegrityRerun();
      },
    },
  },
  {
    id: 'tutorials',
    label: i18n.t('ui.app.admin.tutorials'),
    subComposerOptions: {
      allowCustomization: false,
      preferenceKey: 'administration-tutorials-layout',
      heading: i18n.t('ui.app.admin.tutorials_heading'),
      elements: [
        {
          id: 'tutorials-content',
          label: i18n.t('ui.app.admin.tutorials'),
          pinned: true,
          render: () => renderTutorialsContent(tutorialsConfig),
        },
      ],
      onRender: () => {
        bindTutorialsToggle();
      },
    },
  },
];

composer = createPageComposer(root, {
  allowCustomization: false,
  subPageNavigation: true,
  elements,
  preferenceKey: 'administration-layout',
  i18n,
  pageContext: {
    title: i18n.t('ui.app.admin.page_title'),
    subtitle: i18n.t('ui.app.admin.page_subtitle'),
  },
  toolbar: [
    {
      id: 'admin-nav',
      label: i18n.t('ui.app.admin.page_title'),
      render: () => `
        <h2>${i18n.t('ui.app.admin.page_title')}</h2>
        <ul>
          <li><button data-composer-scroll="modules">${i18n.t('ui.reuse.modules')}</button></li>
          <li><button data-composer-scroll="integrity">${i18n.t('ui.reuse.file_integrity')}</button></li>
          <li><button data-composer-scroll="tutorials">${i18n.t('ui.app.admin.tutorials')}</button></li>
        </ul>
      `,
    },
  ],
});
await composer.init();


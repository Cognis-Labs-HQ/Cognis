import { apiFetch } from '../../reuse/api-client.js';
import { applyDocumentTitle, createI18n } from '../../reuse/i18n.js';
import { createPageComposer } from '../../reuse/page-composer.js';
import { openPopup } from '../../reuse/popup.js';
import { escapeHtml } from '../../reuse/escape-html.js';
import { loadProviderConfig } from '../../reuse/provider-config.js';

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

async function loadProviders() {
  const res = await apiFetch('/api/v1/notifications/providers');
  if (!res.ok) return [];
  const payload = await res.json();
  return payload.data ?? [];
}

const SMTP_REQUIRED_FIELDS = new Set(['host', 'from']);

function renderSmtpFieldLabel(name, labelText, inputHtml, descriptor) {
  const isMissing = SMTP_REQUIRED_FIELDS.has(name) && !descriptor?.effectiveValue;
  const hasConflict = descriptor?.envConflict === true;
  const wrapperClass = isMissing ? 'provider-field-required provider-field-missing' : '';
  const conflictWarning = hasConflict
    ? `<span class="provider-field-env-warning" title="${i18n.t('ui.app.admin.notif.field_env_conflict')}">⚠</span>`
    : '';
  return `<label class="${wrapperClass}">${labelText}${inputHtml}${conflictWarning}</label>`;
}

function renderSmtpFields(descriptors) {
  const val = (field, fallback = '') => escapeHtml(descriptors[field]?.effectiveValue ?? fallback);
  const host = val('host');
  const port = val('port', '587');
  const from = val('from');
  const user = val('user');
  const secure = val('secure', 'starttls');

  const hostField = renderSmtpFieldLabel(
    'host',
    i18n.t('ui.app.admin.notif.smtp_host'),
    `<input name="host" type="text" value="${host}" />`,
    descriptors['host'],
  );
  const portField = renderSmtpFieldLabel(
    'port',
    i18n.t('ui.app.admin.notif.smtp_port'),
    `<input name="port" type="number" value="${port}" />`,
    descriptors['port'],
  );
  const fromField = renderSmtpFieldLabel(
    'from',
    i18n.t('ui.app.admin.notif.smtp_from'),
    `<input name="from" type="email" value="${from}" />`,
    descriptors['from'],
  );
  const userField = renderSmtpFieldLabel(
    'user',
    i18n.t('ui.app.admin.notif.smtp_user'),
    `<input name="user" type="text" value="${user}" />`,
    descriptors['user'],
  );
  const passwordField = renderSmtpFieldLabel(
    'password',
    i18n.t('ui.app.admin.notif.smtp_password'),
    `<input name="password" type="password" value="" />`,
    descriptors['password'],
  );
  const secureField = renderSmtpFieldLabel(
    'secure',
    i18n.t('ui.app.admin.notif.smtp_secure'),
    `<select name="secure">
          <option value="starttls"${secure === 'starttls' ? ' selected' : ''}>${i18n.t('ui.app.admin.notif.smtp_secure_starttls')}</option>
          <option value="tls"${secure === 'tls' ? ' selected' : ''}>${i18n.t('ui.app.admin.notif.smtp_secure_tls')}</option>
          <option value="none"${secure === 'none' ? ' selected' : ''}>${i18n.t('ui.app.admin.notif.smtp_secure_none')}</option>
        </select>`,
    descriptors['secure'],
  );

  return `
    <div class="provider-fields">
      ${hostField}
      ${portField}
      ${fromField}
      ${userField}
      ${passwordField}
      ${secureField}
    </div>
  `;
}

function renderProviderCard(provider) {
  const escapedId = escapeHtml(provider.senderId);
  const escapedName = escapeHtml(provider.name);
  const missingAlert = !provider.active
    ? `<span class="provider-missing-alert" aria-label="${i18n.t('ui.app.admin.notif.provider_missing_config')}">❗</span>`
    : '';
  return `
    <div class="provider-card" data-sender-id="${escapedId}">
      <strong>${escapedName}${missingAlert}</strong>
      <div class="provider-config-area"></div>
      <div class="provider-save-row">
        <button class="btn-confirm btn-animated provider-save-btn" type="button">${i18n.t('ui.app.admin.notif.save_settings')}</button>
        <span class="provider-save-status notif-status-message"></span>
      </div>
      <div class="provider-test-row">
        <input class="provider-test-input" type="email" placeholder="${i18n.t('ui.app.admin.notif.test_email_to')}" />
        <button class="btn-animated provider-test-btn" type="button">${i18n.t('ui.app.admin.notif.test_email')}</button>
        <span class="provider-test-status notif-status-message"></span>
      </div>
    </div>
  `;
}

function renderNotificationsContent(providers) {
  const activeProviders = providers.filter((p) => p.active);
  const availableProviders = providers.filter((p) => !p.active);

  const activeRows = activeProviders.length
    ? activeProviders.map((p) => renderProviderCard(p)).join('')
    : `<p>${i18n.t('ui.app.admin.notif.no_active')}</p>`;

  const availableRows = availableProviders.length
    ? availableProviders.map((p) => {
        const escapedName = escapeHtml(p.name);
        const missingAlert = `<span class="provider-missing-alert" aria-label="${i18n.t('ui.app.admin.notif.provider_missing_config')}">❗</span>`;
        return `<div class="provider-card"><strong>${escapedName}${missingAlert}</strong></div>`;
      }).join('')
    : `<p>${i18n.t('ui.app.admin.notif.no_available')}</p>`;

  return `
    <h3>${i18n.t('ui.app.admin.notif.active_providers')}</h3>
    ${activeRows}
    <h3>${i18n.t('ui.app.admin.notif.available_providers')}</h3>
    ${availableRows}
  `;
}

async function bindProviderForms() {
  for (const card of root.querySelectorAll('.provider-card[data-sender-id]')) {
    const senderId = card instanceof HTMLElement ? card.dataset.senderId : undefined;
    if (!senderId) continue;

    const configArea = card.querySelector('.provider-config-area');
    if (configArea) {
      const descriptors = await loadProviderConfig(senderId);
      configArea.innerHTML = renderSmtpFields(descriptors);
    }

    const saveBtn = card.querySelector('.provider-save-btn');
    const saveStatus = card.querySelector('.provider-save-status');
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        const fields = card.querySelectorAll('[name]');
        const config = {};
        fields.forEach((field) => {
          if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement) {
            config[field.name] = field.name === 'port' ? Number(field.value) : field.value;
          }
        });
        await apiFetch(`/api/v1/notifications/providers/${encodeURIComponent(senderId)}/config`, {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(config),
        });
        if (saveStatus) saveStatus.textContent = i18n.t('ui.app.admin.notif.settings_saved');
      });
    }

    const testBtn = card.querySelector('.provider-test-btn');
    const testInput = card.querySelector('.provider-test-input');
    const testStatus = card.querySelector('.provider-test-status');
    if (testBtn && testInput) {
      testBtn.addEventListener('click', async () => {
        const to = testInput instanceof HTMLInputElement ? testInput.value.trim() : '';
        const res = await apiFetch(`/api/v1/notifications/providers/${encodeURIComponent(senderId)}/test`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ to }),
        });
        if (testStatus) {
          testStatus.textContent = res.ok
            ? i18n.t('ui.app.admin.notif.test_sent')
            : i18n.t('ui.app.admin.notif.test_failed');
        }
      });
    }
  }
}

let [modules, integrityRows] = await Promise.all([loadModules(), loadIntegrity()]);
let providers = await loadProviders();
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
    id: 'notifications',
    label: i18n.t('ui.app.admin.notifications'),
    subComposerOptions: {
      allowCustomization: false,
      preferenceKey: 'administration-notifications-layout',
      heading: i18n.t('ui.app.admin.notifications'),
      elements: [
        {
          id: 'notifications-content',
          label: i18n.t('ui.app.admin.notifications'),
          pinned: true,
          render: () => renderNotificationsContent(providers),
        },
      ],
      onRender: () => {
        bindProviderForms();
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
          <li><button data-composer-scroll="notifications">${i18n.t('ui.app.admin.notifications')}</button></li>
        </ul>
      `,
    },
  ],
});
await composer.init();


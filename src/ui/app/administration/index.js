import { apiFetch } from '../../reuse/api-client.js';
import { applyDocumentTitle, createI18n } from '../../reuse/i18n.js';
import { createPageComposer } from '../../reuse/page-composer.js';
import { openPopup } from '../../reuse/popup.js';
import { escapeHtml } from '../../reuse/escape-html.js';
import { loadProviderConfig } from '../../reuse/provider-config.js';
import { initSecuritySection } from './security.js';

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

async function loadCategories() {
  const res = await apiFetch('/api/v1/notifications/categories');
  if (!res.ok) return [];
  const payload = await res.json();
  return payload.data ?? [];
}

async function loadUsers() {
  const res = await apiFetch('/api/v1/users');
  if (!res.ok) return [];
  const payload = await res.json();
  return payload.data ?? [];
}

function renderSmtpPopupBody(descriptors, requiredFields) {
  const val = (field, fallback = '') => escapeHtml(descriptors[field]?.effectiveValue ?? fallback);
  const host = val('host');
  const port = val('port', '587');
  const from = val('from');
  const senderName = val('senderName');
  const user = val('user');
  const secure = val('secure', 'starttls');
  const allowSelfSigned = descriptors['allowSelfSigned']?.effectiveValue === 'true'
    || descriptors['allowSelfSigned']?.effectiveValue === true;
  const authDisabled = descriptors['authDisabled']?.effectiveValue === 'true'
    || descriptors['authDisabled']?.effectiveValue === true;
  const requiredSet = new Set(requiredFields);
  const requiredTooltip = i18n.t('ui.app.admin.notif.required_field');
  const conflictTitle = i18n.t('ui.app.admin.notif.field_env_conflict');

  function fieldLabel(name, labelText, inputHtml) {
    const descriptor = descriptors[name];
    const isRequired = requiredSet.has(name);
    const isEmpty = !descriptor?.effectiveValue;
    const hasConflict = descriptor?.envConflict === true;
    const requiredClass = isRequired && isEmpty ? ' provider-field-required provider-field-missing' : '';
    const labelTitle = isRequired && isEmpty ? ` title="${requiredTooltip}"` : '';
    const conflictWarning = hasConflict
      ? `<span class="provider-field-env-warning" title="${conflictTitle}">⚠</span>`
      : '';
    return `<label class="provider-popup-field${requiredClass}"${labelTitle}>${labelText}${inputHtml}${conflictWarning}</label>`;
  }

  const senderNameField = fieldLabel(
    'senderName',
    i18n.t('ui.app.admin.notif.smtp_sender_name'),
    `<input name="senderName" type="text" value="${senderName}" placeholder="${i18n.t('ui.app.admin.notif.smtp_sender_name_placeholder')}" />`,
  );
  const hostField = fieldLabel(
    'host',
    i18n.t('ui.app.admin.notif.smtp_host'),
    `<input name="host" type="text" value="${host}" placeholder="${i18n.t('ui.app.admin.notif.smtp_host_placeholder')}" />`,
  );
  const portField = fieldLabel(
    'port',
    i18n.t('ui.app.admin.notif.smtp_port'),
    `<input name="port" type="number" value="${port}" placeholder="587" />`,
  );
  const fromField = fieldLabel(
    'from',
    i18n.t('ui.app.admin.notif.smtp_from'),
    `<input name="from" type="email" value="${from}" placeholder="${i18n.t('ui.app.admin.notif.smtp_from_placeholder')}" />`,
  );
  const userField = fieldLabel(
    'user',
    i18n.t('ui.app.admin.notif.smtp_user'),
    `<input name="user" type="text" value="${user}" placeholder="${i18n.t('ui.app.admin.notif.smtp_user_placeholder')}" />`,
  );
  const passwordField = fieldLabel(
    'password',
    i18n.t('ui.app.admin.notif.smtp_password'),
    `<input name="password" type="password" value="" placeholder="${i18n.t('ui.app.admin.notif.smtp_password_placeholder')}" />`,
  );
  const secureField = fieldLabel(
    'secure',
    i18n.t('ui.app.admin.notif.smtp_secure'),
    `<select name="secure" class="theme-select">
        <option value="starttls"${secure === 'starttls' ? ' selected' : ''}>${i18n.t('ui.app.admin.notif.smtp_secure_starttls')}</option>
        <option value="tls"${secure === 'tls' ? ' selected' : ''}>${i18n.t('ui.app.admin.notif.smtp_secure_tls')}</option>
        <option value="none"${secure === 'none' ? ' selected' : ''}>${i18n.t('ui.app.admin.notif.smtp_secure_none')}</option>
      </select>`,
  );

  return `
    <div class="provider-popup-form">
      <div class="provider-popup-toggle-row">
        <span class="provider-popup-toggle-label">${i18n.t('ui.app.admin.notif.enable_provider')}</span>
        <label class="switch provider-popup-switch">
          <input type="checkbox" class="provider-enable-toggle" disabled />
          <span class="slider"></span>
        </label>
      </div>
      <div class="provider-fields">
        ${senderNameField}
        ${hostField}
        ${portField}
        ${fromField}
        ${secureField}
      </div>
      <div class="provider-auth-fields">
        ${userField}
        ${passwordField}
      </div>
      <div class="provider-option-toggles">
        <div class="provider-option-row">
          <span class="provider-option-label">${i18n.t('ui.app.admin.notif.smtp_allow_self_signed')}</span>
          <label class="switch">
            <input type="checkbox" name="allowSelfSigned"${allowSelfSigned ? ' checked' : ''} />
            <span class="slider"></span>
          </label>
        </div>
        <div class="provider-option-row">
          <span class="provider-option-label">${i18n.t('ui.app.admin.notif.smtp_auth_disabled')}</span>
          <label class="switch">
            <input type="checkbox" name="authDisabled"${authDisabled ? ' checked' : ''} />
            <span class="slider"></span>
          </label>
        </div>
      </div>
      <div class="provider-test-row">
        <input class="provider-test-input" type="email" placeholder="${escapeHtml(i18n.t('ui.app.admin.notif.test_email_to'))}" />
        <button class="btn-animated provider-test-btn" type="button">${i18n.t('ui.app.admin.notif.test_email')}</button>
        <span class="provider-test-status notif-status-message"></span>
      </div>
    </div>
  `;
}

async function openProviderConfig(senderId, name, isActive) {
  const { descriptors, requiredFields } = await loadProviderConfig(senderId);
  let popupFormEl = null;

  const result = await openPopup({
    title: name,
    body: renderSmtpPopupBody(descriptors, requiredFields),
    maxWidth: '640px',
    actions: [
      { id: 'save', label: i18n.t('ui.app.admin.notif.save_settings'), variant: 'confirm' },
      { id: 'cancel', label: i18n.t('ui.reuse.popup.cancel'), variant: 'cancel' },
    ],
    onOpen: (overlay) => {
      popupFormEl = overlay.querySelector('.provider-popup-form');
      if (!popupFormEl) return;

      const toggle = popupFormEl.querySelector('.provider-enable-toggle');
      if (!toggle) return;

      function requiredAllFilled() {
        return requiredFields.every((field) => {
          const input = popupFormEl.querySelector(`[name="${CSS.escape(field)}"]`);
          return input instanceof HTMLInputElement && input.value.trim() !== '';
        });
      }

      function updateRequiredHighlights() {
        const requiredTooltip = i18n.t('ui.app.admin.notif.required_field');
        for (const field of requiredFields) {
          const input = popupFormEl.querySelector(`[name="${CSS.escape(field)}"]`);
          if (!(input instanceof HTMLInputElement)) continue;
          const label = input.closest('label');
          const isEmpty = input.value.trim() === '';
          if (label) {
            label.classList.toggle('provider-field-required', isEmpty);
            label.classList.toggle('provider-field-missing', isEmpty);
            if (isEmpty) {
              label.setAttribute('title', requiredTooltip);
            } else {
              label.removeAttribute('title');
            }
          }
        }
      }

      function syncToggle() {
        const allFilled = requiredAllFilled();
        toggle.disabled = !allFilled;
        if (allFilled && !toggle.checked) {
          toggle.checked = true;
        } else if (!allFilled) {
          toggle.checked = false;
        }
      }

      if (isActive || requiredAllFilled()) {
        toggle.disabled = false;
        toggle.checked = true;
      }

      popupFormEl.addEventListener('input', () => {
        updateRequiredHighlights();
        syncToggle();
      });

      const authDisabledCheckbox = popupFormEl.querySelector('[name="authDisabled"]');
      const authFieldsEl = popupFormEl.querySelector('.provider-auth-fields');
      if (authDisabledCheckbox instanceof HTMLInputElement && authFieldsEl instanceof HTMLElement) {
        authFieldsEl.style.display = authDisabledCheckbox.checked ? 'none' : 'grid';
        authDisabledCheckbox.addEventListener('change', () => {
          authFieldsEl.style.display = authDisabledCheckbox.checked ? 'none' : 'grid';
        });
      }

      const testBtn = popupFormEl.querySelector('.provider-test-btn');
      const testInput = popupFormEl.querySelector('.provider-test-input');
      const testStatus = popupFormEl.querySelector('.provider-test-status');

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
    },
  });

  if (result === 'save' && popupFormEl) {
    const config = {};
    popupFormEl.querySelectorAll('[name]').forEach((field) => {
      if (field instanceof HTMLInputElement) {
        if (field.type === 'checkbox') {
          config[field.name] = field.checked;
        } else {
          config[field.name] = field.name === 'port' ? Number(field.value) : field.value;
        }
      } else if (field instanceof HTMLSelectElement) {
        config[field.name] = field.value;
      }
    });
    await apiFetch(`/api/v1/notifications/providers/${encodeURIComponent(senderId)}/config`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(config),
    });
    providers = await loadProviders();
    composer.refresh(elements);
  }
}

function renderProviderEntry(provider) {
  const escapedId = escapeHtml(provider.senderId);
  const escapedName = escapeHtml(provider.name);
  const statePillClass = provider.active ? 'pill-active' : 'pill-available';
  const stateLabel = provider.active
    ? i18n.t('ui.app.admin.state.active')
    : i18n.t('ui.app.admin.state.available');
  const missingAlert = !provider.active
    ? `<span class="provider-missing-alert" aria-label="${i18n.t('ui.app.admin.notif.provider_missing_config')}">❗</span>`
    : '';
  return `
    <div class="provider-card provider-card--entry" data-sender-id="${escapedId}" role="button" tabindex="0">
      <span class="provider-entry-name"><strong>${escapedName}</strong>${missingAlert}</span>
      <span class="state-pill ${statePillClass}">${stateLabel}</span>
    </div>
  `;
}

function renderNotificationsContent(providers) {
  const activeProviders = providers.filter((p) => p.active);
  const availableProviders = providers.filter((p) => !p.active);

  const activeRows = activeProviders.length
    ? activeProviders.map((p) => renderProviderEntry(p)).join('')
    : `<p>${i18n.t('ui.app.admin.notif.no_active')}</p>`;

  const availableRows = availableProviders.length
    ? availableProviders.map((p) => renderProviderEntry(p)).join('')
    : `<p>${i18n.t('ui.app.admin.notif.no_available')}</p>`;

  return `
    <h3>${i18n.t('ui.app.admin.notif.active_providers')}</h3>
    ${activeRows}
    <h3>${i18n.t('ui.app.admin.notif.available_providers')}</h3>
    ${availableRows}
  `;
}

function bindProviderEntries() {
  root.querySelectorAll('.provider-card--entry[data-sender-id]').forEach((card) => {
    if (!(card instanceof HTMLElement)) return;
    const senderId = card.dataset.senderId;
    if (!senderId) return;
    const provider = providers.find((p) => p.senderId === senderId);
    if (!provider) return;

    async function handleOpen() {
      await openProviderConfig(senderId, provider.name, provider.active);
    }

    card.addEventListener('click', handleOpen);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleOpen();
      }
    });
  });
}

function renderNotificationsDebugContent(users, categories) {
  const userOptions = users
    .map((u) => `<option value="${escapeHtml(u.username)}">${escapeHtml(u.username)}</option>`)
    .join('');

  const categoryOptions = categories
    .map((c) => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.label)}</option>`)
    .join('');

  const noUsers = !users.length
    ? `<p class="notif-debug-empty">${i18n.t('ui.app.admin.notif.debug_no_users')}</p>`
    : '';
  const noCategories = !categories.length
    ? `<p class="notif-debug-empty">${i18n.t('ui.app.admin.notif.debug_no_categories')}</p>`
    : '';

  return `
    <div class="notif-debug-panel">
      ${noUsers}
      ${noCategories}
      <div class="notif-debug-fields">
        <label class="notif-debug-field">
          ${i18n.t('ui.app.admin.notif.debug_target_user')}
          <select name="debugUser" class="theme-select">${userOptions}</select>
        </label>
        <label class="notif-debug-field">
          ${i18n.t('ui.app.admin.notif.debug_category')}
          <select name="debugCategory" class="theme-select">${categoryOptions}</select>
        </label>
        <label class="notif-debug-field notif-debug-field--full">
          ${i18n.t('ui.app.admin.notif.debug_subject')}
          <input name="debugSubject" type="text" placeholder="${i18n.t('ui.app.admin.notif.debug_subject_placeholder')}" />
        </label>
        <label class="notif-debug-field notif-debug-field--full">
          ${i18n.t('ui.app.admin.notif.debug_body')}
          <textarea name="debugBody" rows="4" placeholder="${i18n.t('ui.app.admin.notif.debug_body_placeholder')}"></textarea>
        </label>
      </div>
      <div class="notif-debug-actions">
        <button class="btn-animated notif-debug-send" type="button">${i18n.t('ui.app.admin.notif.debug_send')}</button>
        <span class="notif-debug-status notif-status-message"></span>
      </div>
    </div>
  `;
}

function bindNotificationsDebug() {
  const panel = root.querySelector('.notif-debug-panel');
  if (!panel) return;

  const sendBtn = panel.querySelector('.notif-debug-send');
  const statusEl = panel.querySelector('.notif-debug-status');

  if (!sendBtn) return;

  sendBtn.addEventListener('click', async () => {
    const userSelect = panel.querySelector('[name="debugUser"]');
    const categorySelect = panel.querySelector('[name="debugCategory"]');
    const subjectInput = panel.querySelector('[name="debugSubject"]');
    const bodyInput = panel.querySelector('[name="debugBody"]');

    const recipientUsername = userSelect instanceof HTMLSelectElement ? userSelect.value : '';
    const category = categorySelect instanceof HTMLSelectElement ? categorySelect.value : '';
    const subject = subjectInput instanceof HTMLInputElement ? subjectInput.value.trim() : '';
    const body = bodyInput instanceof HTMLTextAreaElement ? bodyInput.value.trim() : '';

    if (!recipientUsername || !category || !subject || !body) {
      if (statusEl) statusEl.textContent = i18n.t('ui.app.admin.notif.debug_missing_fields');
      return;
    }

    if (statusEl) statusEl.textContent = '';
    const res = await apiFetch('/api/v1/notifications/send', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ recipientUsername, category, subject, body }),
    });

    if (statusEl) {
      statusEl.textContent = res.ok
        ? i18n.t('ui.app.admin.notif.debug_sent')
        : i18n.t('ui.app.admin.notif.debug_send_failed');
    }
  });
}

let [modules, integrityRows] = await Promise.all([loadModules(), loadIntegrity()]);
let providers = await loadProviders();
let [categories, users] = await Promise.all([loadCategories(), loadUsers()]);
let composer;

const securitySection = initSecuritySection(root, { i18n });

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
        {
          id: 'notifications-debug',
          label: i18n.t('ui.app.admin.notif.debug'),
          pinned: true,
          render: () => renderNotificationsDebugContent(users, categories),
        },
      ],
      onRender: () => {
        bindProviderEntries();
        bindNotificationsDebug();
      },
    },
  },
  {
    id: 'security',
    label: i18n.t('ui.app.admin.security.title'),
    subComposerOptions: {
      allowCustomization: false,
      preferenceKey: 'administration-security-layout',
      heading: i18n.t('ui.app.admin.security.title'),
      elements: [
        {
          id: 'security-content',
          label: i18n.t('ui.app.admin.security.title'),
          pinned: true,
          render: () => securitySection.renderContent(),
        },
      ],
      onRender: () => {
        securitySection.init();
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
          <li><button data-composer-scroll="security">${i18n.t('ui.app.admin.security.title')}</button></li>
        </ul>
      `,
    },
  ],
});
await composer.init();


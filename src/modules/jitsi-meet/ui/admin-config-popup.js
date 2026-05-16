export async function openModuleConfigPopup({ i18n, apiFetch, openPopup, showToast, escapeHtml }) {
  const configResponse = await apiFetch('/api/v1/modules/jitsi-meet/config');
  const configPayload = await configResponse.json().catch(() => ({ data: {} }));
  const config = configPayload?.data ?? {};

  let popupOverlay = null;
  const action = await openPopup({
    title: i18n.t('module.jitsi_meet.admin.config.title'),
    body: () => `
      <label class="provider-option-row">
        <span class="provider-option-label">${escapeHtml(i18n.t('module.jitsi_meet.admin.config.instance_url'))}</span>
        <input id="jitsi-instance-url" type="url" value="${escapeHtml(config.instanceUrl ?? '')}" placeholder="https://jitsi.example.com" />
      </label>
      <label class="provider-option-row">
        <span class="provider-option-label">${escapeHtml(i18n.t('module.jitsi_meet.admin.config.meeting_prefix'))}</span>
        <input id="jitsi-meeting-prefix" type="text" value="${escapeHtml(config.meetingPrefix ?? '')}" placeholder="classroom" />
      </label>
      <p class="admin-inline-note">${escapeHtml(i18n.t('module.jitsi_meet.admin.config.note'))}</p>
    `,
    actions: [
      {
        id: 'save',
        label: i18n.t('ui.reuse.save'),
        variant: 'confirm',
      },
      {
        id: 'cancel',
        label: i18n.t('ui.reuse.cancel'),
        variant: 'cancel',
      },
    ],
    onOpen: (overlay) => {
      popupOverlay = overlay;
    },
  });

  if (action !== 'save' || !(popupOverlay instanceof HTMLElement)) return false;

  const instanceInput = popupOverlay.querySelector('#jitsi-instance-url');
  const prefixInput = popupOverlay.querySelector('#jitsi-meeting-prefix');
  const instanceUrl = instanceInput instanceof HTMLInputElement ? instanceInput.value.trim() : '';
  const meetingPrefix = prefixInput instanceof HTMLInputElement ? prefixInput.value.trim() : '';

  const saveResponse = await apiFetch('/api/v1/modules/jitsi-meet/config', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      instanceUrl,
      meetingPrefix,
    }),
  });

  if (!saveResponse.ok) {
    showToast(i18n.t('module.jitsi_meet.admin.config.save_failed'), {
      variant: 'error',
    });
    return false;
  }

  showToast(i18n.t('module.jitsi_meet.admin.config.save_success'), {
    variant: 'success',
  });
  return true;
}

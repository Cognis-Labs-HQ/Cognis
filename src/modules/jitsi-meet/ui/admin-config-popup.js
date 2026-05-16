import { openModuleSettingsPopup } from "/static/reuse/module-settings-popup.js";

export async function openModuleConfigPopup({
    i18n,
    apiFetch,
    openPopup,
    showToast,
    escapeHtml,
}) {
    return openModuleSettingsPopup({
        i18n,
        apiFetch,
        openPopup,
        showToast,
        escapeHtml,
        loadUrl: "/api/v1/modules/jitsi-meet/config",
        saveUrl: "/api/v1/modules/jitsi-meet/config",
        titleKey: "module.jitsi_meet.admin.config.title",
        noteKey: "module.jitsi_meet.admin.config.note",
        successKey: "module.jitsi_meet.admin.config.save_success",
        failedKey: "module.jitsi_meet.admin.config.save_failed",
        fields: [
            {
                id: "jitsi-instance-url",
                configKey: "instanceUrl",
                labelKey: "module.jitsi_meet.admin.config.instance_url",
                placeholderKey:
                    "module.jitsi_meet.admin.config.instance_url_placeholder",
                type: "url",
            },
            {
                id: "jitsi-meeting-prefix",
                configKey: "meetingPrefix",
                labelKey: "module.jitsi_meet.admin.config.meeting_prefix",
                placeholderKey:
                    "module.jitsi_meet.admin.config.meeting_prefix_placeholder",
                type: "text",
            },
        ],
    });
}

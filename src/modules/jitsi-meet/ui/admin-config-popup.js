import { openModuleSettingsPopup } from "/static/reuse/module-settings-popup.js";
import { createI18n } from "/static/reuse/i18n.js";

export async function openModuleConfigPopup({
    i18n,
    apiFetch,
    openPopup,
    showToast,
    escapeHtml,
    isEnabled,
    setEnabled,
}) {
    const moduleI18n = await createI18n({
        locale: i18n?.locale,
        componentStringBaseUrls: ["/static/modules/jitsi-meet/languages"],
    });
    return openModuleSettingsPopup({
        i18n: moduleI18n,
        apiFetch,
        openPopup,
        showToast,
        escapeHtml,
        loadUrl: "/api/v1/modules/jitsi-meet/config",
        saveUrl: "/api/v1/modules/jitsi-meet/config",
        titleKey: "module.jitsi_meet.admin.config.title",
        noteKey: "module.jitsi_meet.admin.config.note",
        loadFailedKey: "module.jitsi_meet.admin.config.load_failed",
        successKey: "module.jitsi_meet.admin.config.save_success",
        failedKey: "module.jitsi_meet.admin.config.save_failed",
        powerState: {
            enabled: isEnabled === true,
            labelKey: "ui.reuse.enable",
            onChange: setEnabled,
        },
        fields: [
            {
                id: "jitsi-instance-url",
                configKey: "instanceUrl",
                labelKey: "module.jitsi_meet.admin.config.instance_url",
                descriptionKey:
                    "module.jitsi_meet.admin.config.instance_url_description",
                placeholderKey:
                    "module.jitsi_meet.admin.config.instance_url_placeholder",
                type: "url",
            },
            {
                id: "jitsi-meeting-prefix",
                configKey: "meetingPrefix",
                labelKey: "module.jitsi_meet.admin.config.meeting_prefix",
                descriptionKey:
                    "module.jitsi_meet.admin.config.meeting_prefix_description",
                placeholderKey:
                    "module.jitsi_meet.admin.config.meeting_prefix_placeholder",
                type: "text",
            },
        ],
    });
}

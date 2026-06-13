import { openModuleSettingsPopup } from "/static/reuse/module-settings-popup.js";
import { createI18n } from "/static/reuse/i18n.js";

export async function openModuleConfigPopup({
    i18n,
    apiFetch,
    openPopup,
    showToast,
    escapeHtml,
}) {
    const moduleI18n = await createI18n({
        locale: i18n?.locale,
        componentStringBaseUrls: [
            "/static/modules/nextcloud-whiteboard/languages",
        ],
    });
    return openModuleSettingsPopup({
        i18n: moduleI18n,
        apiFetch,
        openPopup,
        showToast,
        escapeHtml,
        loadUrl: "/api/v1/modules/nextcloud-whiteboard/config",
        saveUrl: "/api/v1/modules/nextcloud-whiteboard/config",
        titleKey: "module.nextcloud_whiteboard.admin.config.title",
        noteKey: "module.nextcloud_whiteboard.admin.config.note",
        loadFailedKey: "module.nextcloud_whiteboard.admin.config.load_failed",
        successKey: "module.nextcloud_whiteboard.admin.config.save_success",
        failedKey: "module.nextcloud_whiteboard.admin.config.save_failed",
        fields: [
            {
                id: "nextcloud-whiteboard-url",
                configKey: "whiteboardUrl",
                labelKey: "module.nextcloud_whiteboard.admin.config.url",
                descriptionKey:
                    "module.nextcloud_whiteboard.admin.config.url_description",
                placeholderKey:
                    "module.nextcloud_whiteboard.admin.config.url_placeholder",
                type: "url",
            },
            {
                id: "nextcloud-whiteboard-secret",
                configKey: "whiteboardSecret",
                labelKey: "module.nextcloud_whiteboard.admin.config.secret",
                descriptionKey:
                    "module.nextcloud_whiteboard.admin.config.secret_description",
                placeholderKey:
                    "module.nextcloud_whiteboard.admin.config.secret_placeholder",
                type: "text",
            },
            {
                id: "nextcloud-whiteboard-token-expiry",
                configKey: "tokenExpirySeconds",
                labelKey:
                    "module.nextcloud_whiteboard.admin.config.token_expiry",
                descriptionKey:
                    "module.nextcloud_whiteboard.admin.config.token_expiry_description",
                placeholderKey:
                    "module.nextcloud_whiteboard.admin.config.token_expiry_placeholder",
                type: "text",
                serialize: (value) => {
                    return Number.parseInt(value, 10);
                },
            },
        ],
    });
}

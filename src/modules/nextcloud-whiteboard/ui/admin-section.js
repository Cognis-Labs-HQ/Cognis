import { createI18n } from "/static/reuse/i18n.js";
import { openModuleSettingsPopup } from "/static/reuse/module-settings-popup.js";

const API_BASE = "/api/v1/modules/nextcloud-whiteboard";

export async function mount(root) {
    const configResponse = await fetch(`${API_BASE}/config`, {
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
    });
    const configPayload = await configResponse.json().catch(() => ({}));
    if (!configResponse.ok) {
        throw new Error(configPayload?.error?.message ?? "Request failed.");
    }
    const config = configPayload.data;
    root.innerHTML = "";
    const form = document.createElement("form");
    form.className = "whiteboard-admin";
    const heading = document.createElement("h2");
    heading.textContent =
        window.CognisI18n?.t?.("module.nextcloud_whiteboard.admin_title") ??
        "module.nextcloud_whiteboard.admin_title";
    const serverUrlLabel = document.createElement("label");
    const serverUrlText = document.createElement("span");
    serverUrlText.textContent = window.CognisI18n?.t?.(
        "module.nextcloud_whiteboard.server_url",
    );
    const serverUrlInput = document.createElement("input");
    serverUrlInput.name = "serverUrl";
    serverUrlInput.type = "url";
    serverUrlInput.required = true;
    serverUrlInput.value = config.serverUrl ?? "";
    serverUrlLabel.append(serverUrlText, serverUrlInput);
    const keyLabel = document.createElement("label");
    const keyText = document.createElement("span");
    keyText.textContent = window.CognisI18n?.t?.(
        "module.nextcloud_whiteboard.api_key",
    );
    const keyInput = document.createElement("input");
    keyInput.name = "apiKey";
    keyInput.type = "password";
    keyInput.required = true;
    keyInput.autocomplete = "new-password";
    keyLabel.append(keyText, keyInput);
    const uploadLimitLabel = document.createElement("label");
    const uploadLimitText = document.createElement("span");
    uploadLimitText.textContent = text(
        "module.nextcloud_whiteboard.image_upload_limit",
    );
    const uploadLimitInput = document.createElement("input");
    uploadLimitInput.name = "imageUploadMaxBytes";
    uploadLimitInput.type = "number";
    uploadLimitInput.min = "0";
    uploadLimitInput.step = "1024";
    uploadLimitInput.value = config.imageUploadMaxBytes ?? 1048576;
    uploadLimitLabel.append(uploadLimitText, uploadLimitInput);
    const submitButton = document.createElement("button");
    submitButton.type = "submit";
    submitButton.textContent = window.CognisI18n?.t?.("ui.reuse.save");
    form.append(
        heading,
        serverUrlLabel,
        keyLabel,
        uploadLimitLabel,
        submitButton,
    );
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const formData = new FormData(form);
        const saveResponse = await fetch(`${API_BASE}/config`, {
            credentials: "same-origin",
            headers: { "content-type": "application/json" },
            method: "POST",
            body: JSON.stringify({
                serverUrl: formData.get("serverUrl"),
                apiKey: formData.get("apiKey"),
                imageUploadMaxBytes: formData.get("imageUploadMaxBytes"),
            }),
        });
        if (!saveResponse.ok) {
            const savePayload = await saveResponse.json().catch(() => ({}));
            throw new Error(savePayload?.error?.message ?? "Request failed.");
        }
    });
    root.append(form);
}

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
        titleKey: "module.nextcloud_whiteboard.admin_title",
        noteKey: "module.nextcloud_whiteboard.admin_note",
        loadFailedKey: "module.nextcloud_whiteboard.load_failed",
        successKey: "module.nextcloud_whiteboard.save_success",
        failedKey: "module.nextcloud_whiteboard.save_failed",
        powerState: {
            enabled: isEnabled === true,
            labelKey: "ui.reuse.enable",
            onChange: setEnabled,
        },
        enableTest: {
            url: "/api/v1/modules/nextcloud-whiteboard/admin/enable-test",
            failedKey: "module.nextcloud_whiteboard.enable_test_failed",
        },
        fields: [
            {
                id: "nextcloud-whiteboard-server-url",
                configKey: "serverUrl",
                labelKey: "module.nextcloud_whiteboard.server_url",
                descriptionKey:
                    "module.nextcloud_whiteboard.server_url_description",
                placeholderKey:
                    "module.nextcloud_whiteboard.server_url_placeholder",
                type: "url",
            },
            {
                id: "nextcloud-whiteboard-image-upload-limit",
                configKey: "imageUploadMaxBytes",
                labelKey: "module.nextcloud_whiteboard.image_upload_limit",
                descriptionKey:
                    "module.nextcloud_whiteboard.image_upload_limit_description",
                placeholderKey:
                    "module.nextcloud_whiteboard.image_upload_limit_placeholder",
                type: "number",
            },
            {
                id: "nextcloud-whiteboard-api-key",
                configKey: "apiKey",
                labelKey: "module.nextcloud_whiteboard.api_key",
                descriptionKey:
                    "module.nextcloud_whiteboard.api_key_description",
                placeholderKey:
                    "module.nextcloud_whiteboard.api_key_placeholder",
                type: "password",
            },
        ],
    });
}

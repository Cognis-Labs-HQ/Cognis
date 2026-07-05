import { createI18n } from "/static/reuse/i18n.js";
import { openModuleSettingsPopup } from "/static/reuse/module-settings-popup.js";

const API_BASE = "/api/v1/modules/nextcloud-whiteboard";

async function readJson(response) {
    const payload = await response.json().catch(() => ({}));
    if (!response.ok)
        throw new Error(payload?.error?.message ?? "Request failed.");
    return payload.data;
}

async function request(path, options = {}) {
    return readJson(
        await fetch(`${API_BASE}${path}`, {
            credentials: "same-origin",
            headers: { "content-type": "application/json" },
            ...options,
        }),
    );
}

function text(key) {
    return window.CognisI18n?.t?.(key) ?? key;
}

export async function mount(root) {
    const config = await request("/config");
    root.innerHTML = "";
    const form = document.createElement("form");
    form.className = "whiteboard-admin";
    const heading = document.createElement("h2");
    heading.textContent = text("module.nextcloudWhiteboard.admin_title");
    const urlLabel = document.createElement("label");
    const urlText = document.createElement("span");
    urlText.textContent = text("module.nextcloudWhiteboard.instance_url");
    const urlInput = document.createElement("input");
    urlInput.name = "instanceUrl";
    urlInput.type = "url";
    urlInput.required = true;
    urlInput.value = config.instanceUrl ?? "";
    urlLabel.append(urlText, urlInput);
    const keyLabel = document.createElement("label");
    const keyText = document.createElement("span");
    keyText.textContent = text("module.nextcloudWhiteboard.api_key");
    const keyInput = document.createElement("input");
    keyInput.name = "apiKey";
    keyInput.type = "password";
    keyInput.required = true;
    keyInput.autocomplete = "new-password";
    keyLabel.append(keyText, keyInput);
    const submitButton = document.createElement("button");
    submitButton.type = "submit";
    submitButton.textContent = text("ui.reuse.save");
    form.append(heading, urlLabel, keyLabel, submitButton);
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const formData = new FormData(form);
        await request("/config", {
            method: "POST",
            body: JSON.stringify({
                instanceUrl: formData.get("instanceUrl"),
                apiKey: formData.get("apiKey"),
            }),
        });
    });
    root.append(form);
}

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
        titleKey: "module.nextcloudWhiteboard.admin_title",
        noteKey: "module.nextcloudWhiteboard.admin_note",
        loadFailedKey: "module.nextcloudWhiteboard.load_failed",
        successKey: "module.nextcloudWhiteboard.save_success",
        failedKey: "module.nextcloudWhiteboard.save_failed",
        fields: [
            {
                id: "nextcloud-whiteboard-instance-url",
                configKey: "instanceUrl",
                labelKey: "module.nextcloudWhiteboard.instance_url",
                descriptionKey:
                    "module.nextcloudWhiteboard.instance_url_description",
                placeholderKey:
                    "module.nextcloudWhiteboard.instance_url_placeholder",
                type: "url",
            },
            {
                id: "nextcloud-whiteboard-api-key",
                configKey: "apiKey",
                labelKey: "module.nextcloudWhiteboard.api_key",
                descriptionKey:
                    "module.nextcloudWhiteboard.api_key_description",
                placeholderKey:
                    "module.nextcloudWhiteboard.api_key_placeholder",
                type: "text",
            },
        ],
    });
}

export async function openModuleSettingsPopup({
    i18n,
    apiFetch,
    openPopup,
    showToast,
    escapeHtml,
    loadUrl,
    saveUrl,
    titleKey,
    fields,
    noteKey,
    successKey,
    failedKey,
}) {
    const loadResponse = await apiFetch(loadUrl);
    const loadPayload = await loadResponse.json().catch(() => ({ data: {} }));
    const config = loadPayload?.data ?? {};

    let popupOverlay = null;
    const fieldRows = (Array.isArray(fields) ? fields : [])
        .map((field) => {
            const fieldId = String(field.id ?? "").trim();
            if (!fieldId) return "";
            const label = i18n.t(field.labelKey);
            const rawValue = config?.[field.configKey];
            const value = rawValue == null ? "" : String(rawValue);
            const placeholder = field.placeholderKey
                ? i18n.t(field.placeholderKey)
                : "";
            const inputType = field.type === "url" ? "url" : "text";
            return `
      <label class="provider-option-row">
        <span class="provider-option-label">${escapeHtml(label)}</span>
        <input id="${escapeHtml(fieldId)}" type="${escapeHtml(inputType)}" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}" />
      </label>
    `;
        })
        .join("");
    const noteBlock = noteKey
        ? `<p class="admin-inline-note">${escapeHtml(i18n.t(noteKey))}</p>`
        : "";

    const action = await openPopup({
        title: i18n.t(titleKey),
        body: () => `${fieldRows}${noteBlock}`,
        actions: [
            {
                id: "save",
                label: i18n.t("ui.reuse.save"),
                variant: "confirm",
            },
            {
                id: "cancel",
                label: i18n.t("ui.reuse.cancel"),
                variant: "cancel",
            },
        ],
        onOpen: (overlay) => {
            popupOverlay = overlay;
        },
    });

    if (action !== "save" || !(popupOverlay instanceof HTMLElement)) {
        return false;
    }

    const values = {};
    for (const field of fields ?? []) {
        const fieldId = String(field.id ?? "").trim();
        if (!fieldId) continue;
        const input = popupOverlay.querySelector(`#${fieldId}`);
        const rawValue =
            input instanceof HTMLInputElement ? input.value.trim() : "";
        values[field.configKey] =
            typeof field.serialize === "function"
                ? field.serialize(rawValue)
                : rawValue;
    }

    const saveResponse = await apiFetch(saveUrl, {
        method: "POST",
        headers: {
            "content-type": "application/json",
        },
        body: JSON.stringify(values),
    });

    if (!saveResponse.ok) {
        showToast(i18n.t(failedKey), {
            variant: "error",
        });
        return false;
    }

    showToast(i18n.t(successKey), {
        variant: "success",
    });
    return true;
}

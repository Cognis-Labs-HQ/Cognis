export const filesUiClient = Object.freeze({
    resolveNamespacedFileUrl(namespaceId, objectKey) {
        const encodedKey = String(objectKey)
            .split("/")
            .map((part) => encodeURIComponent(part))
            .join("/");
        return `/api/v1/files/${encodeURIComponent(namespaceId)}/${encodedKey}`;
    },
});

async function requireData(apiFetch, url, options) {
    const response = await apiFetch(url, options);
    const payload = await response.json();
    if (!response.ok) {
        throw new Error(payload?.error?.code ?? "files_request_failed");
    }
    return payload.data;
}

export function loadNamespaceQuotaDefaults(apiFetch) {
    return requireData(apiFetch, "/api/v1/files/admin/namespace-defaults");
}

export function updateNamespaceQuotaDefault(apiFetch, namespaceId, quotaBytes) {
    return requireData(
        apiFetch,
        `/api/v1/files/admin/namespace-defaults/${encodeURIComponent(namespaceId)}`,
        {
            method: "PUT",
            body: JSON.stringify({ quotaBytes }),
        },
    );
}

export function updateGlobalQuotaDefault(apiFetch, quotaBytes) {
    return requireData(apiFetch, "/api/v1/files/admin/global-default", {
        method: "PUT",
        body: JSON.stringify({ quotaBytes }),
    });
}

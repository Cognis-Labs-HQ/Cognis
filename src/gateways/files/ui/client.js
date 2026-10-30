import { apiFetch } from "/static/reuse/api-client.js";

export const filesUiClient = Object.freeze({
    resolveNamespacedFileUrl(namespaceId, objectKey) {
        const encodedKey = String(objectKey)
            .split("/")
            .map((part) => encodeURIComponent(part))
            .join("/");
        return `/api/v1/files/${encodeURIComponent(namespaceId)}/${encodedKey}`;
    },
    async listNamespace(namespaceId, prefix = "") {
        const response = await apiFetch(
            `/api/v1/files/${encodeURIComponent(namespaceId)}?prefix=${encodeURIComponent(prefix)}`,
        );
        if (!response.ok) throw new Error("file_list_failed");
        return (await response.json()).data ?? [];
    },
    async uploadAudio(namespaceId, objectKey, file) {
        const header = new TextEncoder().encode(
            `${JSON.stringify({ mediaType: file.type })}\n`,
        );
        const response = await apiFetch(
            this.resolveNamespacedFileUrl(namespaceId, objectKey),
            {
                method: "PUT",
                body: new Blob([header, file], {
                    type: "application/octet-stream",
                }),
            },
        );
        if (!response.ok) throw new Error("file_upload_failed");
        return (await response.json()).data;
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
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ quotaBytes }),
        },
    );
}

export function updateGlobalQuotaDefault(apiFetch, quotaBytes) {
    return requireData(apiFetch, "/api/v1/files/admin/global-default", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ quotaBytes }),
    });
}

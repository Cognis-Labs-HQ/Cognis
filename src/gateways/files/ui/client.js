export const filesUiClient = Object.freeze({
    resolveNamespacedFileUrl(namespaceId, objectKey) {
        const encodedKey = String(objectKey)
            .split("/")
            .map((part) => encodeURIComponent(part))
            .join("/");
        return `/api/v1/files/${encodeURIComponent(namespaceId)}/${encodedKey}`;
    },
});

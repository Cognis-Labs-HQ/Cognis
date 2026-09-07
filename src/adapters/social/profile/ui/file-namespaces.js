export const PROFILE_FILE_NAMESPACE_ID = "profile";

export function buildNamespacedFileUrl(namespaceId, key) {
    return `/api/v1/files/${encodeURIComponent(namespaceId)}/${key}`;
}

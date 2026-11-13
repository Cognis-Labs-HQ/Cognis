export const MESSAGES_FILE_NAMESPACE_ID = "chats";

export function buildNamespacedFileUrl(namespaceId, key) {
    return `/api/v1/files/${encodeURIComponent(namespaceId)}/${key}`;
}

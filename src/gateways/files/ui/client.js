export const filesUiClient = Object.freeze({
    async listLibrary(namespaces = []) {
        const query = new URLSearchParams();
        namespaces.forEach((namespaceId) =>
            query.append("namespace", namespaceId),
        );
        const response = await fetch(
            `/api/v1/files/library${query.size ? `?${query}` : ""}`,
            {
                headers: {
                    authorization: `Bearer ${localStorage.getItem("cognis_access_token") ?? ""}`,
                },
            },
        );
        if (!response.ok) throw new Error(`files_library_${response.status}`);
        return (await response.json()).data;
    },
    async createFolder(name, namespaceId = "user") {
        return fetch("/api/v1/files/library/folders", {
            method: "POST",
            headers: {
                authorization: `Bearer ${localStorage.getItem("cognis_access_token") ?? ""}`,
                "content-type": "application/json",
            },
            body: JSON.stringify({ name, namespaceId }),
        });
    },
    async updateEntry(namespaceId, key, patch) {
        return fetch(
            `/api/v1/files/library/entries/${encodeURIComponent(namespaceId)}/${encodeURIComponent(key)}`,
            {
                method: "PATCH",
                headers: {
                    authorization: `Bearer ${localStorage.getItem("cognis_access_token") ?? ""}`,
                    "content-type": "application/json",
                },
                body: JSON.stringify(patch),
            },
        );
    },
    resolveNamespacedFileUrl(namespaceId, objectKey) {
        const encodedKey = String(objectKey)
            .split("/")
            .map((part) => encodeURIComponent(part))
            .join("/");
        return `/api/v1/files/${encodeURIComponent(namespaceId)}/${encodedKey}`;
    },
});

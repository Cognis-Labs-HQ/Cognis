/** Read image bytes without allocating a URL for an abandoned request. */
export async function readImageBlob(response, { isCurrent, previous }) {
    const blob = await response.blob();
    const digest = new Uint8Array(
        await crypto.subtle.digest("SHA-256", await blob.arrayBuffer()),
    ).join(",");
    if (!isCurrent()) return { state: "stale" };
    return {
        state: "available",
        digest,
        blobUrl:
            previous?.digest === digest && previous.blobUrl
                ? previous.blobUrl
                : URL.createObjectURL(blob),
    };
}

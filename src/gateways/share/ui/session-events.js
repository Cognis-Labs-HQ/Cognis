/** Coordinates share revocation events between active browser tabs. */

const EVENT_NAME = "cognis:share-revoked";
const CHANNEL_NAME = "cognis-share-events";
const channel =
    typeof BroadcastChannel === "function"
        ? new BroadcastChannel(CHANNEL_NAME)
        : null;

channel?.addEventListener("message", (event) => {
    const shareId = String(event.data?.shareId ?? "").trim();
    if (!shareId) return;
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { shareId } }));
});

export function publishShareRevoked(shareId) {
    const normalized = String(shareId ?? "").trim();
    if (!normalized) return;
    window.dispatchEvent(
        new CustomEvent(EVENT_NAME, { detail: { shareId: normalized } }),
    );
    channel?.postMessage({ shareId: normalized });
}

export function listenForShareRevocation(listener) {
    window.addEventListener(EVENT_NAME, (event) => {
        listener(String(event.detail?.shareId ?? "").trim());
    });
}

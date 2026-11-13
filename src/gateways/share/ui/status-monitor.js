import { apiFetch } from "/static/reuse/api-client.js";

const ACTIVE_POLL_INTERVAL_MS = 5_000;
let activeWatch = null;

function schedulePoll() {
    if (!activeWatch || document.hidden) return;
    activeWatch.timer = window.setTimeout(
        pollShareStatus,
        ACTIVE_POLL_INTERVAL_MS,
    );
}

async function pollShareStatus() {
    const watch = activeWatch;
    if (!watch || watch.pending || document.hidden) return;
    watch.pending = true;
    const response = await apiFetch(
        `/api/v1/share/status/${encodeURIComponent(watch.shareId)}`,
        { suppressAccessDeniedEvent: true },
    ).catch(() => null);
    watch.pending = false;
    if (activeWatch !== watch) return;
    if (response && !response.ok) {
        activeWatch = null;
        await watch.onUnavailable(response);
        return;
    }
    schedulePoll();
}

document.addEventListener("visibilitychange", () => {
    if (!activeWatch || document.hidden) return;
    if (activeWatch.timer) clearTimeout(activeWatch.timer);
    activeWatch.timer = null;
    void pollShareStatus();
});

export function stopShareStatusWatch() {
    if (activeWatch?.timer) clearTimeout(activeWatch.timer);
    activeWatch = null;
}

export function watchShareStatus(shareId, onUnavailable) {
    stopShareStatusWatch();
    const normalizedShareId = String(shareId ?? "").trim();
    if (!normalizedShareId || typeof onUnavailable !== "function") return;
    activeWatch = {
        shareId: normalizedShareId,
        onUnavailable,
        pending: false,
        timer: null,
    };
    void pollShareStatus();
}

const href = "/static/gateways/notify-internal/notifications.css";
const attemptKey = Symbol.for("cognis.notify-internal.stylesheet");
const timeoutMs = 5_000;

function observe(link, owned) {
    const attempt = { status: "pending", waiters: new Set() };
    link[attemptKey] = attempt;

    function finish(status) {
        if (attempt.status !== "pending") return;
        attempt.status = status;
        clearTimeout(timeout);
        link.removeEventListener("load", onLoad);
        link.removeEventListener("error", onError);
        if (status !== "loaded") {
            console.error(
                "[notify-internal] notification styles failed to load",
                {
                    component: "notify-internal",
                    operation: "loadStyles",
                    reason: status,
                },
            );
            if (owned) link.remove();
        }
        for (const resolve of attempt.waiters) resolve(status);
        attempt.waiters.clear();
    }

    const onLoad = () => finish("loaded");
    const onError = () => finish("failed");
    const timeout = setTimeout(() => finish("timeout"), timeoutMs);
    link.addEventListener("load", onLoad);
    link.addEventListener("error", onError);
    return attempt;
}

/**
 * Wait for one shared resource attempt without transferring provider ownership.
 * @param {AbortSignal} signal
 * @returns {Promise<"loaded" | "failed" | "timeout" | "aborted">}
 */
export function loadNotificationStyles(signal) {
    if (signal.aborted) return Promise.resolve("aborted");
    const links = [...document.querySelectorAll(`link[href="${href}"]`)];
    if (
        links.some(
            (link) => link.sheet || link[attemptKey]?.status === "loaded",
        )
    )
        return Promise.resolve("loaded");

    const existing = links.find(
        (link) => !link[attemptKey] || link[attemptKey].status === "pending",
    );
    const link = existing || document.createElement("link");
    const attempt = link[attemptKey] || observe(link, !existing);
    const ready = new Promise((resolve) => {
        const finish = (status) => {
            attempt.waiters.delete(finish);
            signal.removeEventListener("abort", abort);
            resolve(status);
        };
        const abort = () => finish("aborted");
        attempt.waiters.add(finish);
        signal.addEventListener("abort", abort, { once: true });
    });
    if (!existing) {
        link.rel = "stylesheet";
        link.href = href;
        document.head.appendChild(link);
    }
    return ready;
}

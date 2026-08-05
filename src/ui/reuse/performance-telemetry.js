/**
 * Collects sampled Web Vitals and SPA timings for the observability gateway.
 *
 * Public exports:
 *   observePerformance() — installs document performance observers once.
 *   recordRouteMount() — records one completed SPA route mount.
 *
 * Usage:
 *   observePerformance();
 *   recordRouteMount('/settings', 42);
 *
 * @param {string} route - Mounted route; deliberately not transmitted as a label.
 * @param {number} durationMs - Route mount duration in milliseconds.
 * @returns {void}
 */

const SAMPLE_RATE = 0.1;
const sampled = Math.random() < SAMPLE_RATE;
const metrics = new Map();
let installed = false;

function send(navigation) {
    if (!sampled || metrics.size === 0) return;
    const payload = JSON.stringify({
        navigation,
        metrics: Array.from(metrics, ([name, value]) => ({ name, value })),
    });
    metrics.clear();
    if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/v1/observability/client", payload);
        return;
    }
    void fetch("/api/v1/observability/client", {
        method: "POST",
        body: payload,
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        keepalive: true,
    });
}

export function observePerformance() {
    if (!sampled || installed || !("PerformanceObserver" in window)) return;
    installed = true;
    const navigation = performance.getEntriesByType("navigation")[0];
    if (navigation) metrics.set("web.ttfb_ms", navigation.responseStart);
    const resources = performance.getEntriesByType("resource");
    metrics.set("web.resource_count", resources.length);
    metrics.set(
        "web.transfer_bytes",
        resources.reduce(
            (total, resource) => total + (resource.transferSize || 0),
            0,
        ),
    );
    let cls = 0;
    for (const [type, callback] of [
        [
            "largest-contentful-paint",
            (entry) => metrics.set("web.lcp_ms", entry.startTime),
        ],
        [
            "event",
            (entry) =>
                metrics.set(
                    "web.inp_ms",
                    Math.max(metrics.get("web.inp_ms") || 0, entry.duration),
                ),
        ],
        [
            "layout-shift",
            (entry) => {
                if (!entry.hadRecentInput) cls += entry.value;
                metrics.set("web.cls", cls);
            },
        ],
    ]) {
        try {
            new PerformanceObserver((list) =>
                list.getEntries().forEach(callback),
            ).observe({
                type,
                buffered: true,
                durationThreshold: type === "event" ? 40 : undefined,
            });
        } catch {
            // Continue with the next observer type in the loop above.
        }
    }
    window.addEventListener("pagehide", () => send("document"), { once: true });
}

export function recordRouteMount(_route, durationMs) {
    if (!sampled) return;
    metrics.set("web.route_mount_ms", durationMs);
    send("spa");
}

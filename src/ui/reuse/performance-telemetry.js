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
const documentMetrics = new Map();
let installed = false;

function send(navigation, metrics) {
    if (!sampled || metrics.size === 0) return;
    const accessToken = localStorage.getItem("cognis_access_token");
    if (!accessToken) {
        metrics.clear();
        return;
    }
    if (navigation === "document") {
        const resources = performance.getEntriesByType("resource");
        metrics.set("web.resource_count", resources.length);
        metrics.set(
            "web.transfer_bytes",
            resources.reduce(
                (total, resource) => total + (resource.transferSize || 0),
                0,
            ),
        );
    }
    const payload = JSON.stringify({
        navigation,
        metrics: Array.from(metrics, ([name, value]) => ({ name, value })),
    });
    metrics.clear();
    void fetch("/api/v1/observability/client", {
        method: "POST",
        body: payload,
        headers: {
            authorization: `Bearer ${accessToken}`,
            "content-type": "application/json",
        },
        credentials: "same-origin",
        keepalive: true,
    });
}

export function observePerformance() {
    if (!sampled || installed || !("PerformanceObserver" in window)) return;
    installed = true;
    const navigation = performance.getEntriesByType("navigation")[0];
    if (navigation)
        documentMetrics.set("web.ttfb_ms", navigation.responseStart);
    let clsMaximum = 0;
    let clsWindowValue = 0;
    let clsWindowStartedAt = 0;
    let clsPreviousShiftAt = 0;
    observerTypes: for (const [type, callback] of [
        [
            "largest-contentful-paint",
            (entry) => documentMetrics.set("web.lcp_ms", entry.startTime),
        ],
        [
            "event",
            (entry) =>
                documentMetrics.set(
                    "web.inp_ms",
                    Math.max(
                        documentMetrics.get("web.inp_ms") || 0,
                        entry.duration,
                    ),
                ),
        ],
        [
            "layout-shift",
            (entry) => {
                if (entry.hadRecentInput) return;
                if (
                    entry.startTime - clsPreviousShiftAt > 1_000 ||
                    entry.startTime - clsWindowStartedAt > 5_000
                ) {
                    clsWindowStartedAt = entry.startTime;
                    clsWindowValue = 0;
                }
                clsPreviousShiftAt = entry.startTime;
                clsWindowValue += entry.value;
                clsMaximum = Math.max(clsMaximum, clsWindowValue);
                documentMetrics.set("web.cls", clsMaximum);
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
            // Alternate flow: observerTypes continues at its next iteration.
            continue observerTypes;
        }
    }
    window.addEventListener(
        "pagehide",
        () => send("document", documentMetrics),
        {
            once: true,
        },
    );
}

export function recordRouteMount(_route, durationMs) {
    if (!sampled) return;
    send("spa", new Map([["web.route_mount_ms", durationMs]]));
}

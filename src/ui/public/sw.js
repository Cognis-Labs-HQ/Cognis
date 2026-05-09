/*
 * Cognis service worker.
 *
 * Provides the network behaviour required for Chrome / Firefox PWA install:
 *   - precaches a small "app shell" (the dashboard HTML stub and its baseline
 *     stylesheet/icon) so the app boots when the user is offline;
 *   - serves navigation requests with a network-first strategy that falls back
 *     to the cached shell;
 *   - serves /static/ asset requests with a stale-while-revalidate strategy so
 *     repeat visits feel instant;
 *   - never intercepts /api/* requests — those always go to the network so the
 *     user sees an authentic failure rather than stale data.
 *
 * Bump CACHE_VERSION on any meaningful change to this file or the precached
 * asset list so existing clients pick up the new worker on next visit.
 */

const CACHE_VERSION = "v1";
const SHELL_CACHE = `cognis-shell-${CACHE_VERSION}`;
const ASSET_CACHE = `cognis-assets-${CACHE_VERSION}`;

const SHELL_URLS = [
    "/dashboard",
    "/static/assets/icons/cognis-icon.png",
    "/static/assets/icons/cognis-icon-192.png",
    "/static/assets/icons/cognis-icon-512.png",
    "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches
            .open(SHELL_CACHE)
            .then((cache) =>
                Promise.all(
                    SHELL_URLS.map((url) =>
                        cache
                            .add(
                                new Request(url, {
                                    credentials: "same-origin",
                                }),
                            )
                            .catch(() => {
                                // Precache failures (e.g. unauthenticated /dashboard
                                // returning a 302) are non-fatal; the runtime
                                // strategies below will still cache successful
                                // responses on first visit.
                            }),
                    ),
                ),
            )
            .then(() => self.skipWaiting()),
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(
                    keys
                        .filter(
                            (key) => key !== SHELL_CACHE && key !== ASSET_CACHE,
                        )
                        .map((key) => caches.delete(key)),
                ),
            )
            .then(() => self.clients.claim()),
    );
});

self.addEventListener("message", (event) => {
    if (event.data && event.data.type === "SKIP_WAITING") {
        self.skipWaiting();
    }
});

function isNavigationRequest(request) {
    return (
        request.mode === "navigate" ||
        (request.method === "GET" &&
            request.headers.get("accept")?.includes("text/html"))
    );
}

async function networkFirstShell(request) {
    try {
        const response = await fetch(request);
        if (response && response.ok && request.method === "GET") {
            const cache = await caches.open(SHELL_CACHE);
            cache.put(request, response.clone()).catch(() => {});
        }
        return response;
    } catch (error) {
        const cached = await caches.match(request);
        if (cached) return cached;
        const fallback = await caches.match("/dashboard");
        if (fallback) return fallback;
        throw error;
    }
}

async function staleWhileRevalidate(request) {
    const cache = await caches.open(ASSET_CACHE);
    const cached = await cache.match(request);
    const networkPromise = fetch(request)
        .then((response) => {
            if (response && response.ok) {
                cache.put(request, response.clone()).catch(() => {});
            }
            return response;
        })
        .catch(() => null);
    return cached || (await networkPromise) || fetch(request);
}

self.addEventListener("fetch", (event) => {
    const request = event.request;
    if (request.method !== "GET") return;

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;

    if (url.pathname.startsWith("/api/")) return;

    if (isNavigationRequest(request)) {
        event.respondWith(networkFirstShell(request));
        return;
    }

    if (
        url.pathname.startsWith("/static/") ||
        url.pathname === "/manifest.webmanifest"
    ) {
        event.respondWith(staleWhileRevalidate(request));
    }
});

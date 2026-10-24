/* Public assets only. API requests and authenticated documents stay network-only. */
const CACHE_VERSION = "v7";
const CACHE_PREFIX = "cognis-offline-";
const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`;
const SHELL_URL = "/static/pages/offline.html";
const CATALOG_URL = "/__cognis_offline_catalog__";
let catalogPromise;
let catalogGeneration = 0;

function fetchAvailable(request, options = {}) {
    const timeout = AbortSignal.timeout(4000);
    const signal = request.signal
        ? AbortSignal.any([request.signal, timeout])
        : timeout;
    return fetch(request, { ...options, signal });
}

function cacheable(response) {
    return (
        response?.ok &&
        !response.redirected &&
        !/private|no-store/i.test(response.headers.get("cache-control") ?? "")
    );
}

async function catalog() {
    if (!catalogPromise) {
        catalogPromise = (async () => {
            const cache = await caches.open(CACHE_NAME);
            const response = await cache.match(CATALOG_URL);
            return response ? response.json() : [];
        })().catch((error) => {
            catalogPromise = null;
            throw error;
        });
    }
    return catalogPromise;
}

function routeAssets(route) {
    return [
        ...new Set([
            route.scriptUrl,
            ...(route.stylesheets ?? []),
            ...(route.capabilityScripts ?? []),
            ...(route.offline?.assets ?? []),
        ]),
    ].filter(
        (asset) =>
            typeof asset === "string" &&
            (asset.startsWith("/static/") || asset.startsWith("/assets/")),
    );
}

async function refreshCatalog() {
    const generation = ++catalogGeneration;
    const response = await fetch("/api/v1/ui/offline-routes", {
        credentials: "omit",
        cache: "no-store",
    });
    if (!response.ok) throw new Error("offline_catalog_unavailable");
    const payload = await response.json();
    const routes = (payload.data ?? []).filter(
        (route) =>
            route.public === true && Array.isArray(route.offline?.assets),
    );
    if (generation !== catalogGeneration) return [];
    const cache = await caches.open(CACHE_NAME);
    const allowed = new Set(
        routes
            .flatMap(routeAssets)
            .map((asset) => new URL(asset, self.location.origin).href),
    );
    for (const request of await cache.keys()) {
        if (
            new URL(request.url).pathname.startsWith("/static/modules/") &&
            !allowed.has(request.url)
        ) {
            await cache.delete(request);
        }
    }
    await cache.put(
        CATALOG_URL,
        new Response(JSON.stringify(routes), {
            headers: { "content-type": "application/json" },
        }),
    );
    catalogPromise = Promise.resolve(routes);
    return routes;
}

async function announceOffline() {
    for (const client of await self.clients.matchAll()) {
        client.postMessage({ type: "COGNIS_OFFLINE" });
    }
}

self.addEventListener("install", (event) => {
    event.waitUntil(
        (async () => {
            const response = await fetch("/static/offline-manifest.json", {
                cache: "no-store",
                credentials: "omit",
            });
            if (!response.ok)
                throw new Error("offline_boot_manifest_unavailable");
            const assets = await response.json();
            const cache = await caches.open(CACHE_NAME);
            await Promise.all(
                [
                    SHELL_URL,
                    "/static/assets/icons/cognis-icon-192.png",
                    "/static/assets/icons/cognis-icon-512.png",
                    ...assets,
                ].map(async (asset) => {
                    const resource = await fetch(asset, {
                        credentials: "omit",
                        cache: "reload",
                    });
                    if (!cacheable(resource))
                        throw new Error("offline_boot_asset_unavailable");
                    await cache.put(asset, resource);
                }),
            );
            await refreshCatalog();
        })(),
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        (async () => {
            for (const key of await caches.keys()) {
                if (
                    (key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME) ||
                    /^cognis-(shell|assets|app)-v\d+$/.test(key)
                )
                    await caches.delete(key);
            }
            await self.clients.claim();
        })(),
    );
});

self.addEventListener("message", (event) => {
    const reply = event.ports?.[0];
    const task = (async () => {
        if (event.data?.type === "COGNIS_OFFLINE_ROUTES") {
            const cache = await caches.open(CACHE_NAME);
            const routes = await catalog();
            return Promise.all(
                routes.map(async (route) => ({
                    ...route,
                    offlineAvailable: (
                        await Promise.all(
                            routeAssets(route).map((asset) =>
                                cache.match(asset),
                            ),
                        )
                    ).every(Boolean),
                })),
            );
        }
        if (event.data?.type === "COGNIS_INVALIDATE_OFFLINE_ROUTES") {
            const cache = await caches.open(CACHE_NAME);
            catalogGeneration += 1;
            catalogPromise = Promise.resolve([]);
            await cache.delete(CATALOG_URL);
            for (const request of await cache.keys()) {
                if (
                    new URL(request.url).pathname.startsWith("/static/modules/")
                )
                    await cache.delete(request);
            }
            return [];
        }
        if (event.data?.type === "COGNIS_REFRESH_OFFLINE_ROUTES")
            return refreshCatalog();
        return null;
    })();
    event.waitUntil(
        task
            .then((result) => reply?.postMessage({ result }))
            .catch((error) => {
                console.error(
                    "[cognis-sw] offline catalog operation failed",
                    error,
                );
                reply?.postMessage({ error: "offline_catalog_unavailable" });
            }),
    );
});

async function assetResponse(request, moduleAsset) {
    const generation = catalogGeneration;
    if (request.headers?.has("authorization")) return fetch(request);
    const parameters = new URL(request.url).searchParams;
    if ([...parameters.keys()].some((key) => !["v", "revision"].includes(key)))
        return fetch(request);
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    // Only content-hashed production files are immutable, never arbitrary ?v= URLs.
    const immutable =
        /^\/assets\/(?:chunks\/|media\/)?[^/]+-[A-Z0-9]{8}\.(?:js|css|svg|png|webp)$/.test(
            new URL(request.url).pathname,
        );
    if (cached && immutable) return cached;
    try {
        const response = await fetchAvailable(
            request,
            moduleAsset
                ? { cache: "no-store", credentials: "omit" }
                : undefined,
        );
        if ([502, 503, 504].includes(response.status))
            throw new Error("server_unavailable");
        if (
            cacheable(response) &&
            (!moduleAsset ||
                (generation === catalogGeneration &&
                    parameters.has("revision") &&
                    response.headers.get("x-cognis-module-revision") ===
                        parameters.get("revision")))
        )
            await cache.put(request, response.clone()).catch((error) => {
                console.error(
                    "[cognis-sw] public asset cache write failed",
                    error,
                );
            });
        return response;
    } catch (error) {
        if (request.signal?.aborted) throw error;
        await announceOffline();
        if (cached && (!moduleAsset || generation === catalogGeneration))
            return cached;
        throw error;
    }
}

self.addEventListener("fetch", (event) => {
    const request = event.request;
    const url = new URL(request.url);
    if (
        request.method !== "GET" ||
        url.origin !== self.location.origin ||
        url.pathname.startsWith("/api/")
    )
        return;
    if (request.mode === "navigate") {
        event.respondWith(
            fetchAvailable(request)
                .then((response) => {
                    if ([502, 503, 504].includes(response.status))
                        throw new Error("server_unavailable");
                    return response;
                })
                .catch(async (error) => {
                    if (request.signal?.aborted) throw error;
                    await announceOffline();
                    const cache = await caches.open(CACHE_NAME);
                    const shell = await cache.match(SHELL_URL);
                    if (shell) return shell;
                    throw error;
                }),
        );
        return;
    }
    if (url.pathname.startsWith("/static/modules/")) {
        event.respondWith(
            (async () => {
                const allowed = (await catalog()).some((route) =>
                    routeAssets(route).some(
                        (asset) =>
                            new URL(asset, self.location.origin).href ===
                            url.href,
                    ),
                );
                if (!allowed) return fetch(request, { cache: "no-store" });
                return assetResponse(request, true);
            })(),
        );
        return;
    }
    if (
        url.pathname.startsWith("/static/") ||
        url.pathname.startsWith("/assets/") ||
        url.pathname === "/manifest.webmanifest"
    ) {
        event.respondWith(assetResponse(request, false));
    }
});

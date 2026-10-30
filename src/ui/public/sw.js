/* Public assets only. API requests and authenticated documents stay network-only. */
const CACHE_VERSION = "v13";
const CACHE_PREFIX = "cognis-offline-";
const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`;
const CONTROL_CACHE_NAME = `${CACHE_NAME}-control`;
const SHELL_URL = "/static/pages/offline.html";
const CATALOG_URL = "/__cognis_offline_catalog__";
const REQUIREMENTS_URL = "/__cognis_offline_requirements__";
const ACCESS_URL = "/__cognis_offline_access__";
const PREFERENCE_URL = "/__cognis_offline_preference__";
const IMMUTABLE_ASSET =
    /^\/assets\/(?:chunks\/|media\/)?[^/]+-[A-Z0-9]{8}\.(?:js|css|svg|png|webp|xml|ttf)$/;

async function offlineEnabled() {
    const cache = await caches.open(CONTROL_CACHE_NAME);
    const preference = await cache.match(PREFERENCE_URL);
    if (preference && (await preference.json()).enabled === false) return false;
    const requirements = await cache.match(REQUIREMENTS_URL);
    if (!requirements) return false;
    if (!(await requirements.json()).length) return true;
    const access = await cache.match(ACCESS_URL);
    return Boolean(access && (await access.json()).allowed === true);
}

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
        response?.status === 200 &&
        !response.redirected &&
        !/private|no-store/i.test(response.headers.get("cache-control") ?? "")
    );
}

async function catalog() {
    if (!catalogPromise) {
        catalogPromise = (async () => {
            const cache = await caches.open(CONTROL_CACHE_NAME);
            const response = await cache.match(CATALOG_URL);
            return response ? response.json() : [];
        })().catch((error) => {
            catalogPromise = null;
            throw error;
        });
    }
    return catalogPromise;
}

function assetKey(request) {
    const url = new URL(
        typeof request === "string" ? request : request.url,
        self.location.origin,
    );
    if (
        !url.pathname.startsWith("/static/modules/") ||
        url.searchParams.has("revision")
    ) {
        url.searchParams.delete("v");
    }
    return url.href;
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

async function refreshCatalog(waitUntil) {
    const generation = ++catalogGeneration;
    const response = await fetchAvailable("/api/v1/ui/offline-routes", {
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
    const control = await caches.open(CONTROL_CACHE_NAME);
    await control.put(REQUIREMENTS_URL, Response.json(payload.offlineGuards));
    await control.put(
        CATALOG_URL,
        new Response(JSON.stringify(routes), {
            headers: { "content-type": "application/json" },
        }),
    );
    catalogPromise = Promise.resolve(routes);
    const cleanup = (async () => {
        const cache = await caches.open(CACHE_NAME);
        const allowed = new Set(routes.flatMap(routeAssets).map(assetKey));
        for (const request of await cache.keys()) {
            if (generation !== catalogGeneration) return;
            if (
                new URL(request.url).pathname.startsWith("/static/modules/") &&
                !allowed.has(request.url)
            )
                await cache.delete(request);
        }
    })();
    if (waitUntil) waitUntil(cleanup);
    else await cleanup;
    return routes;
}

let connectionProbe;
let connectionUnavailable = false;
async function announceOffline() {
    if (connectionUnavailable) return;
    connectionProbe ??= fetchAvailable(
        new Request(`${self.location.origin}/api/v1/system/healthcheck`),
        { cache: "no-store" },
    )
        .then(
            (response) => [502, 503, 504].includes(response.status),
            () => true,
        )
        .finally(() => {
            connectionProbe = null;
        });
    if (!(await connectionProbe)) return;
    connectionUnavailable = true;
    for (const client of await self.clients.matchAll()) {
        client.postMessage({ type: "COGNIS_OFFLINE" });
    }
}

self.addEventListener("install", (event) => {
    event.waitUntil(
        (async () => {
            const response = await fetchAvailable(
                "/static/offline-manifest.json",
                {
                    cache: "no-store",
                    credentials: "omit",
                },
            );
            if (!response.ok)
                throw new Error("offline_boot_manifest_unavailable");
            const assets = await response.json();
            const cache = await caches.open(CACHE_NAME);
            const previousCaches = await Promise.all(
                (await caches.keys())
                    .filter(
                        (name) =>
                            name.startsWith(CACHE_PREFIX) &&
                            !name.endsWith("-control"),
                    )
                    .map((name) => caches.open(name)),
            );
            const bootAssets = [
                ...new Set([
                    SHELL_URL,
                    "/manifest.webmanifest",
                    "/static/assets/icons/cognis-icon-192.png",
                    "/static/assets/icons/cognis-icon-384.png",
                    "/static/assets/icons/cognis-icon-512.png",
                    "/static/assets/icons/cognis-header-512.png",
                    ...assets,
                ]),
            ];
            let nextAsset = 0;
            await Promise.all(
                Array.from(
                    { length: Math.min(4, bootAssets.length) },
                    async () => {
                        while (nextAsset < bootAssets.length) {
                            const asset = bootAssets[nextAsset++];
                            let retained;
                            if (
                                IMMUTABLE_ASSET.test(
                                    new URL(asset, self.location.origin)
                                        .pathname,
                                )
                            ) {
                                for (const previous of previousCaches) {
                                    const response = await previous.match(
                                        assetKey(asset),
                                    );
                                    if (cacheable(response)) {
                                        retained = response;
                                        break;
                                    }
                                }
                            }
                            const resource =
                                retained ??
                                (await fetchAvailable(asset, {
                                    credentials: "omit",
                                    cache: "reload",
                                }));
                            if (!cacheable(resource))
                                throw new Error(
                                    "offline_boot_asset_unavailable",
                                );
                            await cache.put(asset, resource);
                        }
                    },
                ),
            );
            await refreshCatalog();
        })(),
    );
});

// Carry complete public responses into the new generation before retiring old
// storage. Controls and module access receipts always come from the new worker.
async function preservePublicAssets() {
    const destination = await caches.open(CACHE_NAME);
    const allowedModules = new Set(
        (await catalog()).flatMap(routeAssets).map(assetKey),
    );
    for (const name of (await caches.keys()).reverse()) {
        if (
            !name.startsWith(CACHE_PREFIX) ||
            name === CACHE_NAME ||
            name === CONTROL_CACHE_NAME
        )
            continue;
        if (!name.endsWith("-control")) {
            const source = await caches.open(name);
            for (const request of await source.keys()) {
                const url = new URL(request.url);
                if (
                    url.origin !== self.location.origin ||
                    (!/^\/(?:static|assets)\//.test(url.pathname) &&
                        url.pathname !== "/manifest.webmanifest") ||
                    (url.pathname.startsWith("/static/modules/") &&
                        !allowedModules.has(assetKey(request)))
                )
                    continue;
                if (await destination.match(request)) continue;
                const response = await source.match(request);
                if (cacheable(response))
                    await destination.put(request, response);
            }
        }
        await caches.delete(name);
    }
}

self.addEventListener("activate", (event) => {
    event.waitUntil(
        (async () => {
            await preservePublicAssets();
            await self.clients.claim();
        })(),
    );
});

let accessWrite = Promise.resolve();

self.addEventListener("message", (event) => {
    const reply = event.ports?.[0];
    const task = (async () => {
        if (event.data?.type === "COGNIS_OFFLINE_REQUIREMENTS") {
            const response = await (
                await caches.open(CONTROL_CACHE_NAME)
            ).match(REQUIREMENTS_URL);
            if (!response) throw new Error("offline_requirements_unavailable");
            return response.json();
        }
        if (event.data?.type === "COGNIS_OFFLINE_ACCESS") {
            accessWrite = accessWrite
                .catch(() => {})
                .then(async () => {
                    const cache = await caches.open(CONTROL_CACHE_NAME);
                    await cache.put(
                        ACCESS_URL,
                        Response.json({ allowed: event.data.allowed === true }),
                    );
                });
            await accessWrite;
            return null;
        }
        if (event.data?.type === "COGNIS_OFFLINE_PREFERENCE") {
            const cache = await caches.open(CONTROL_CACHE_NAME);
            await cache.put(
                PREFERENCE_URL,
                new Response(
                    JSON.stringify({ enabled: event.data.enabled !== false }),
                ),
            );
            return null;
        }
        if (event.data?.type === "COGNIS_OFFLINE_ROUTES") {
            if (!(await offlineEnabled())) return [];
            const cache = await caches.open(CACHE_NAME);
            const routes = await catalog();
            return Promise.all(
                routes.map(async (route) => ({
                    ...route,
                    offlineAvailable: (
                        await Promise.all(
                            routeAssets(route).map((asset) =>
                                cache.match(assetKey(asset)),
                            ),
                        )
                    ).every(Boolean),
                })),
            );
        }
        if (event.data?.type === "COGNIS_INVALIDATE_OFFLINE_ROUTES") {
            catalogGeneration += 1;
            catalogPromise = Promise.resolve([]);
            const generation = catalogGeneration;
            const control = await caches.open(CONTROL_CACHE_NAME);
            await control.delete(CATALOG_URL);
            // Order revocation after any older policy write.
            accessWrite = accessWrite
                .catch(() => {})
                .then(() => control.delete(ACCESS_URL));
            await accessWrite;
            event.waitUntil(
                (async () => {
                    const cache = await caches.open(CACHE_NAME);
                    for (const request of await cache.keys()) {
                        if (generation !== catalogGeneration) return;
                        if (
                            new URL(request.url).pathname.startsWith(
                                "/static/modules/",
                            )
                        )
                            await cache.delete(request);
                    }
                })(),
            );
            return [];
        }
        if (event.data?.type === "COGNIS_REFRESH_OFFLINE_ROUTES") {
            connectionUnavailable = false;
            return refreshCatalog((task) => event.waitUntil(task));
        }
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

// Compare complete bodies before replacing a known-good response. Cache.put is
// atomic: truncated downloads and failed writes leave the previous entry intact.
async function replacePublicAsset(cache, key, response, previous) {
    if (previous) {
        const priorModified = Date.parse(
            previous.headers.get("last-modified") ?? "",
        );
        const nextModified = Date.parse(
            response.headers.get("last-modified") ?? "",
        );
        if (
            Number.isFinite(priorModified) &&
            Number.isFinite(nextModified) &&
            nextModified < priorModified
        )
            return;
        const next = new Uint8Array(await response.clone().arrayBuffer());
        const prior = new Uint8Array(await previous.clone().arrayBuffer());
        if (
            next.length === prior.length &&
            next.every((byte, index) => byte === prior[index])
        )
            return;
    }
    await cache.put(key, response);
}

// Revalidate mutable public resources only on demand, at most once per minute.
// Bound metadata and coalesce overlapping reads; failed refreshes retain the snapshot.
const assetRefreshes = new Map();
const ASSET_REFRESH_INTERVAL = 60_000;
const MAX_ASSET_REFRESHES = 256;
const assetLoads = new Map();

async function assetResponse(request, moduleAsset, event) {
    if (request.headers?.has("range"))
        return fetch(request, { cache: "no-store" });
    const control = await caches.open(CONTROL_CACHE_NAME);
    const preference = await control.match(PREFERENCE_URL);
    if (preference && (await preference.json()).enabled === false)
        return fetch(request);
    const generation = catalogGeneration;
    if (request.headers?.has("authorization")) return fetch(request);
    const parameters = new URL(request.url).searchParams;
    if ([...parameters.keys()].some((key) => !["v", "revision"].includes(key)))
        return fetch(request);
    const cache = await caches.open(CACHE_NAME);
    const cacheKey = assetKey(request);
    const cached = await cache.match(cacheKey);
    // Only content-hashed production files are immutable, never arbitrary ?v= URLs.
    const immutable = IMMUTABLE_ASSET.test(new URL(request.url).pathname);
    if (cached && immutable) return cached;
    const previousSnapshot = cached?.clone();
    let cacheWrite;
    const refresh = async () => {
        try {
            const response = await fetchAvailable(
                cached
                    ? request
                    : new Request(request.url, { headers: request.headers }),
                moduleAsset
                    ? { cache: "no-store", credentials: "omit" }
                    : { cache: "no-cache", credentials: "omit" },
            );
            if ([502, 503, 504].includes(response.status))
                throw new Error("server_unavailable");
            if (
                [401, 403].includes(response.status) ||
                /private|no-store/i.test(
                    response.headers.get("cache-control") ?? "",
                )
            )
                event.waitUntil(cache.delete(cacheKey));
            if (
                cacheable(response) &&
                (!moduleAsset ||
                    (generation === catalogGeneration &&
                        parameters.has("revision") &&
                        response.headers.get("x-cognis-module-revision") ===
                            parameters.get("revision")))
            ) {
                cacheWrite = replacePublicAsset(
                    cache,
                    cacheKey,
                    response.clone(),
                    previousSnapshot,
                ).catch((error) => {
                    console.error(
                        "[cognis-sw] public asset cache write failed",
                        error,
                    );
                });
                event.waitUntil(cacheWrite);
            }
            return response;
        } catch (error) {
            if (request.signal?.aborted) throw error;
            if (!cached) await announceOffline();
            if (cached && (!moduleAsset || generation === catalogGeneration)) {
                console.info("[cognis-sw] cached public asset retained", {
                    errorName: error?.name,
                });
                return cached;
            }
            throw error;
        }
    };
    if (!cached) {
        const loadKey = JSON.stringify([
            cacheKey,
            generation,
            [...(request.headers ?? [])],
        ]);
        let pending = assetLoads.get(loadKey);
        if (!pending) {
            if (assetLoads.size >= MAX_ASSET_REFRESHES) return refresh();
            pending = refresh();
            assetLoads.set(loadKey, pending);
            const release = () => {
                if (assetLoads.get(loadKey) === pending)
                    assetLoads.delete(loadKey);
            };
            event.waitUntil(
                pending
                    .then(() => cacheWrite)
                    .then(() => {
                        if (
                            !assetRefreshes.has(cacheKey) &&
                            assetRefreshes.size < MAX_ASSET_REFRESHES
                        )
                            assetRefreshes.set(cacheKey, {
                                at: Date.now(),
                                pending: false,
                            });
                    })
                    .finally(release)
                    .catch((error) => {
                        console.info(
                            "[cognis-sw] shared public asset load failed",
                            { errorName: error?.name },
                        );
                    }),
            );
        }
        return (await pending).clone();
    }
    const previous = assetRefreshes.get(cacheKey);
    if (
        !previous ||
        (!previous.pending &&
            Date.now() - previous.at >= ASSET_REFRESH_INTERVAL)
    ) {
        if (assetRefreshes.size >= MAX_ASSET_REFRESHES) {
            const removable = [...assetRefreshes].find(
                ([, entry]) => !entry.pending,
            );
            if (removable) assetRefreshes.delete(removable[0]);
        }
        if (assetRefreshes.size < MAX_ASSET_REFRESHES || previous) {
            const entry = { at: Date.now(), pending: true };
            assetRefreshes.set(cacheKey, entry);
            event.waitUntil(
                refresh()
                    .catch((error) => {
                        console.info(
                            "[cognis-sw] public asset refresh deferred",
                            { errorName: error?.name },
                        );
                    })
                    .finally(() => {
                        entry.pending = false;
                    }),
            );
        }
    }
    return cached;
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
                    if (!(await offlineEnabled())) throw error;
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
                        (asset) => assetKey(asset) === assetKey(url.href),
                    ),
                );
                if (!allowed) return fetch(request, { cache: "no-store" });
                return assetResponse(request, true, event);
            })(),
        );
        return;
    }
    if (
        url.pathname.startsWith("/static/") ||
        url.pathname.startsWith("/assets/") ||
        url.pathname === "/manifest.webmanifest"
    ) {
        event.respondWith(assetResponse(request, false, event));
    }
});

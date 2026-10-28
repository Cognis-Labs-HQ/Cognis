import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

function workerFixture() {
    const handlers = new Map();
    const stores = new Map();
    const requests = [];
    const messages = [];
    let unavailable = false;
    let routes = [];
    let clock = Date.now();
    let serveAsset;
    let failWrites = false;
    const writes = [];
    let offlineGuards = [];
    let assetMaintenance = Promise.resolve();
    let assetWrites = Promise.resolve();
    const origin = "https://cognis.test";
    const key = (request) =>
        new URL(typeof request === "string" ? request : request.url, origin)
            .href;
    const caches = {
        async open(name) {
            if (!stores.has(name)) stores.set(name, new Map());
            const store = stores.get(name);
            return {
                async match(request) {
                    return store.get(key(request))?.clone();
                },
                async put(request, response) {
                    if (!name.endsWith("-control")) await assetWrites;
                    if (!name.endsWith("-control") && failWrites)
                        throw new Error("quota_exceeded");
                    await response.clone().arrayBuffer();
                    writes.push({ name, url: key(request) });
                    store.set(key(request), response.clone());
                },
                async delete(request) {
                    return store.delete(key(request));
                },
                async keys() {
                    if (!name.endsWith("-control")) await assetMaintenance;
                    return [...store.keys()].map((url) => ({ url }));
                },
            };
        },
        async keys() {
            return [...stores.keys()];
        },
        async delete(name) {
            return stores.delete(name);
        },
    };
    vm.runInNewContext(
        readFileSync(new URL("../public/sw.js", import.meta.url), "utf8"),
        {
            URL,
            Date: { now: () => clock, parse: Date.parse },
            AbortSignal,
            Response,
            Request,
            console,
            caches,
            self: {
                location: { origin },
                addEventListener(type, handler) {
                    handlers.set(type, handler);
                },
                clients: {
                    async claim() {},
                    async matchAll() {
                        return [
                            {
                                postMessage(message) {
                                    messages.push(message);
                                },
                            },
                        ];
                    },
                },
            },
            async fetch(request, options) {
                const url = key(request);
                requests.push({ url, options });
                if (unavailable) throw new TypeError("server_unreachable");
                if (url.endsWith("/static/offline-manifest.json"))
                    return Response.json(["/assets/entry-ABCDEFGH.js"]);
                if (url.endsWith("/api/v1/ui/offline-routes"))
                    return Response.json({ data: routes, offlineGuards });
                if (serveAsset) return serveAsset(url, options);
                return new Response(
                    url.endsWith("/private")
                        ? "private document"
                        : "public asset",
                    {
                        headers: {
                            "x-cognis-module-revision":
                                new URL(url).searchParams.get("revision") ?? "",
                        },
                    },
                );
            },
        },
    );
    return {
        caches,
        writes,
        failWrites: (value) => {
            failWrites = value;
        },
        advance: (ms) => {
            clock += ms;
        },
        serve: (callback) => {
            serveAsset = callback;
        },
        requests,
        messages,
        set unavailable(value) {
            unavailable = value;
        },
        set routes(value) {
            routes = value;
        },
        set guards(value) {
            offlineGuards = value;
        },
        async lifecycle(type) {
            let task;
            handlers.get(type)({
                waitUntil(promise) {
                    task = promise;
                },
            });
            await task;
        },
        pauseAssetMaintenance() {
            let release;
            assetMaintenance = new Promise((resolve) => {
                release = resolve;
            });
            return release;
        },
        pauseAssetWrites() {
            let release;
            assetWrites = new Promise((resolve) => {
                release = resolve;
            });
            return release;
        },
        beginMessage(type, options = {}) {
            const tasks = [];
            let reply;
            const response = new Promise((resolve) => {
                reply = resolve;
            });
            handlers.get("message")({
                data: { ...options, type },
                ports: [{ postMessage: reply }],
                waitUntil: (promise) => tasks.push(promise),
            });
            const finished = (async () => {
                for (let i = 0; i < tasks.length; i++) await tasks[i];
            })();
            return { response, finished };
        },
        async message(type, options = {}) {
            const pending = this.beginMessage(type, options);
            await pending.finished;
            return pending.response;
        },
        beginRequest(path, mode) {
            let response;
            const tasks = [];
            handlers.get("fetch")({
                request: {
                    url: new URL(path, origin).href,
                    method: "GET",
                    mode,
                },
                respondWith(promise) {
                    response = promise;
                },
                waitUntil: (promise) => tasks.push(promise),
            });
            return {
                response,
                async finished() {
                    await response;
                    for (const task of tasks) await task;
                },
            };
        },
        request(path, mode) {
            const pending = this.beginRequest(path, mode);
            return pending.response?.then(async (response) => {
                await pending.finished();
                return response;
            });
        },
    };
}

test("hashed production bundles are cache-first; private documents use the neutral offline shell", async () => {
    const fixture = workerFixture();
    await fixture.lifecycle("install");
    const count = fixture.requests.length;
    assert.equal(
        await (await fixture.request("/assets/entry-ABCDEFGH.js")).text(),
        "public asset",
    );
    assert.equal(fixture.requests.length, count);
    assert.equal(
        await (await fixture.request("/private", "navigate")).text(),
        "private document",
    );
    fixture.unavailable = true;
    assert.equal(
        await (await fixture.request("/private", "navigate")).text(),
        "public asset",
    );
    assert.equal(fixture.messages.at(-1).type, "COGNIS_OFFLINE");
    assert.equal(fixture.request("/api/v1/account"), undefined);
});

test("unvisited assets fail honestly and mutable assets refresh online", async () => {
    const fixture = workerFixture();
    await fixture.lifecycle("install");
    await fixture.request("/static/template.html");
    const count = fixture.requests.length;
    await fixture.request("/static/template.html");
    assert.equal(fixture.requests.length, count + 1);
    fixture.unavailable = true;
    assert.equal(
        await (await fixture.request("/static/template.html")).text(),
        "public asset",
    );
    await assert.rejects(
        fixture.request("/assets/unknown-ABCDEFGH.js"),
        /server_unreachable/,
    );
});

test("public module opt-in requires all assets and invalidation removes availability", async () => {
    const fixture = workerFixture();
    const scriptUrl = "/static/modules/demo/page.js?revision=1";
    const localeUrl = "/static/modules/demo/en.xml?revision=1";
    fixture.routes = [
        {
            id: "demo",
            public: true,
            scriptUrl,
            offline: { assets: [localeUrl] },
        },
    ];
    await fixture.lifecycle("install");
    assert.equal(
        (await fixture.message("COGNIS_OFFLINE_ROUTES")).result[0]
            .offlineAvailable,
        false,
    );
    await fixture.request(`${scriptUrl}&v=host-release`);
    await fixture.request(localeUrl);
    assert.equal(
        (await fixture.message("COGNIS_OFFLINE_ROUTES")).result[0]
            .offlineAvailable,
        true,
    );
    fixture.unavailable = true;
    assert.equal(
        await (await fixture.request(scriptUrl)).text(),
        "public asset",
    );
    await fixture.message("COGNIS_INVALIDATE_OFFLINE_ROUTES");
    assert.equal(
        (await fixture.message("COGNIS_OFFLINE_ROUTES")).result.length,
        0,
    );
    await assert.rejects(fixture.request(scriptUrl), /server_unreachable/);
});

test("activation carries prior public assets forward before retiring storage and preserves unrelated caches", async () => {
    const fixture = workerFixture();
    await fixture.caches.open("popup-styles");
    const earlier = await fixture.caches.open("cognis-offline-earlier-build");
    await earlier.put(
        "/static/lazy-styles.css",
        new Response("outdated styles"),
    );
    const prior = await fixture.caches.open("cognis-offline-previous-build");
    await prior.put("/static/lazy-styles.css", new Response("retained styles"));
    await prior.put("/manifest.webmanifest", new Response("retained manifest"));
    await fixture.lifecycle("install");
    fixture.failWrites(true);
    await assert.rejects(fixture.lifecycle("activate"), /quota_exceeded/);
    assert.equal(
        await (await prior.match("/static/lazy-styles.css")).text(),
        "retained styles",
    );
    fixture.failWrites(false);
    await fixture.lifecycle("activate");
    fixture.unavailable = true;
    assert.equal(
        await (await fixture.request("/static/lazy-styles.css")).text(),
        "retained styles",
    );
    assert.equal(
        await (await fixture.request("/manifest.webmanifest")).text(),
        "public asset",
    );
    assert.ok((await fixture.caches.keys()).includes("popup-styles"));
});

test("disabled offline behavior uses the network and never serves cached documents or assets", async () => {
    const fixture = workerFixture();
    await fixture.lifecycle("install");
    await fixture.message("COGNIS_OFFLINE_PREFERENCE", { enabled: false });
    fixture.unavailable = true;
    await assert.rejects(fixture.request("/private", "navigate"));
    await assert.rejects(fixture.request("/assets/entry-ABCDEFGH.js"));
    assert.equal(
        (await fixture.message("COGNIS_OFFLINE_ROUTES")).result.length,
        0,
    );
    assert.equal(fixture.messages.length, 0);
});

test("required legal guards deny cached fallback until a current access receipt is supplied", async () => {
    const fixture = workerFixture();
    fixture.guards = ["terms-of-service"];
    await fixture.lifecycle("install");
    assert.deepEqual(
        Array.from(
            (await fixture.message("COGNIS_OFFLINE_REQUIREMENTS")).result,
        ),
        ["terms-of-service"],
    );
    fixture.unavailable = true;
    await assert.rejects(
        fixture.request("/private", "navigate"),
        /server_unreachable/,
    );
    await fixture.message("COGNIS_OFFLINE_ACCESS", { allowed: true });
    assert.equal(
        await (await fixture.request("/private", "navigate")).text(),
        "public asset",
    );
    await fixture.message("COGNIS_OFFLINE_ACCESS", { allowed: false });
    assert.equal(
        await (await fixture.request("/assets/entry-ABCDEFGH.js")).text(),
        "public asset",
    );
    await assert.rejects(
        fixture.request("/private", "navigate"),
        /server_unreachable/,
    );
});

test("worker policy and catalog acknowledgements remain responsive while asset cleanup is blocked", async () => {
    const fixture = workerFixture();
    await fixture.lifecycle("install");
    const release = fixture.pauseAssetMaintenance();
    try {
        const refresh = fixture.beginMessage("COGNIS_REFRESH_OFFLINE_ROUTES");
        assert.ok(Array.isArray((await refresh.response).result));
        const access = await fixture.message("COGNIS_OFFLINE_ACCESS", {
            allowed: false,
        });
        assert.equal(access.result, null);
        const invalidation = fixture.beginMessage(
            "COGNIS_INVALIDATE_OFFLINE_ROUTES",
        );
        assert.equal((await invalidation.response).result.length, 0);
        release();
        await Promise.all([refresh.finished, invalidation.finished]);
    } finally {
        release();
    }
});

test("public static assets warmed with a build query are available through their canonical URL offline", async () => {
    const fixture = workerFixture();
    await fixture.lifecycle("install");
    await fixture.request("/static/example.svg?v=development");
    fixture.unavailable = true;
    assert.equal(
        await (await fixture.request("/static/example.svg")).text(),
        "public asset",
    );
    assert.equal(
        await (
            await fixture.request(
                "/static/assets/icons/cognis-icon-384.png?v=development",
            )
        ).text(),
        "public asset",
    );
});

test("cold scripts and styles reach the page without waiting for asset cache writes", async () => {
    const fixture = workerFixture();
    await fixture.lifecycle("install");
    const release = fixture.pauseAssetWrites();
    const assets = ["/assets/cold-ABCDEFGH.js", "/assets/style-ABCDEFGH.css"];
    const pending = assets.map((path) => fixture.beginRequest(path));
    try {
        const responses = await Promise.all(
            pending.map((request) => request.response),
        );
        assert.deepEqual(
            await Promise.all(responses.map((response) => response.text())),
            ["public asset", "public asset"],
        );
        assert.equal(
            (await fixture.message("COGNIS_OFFLINE_ACCESS", { allowed: true }))
                .result,
            null,
        );
    } finally {
        release();
        await Promise.all(pending.map((request) => request.finished()));
    }
    fixture.unavailable = true;
    for (const asset of assets)
        assert.equal(
            await (await fixture.request(asset)).text(),
            "public asset",
        );
});

test("mutable public assets return cached bytes immediately, coalesce refreshes and pick up changes on demand", async () => {
    const fixture = workerFixture();
    await fixture.lifecycle("install");
    const path = "/static/styles/reuse/toast.css";
    await fixture.request(path);
    let release;
    let calls = 0;
    fixture.serve(async (_url, options) => {
        calls++;
        assert.equal(options.cache, "no-cache");
        assert.equal(options.credentials, "omit");
        await new Promise((resolve) => {
            release = resolve;
        });
        return new Response("updated toast styles");
    });
    const first = fixture.beginRequest(path);
    assert.equal(await (await first.response).text(), "public asset");
    const concurrent = fixture.beginRequest(path);
    assert.equal(await (await concurrent.response).text(), "public asset");
    assert.equal(calls, 1);
    release();
    await first.finished();
    await concurrent.finished();
    assert.equal(
        await (await fixture.request(path)).text(),
        "updated toast styles",
    );
    assert.equal(calls, 1);
    fixture.advance(60_001);
    fixture.unavailable = true;
    assert.equal(
        await (await fixture.request(path)).text(),
        "updated toast styles",
    );
    assert.equal(fixture.messages.length, 0);
});

test("an authoritative public asset denial replaces cached access with the current server response", async () => {
    const fixture = workerFixture();
    await fixture.lifecycle("install");
    const path = "/static/styles/reuse/toast.css";
    assert.equal((await fixture.request(path)).status, 200);
    fixture.serve(() => new Response("denied", { status: 403 }));
    assert.equal((await fixture.request(path)).status, 200);
    assert.equal((await fixture.request(path)).status, 403);
});

test("unchanged and unavailable replacements retain a complete cached file until a changed response commits", async () => {
    const fixture = workerFixture();
    await fixture.lifecycle("install");
    const path = "/static/lazy.js";
    await fixture.request(path);
    const writes = () =>
        fixture.writes.filter((entry) => entry.url.endsWith(path)).length;
    const originalWrites = writes();
    await fixture.request(path);
    assert.equal(writes(), originalWrites);
    fixture.advance(60_001);
    fixture.serve(() => new Response("missing", { status: 404 }));
    await fixture.request(path);
    assert.equal(await (await fixture.request(path)).text(), "public asset");
    fixture.advance(60_001);
    fixture.serve(() => new Response("new complete file"));
    fixture.failWrites(true);
    await fixture.request(path);
    assert.equal(await (await fixture.request(path)).text(), "public asset");
    fixture.advance(60_001);
    fixture.failWrites(false);
    await fixture.request(path);
    assert.equal(
        await (await fixture.request(path)).text(),
        "new complete file",
    );
    assert.equal(writes(), originalWrites + 1);
});

test("a truncated replacement cannot overwrite complete cached bytes", async () => {
    const fixture = workerFixture();
    await fixture.lifecycle("install");
    const path = "/static/complete.css";
    await fixture.request(path);
    fixture.serve(
        () =>
            new Response(
                new ReadableStream({
                    start(controller) {
                        controller.error(new Error("truncated_transfer"));
                    },
                }),
            ),
    );
    assert.equal(await (await fixture.request(path)).text(), "public asset");
    assert.equal(await (await fixture.request(path)).text(), "public asset");
});

test("an older server representation cannot replace a newer cached file", async () => {
    const fixture = workerFixture();
    await fixture.lifecycle("install");
    const path = "/static/versioned.css";
    fixture.serve(
        () =>
            new Response("current", {
                headers: { "last-modified": "Tue, 27 Oct 2026 00:00:00 GMT" },
            }),
    );
    await fixture.request(path);
    fixture.serve(
        () =>
            new Response("older", {
                headers: { "last-modified": "Mon, 26 Oct 2026 00:00:00 GMT" },
            }),
    );
    await fixture.request(path);
    assert.equal(await (await fixture.request(path)).text(), "current");
    fixture.advance(60_001);
    fixture.serve(
        () =>
            new Response("newer", {
                headers: { "last-modified": "Wed, 28 Oct 2026 00:00:00 GMT" },
            }),
    );
    await fixture.request(path);
    assert.equal(await (await fixture.request(path)).text(), "newer");
});

test("a cached public manifest remains available before legal acceptance without allowing private navigation", async () => {
    const fixture = workerFixture();
    fixture.guards = ["terms-of-service"];
    await fixture.lifecycle("install");
    fixture.unavailable = true;
    assert.equal(
        await (await fixture.request("/manifest.webmanifest")).text(),
        "public asset",
    );
    await assert.rejects(
        fixture.request("/private", "navigate"),
        /server_unreachable/,
    );
});

test("an unavailable individual resource cannot declare a healthy server offline", async () => {
    const fixture = workerFixture();
    await fixture.lifecycle("install");
    fixture.serve(
        (url) =>
            new Response("temporary", {
                status: url.endsWith("/missing.css") ? 503 : 200,
            }),
    );
    await assert.rejects(
        fixture.request("/static/missing.css"),
        /server_unavailable/,
    );
    assert.equal(fixture.messages.length, 0);
    assert.ok(
        fixture.requests.some(({ url }) =>
            url.endsWith("/api/v1/system/healthcheck"),
        ),
    );
});

test("worker resource misses do not repeat connectivity probes after a confirmed outage", async () => {
    const fixture = workerFixture();
    await fixture.lifecycle("install");
    fixture.unavailable = true;
    await assert.rejects(fixture.request("/static/missing-one.css"));
    await assert.rejects(fixture.request("/static/missing-two.css"));
    assert.equal(
        fixture.requests.filter(({ url }) =>
            url.endsWith("/api/v1/system/healthcheck"),
        ).length,
        1,
    );
});

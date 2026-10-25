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
    let offlineGuards = [];
    let assetMaintenance = Promise.resolve();
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
            AbortSignal,
            Response,
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
        request(path, mode) {
            let response;
            handlers.get("fetch")({
                request: {
                    url: new URL(path, origin).href,
                    method: "GET",
                    mode,
                },
                respondWith(promise) {
                    response = promise;
                },
            });
            return response;
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

test("activation preserves unrelated application caches", async () => {
    const fixture = workerFixture();
    await fixture.caches.open("popup-styles");
    await fixture.caches.open("cognis-shell-v6");
    await fixture.lifecycle("install");
    await fixture.lifecycle("activate");
    assert.ok((await fixture.caches.keys()).includes("popup-styles"));
    assert.ok(!(await fixture.caches.keys()).includes("cognis-shell-v6"));
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
    await assert.rejects(
        fixture.request("/assets/entry-ABCDEFGH.js"),
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

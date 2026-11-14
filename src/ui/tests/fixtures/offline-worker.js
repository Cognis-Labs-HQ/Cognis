import { readFileSync } from "node:fs";
import vm from "node:vm";

export function workerFixture({
    bootAssets = ["/assets/entry-ABCDEFGH.js"],
    abortSignal = AbortSignal,
} = {}) {
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
        readFileSync(new URL("../../public/sw.js", import.meta.url), "utf8"),
        {
            URL,
            Date: { now: () => clock, parse: Date.parse },
            AbortSignal: abortSignal,
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
                    return Response.json(bootAssets);
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
        beginRequest(path, mode, options = {}) {
            let response;
            const tasks = [];
            handlers.get("fetch")({
                request: {
                    url: new URL(path, origin).href,
                    method: "GET",
                    mode,
                    ...options,
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
        request(path, mode, options) {
            const pending = this.beginRequest(path, mode, options);
            return pending.response?.then(async (response) => {
                await pending.finished();
                return response;
            });
        },
    };
}

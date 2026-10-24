import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

for (const offline of [false, true]) {
    test(`module scripts bypass stale service worker caches when ${offline ? "offline" : "online"}`, async () => {
        const handlers = new Map();
        const networkError = new Error("offline");
        let options;
        const sandbox = {
            URL,
            AbortSignal,
            self: {
                location: { origin: "https://cognis.test" },
                addEventListener: (type, handler) =>
                    handlers.set(type, handler),
            },
            caches: {
                open: async () => ({ match: async () => undefined }),
            },
            fetch: async (_request, requestOptions) => {
                options = requestOptions;
                if (offline) throw networkError;
                return "current module";
            },
        };
        vm.runInNewContext(
            readFileSync(new URL("../public/sw.js", import.meta.url), "utf8"),
            sandbox,
        );
        let response;
        handlers.get("fetch")({
            request: {
                method: "GET",
                url: "https://cognis.test/static/modules/legal/app.js?v=development",
            },
            respondWith: (promise) => {
                response = promise;
            },
        });
        if (offline) await assert.rejects(response, networkError);
        else assert.equal(await response, "current module");
        assert.equal(options.cache, "no-store");
    });
}

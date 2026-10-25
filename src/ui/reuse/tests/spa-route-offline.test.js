import assert from "node:assert/strict";
import test from "node:test";
import { loadTestModule } from "../../../tooling/reuse/test-module.ts";
import { uiCtx } from "../ui-ctx.js";
import { offlineRouteAvailable } from "../offline-navigation.js";

test("a warm offline catalog keeps both cached public pages and provider-authorized private pages", async () => {
    let offline = false;
    let requests = 0;
    const route = {
        pattern: "^/legal$",
        base: "/legal",
        scriptUrl: "/static/app/legal/index.js",
    };
    const { loadSpaRoutes } = loadTestModule(
        new URL("../spa-route-registry.js", import.meta.url),
        {
            "./ui-ctx.js": { uiCtx },
            "./offline-navigation.js": { offlineRouteAvailable },
            "./offline-state.js": {
                isOffline: () => offline,
                offlineWorkerRequest: async () => [],
            },
            "./api-client.js": {
                apiFetch: async () => {
                    requests++;
                    return Response.json({
                        data: [
                            {
                                ...route,
                                id: "legal",
                                public: true,
                                offline: {},
                                offlineAvailable: true,
                            },
                            { ...route, id: "private" },
                            {
                                ...route,
                                id: "unavailable",
                                public: true,
                                offline: {},
                                offlineAvailable: false,
                            },
                        ],
                    });
                },
            },
        },
    );
    await loadSpaRoutes();
    const controller = new AbortController();
    uiCtx.capabilities.get("offline:registerSessionRoutes")(
        ["private"],
        controller.signal,
    );
    offline = true;
    assert.deepEqual(
        (await loadSpaRoutes()).map((route) => route.id),
        ["legal", "private"],
    );
    assert.equal(requests, 1);
    controller.abort();
    assert.deepEqual(
        (await loadSpaRoutes()).map((route) => route.id),
        ["legal"],
    );
});

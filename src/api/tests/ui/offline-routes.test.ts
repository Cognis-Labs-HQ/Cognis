import test from "node:test";
import assert from "node:assert/strict";
import { UIRegistry } from "../../reuse/ui-registry.js";

const declaration = {
    id: "offline-example",
    pattern: "^/example$",
    base: "/example",
    scriptUrl: "/static/modules/example/index.js",
    public: true,
    offline: { assets: ["/static/modules/example/en.xml"] },
};

test("offline declarations cannot bypass live account authorization", () => {
    const registry = new UIRegistry();
    assert.throws(
        () => registry.registerSpaRoute({ ...declaration, public: false }),
        /invalid_offline_spa_route/,
    );
    assert.throws(
        () =>
            registry.registerSpaRoute({
                ...declaration,
                offline: { assets: ["/api/v1/account"] },
            }),
        /invalid_offline_spa_route/,
    );
    assert.throws(
        () =>
            registry.registerSpaRoute({
                ...declaration,
                offline: { assets: ["/static/../private"] },
            }),
        /invalid_offline_spa_route/,
    );
});

test("disabled modules lose their offline descriptor through the same registry predicate", () => {
    const registry = new UIRegistry();
    let enabled = true;
    registry.registerSpaRoute({ ...declaration, isEnabled: () => enabled });
    assert.equal(
        registry.listSpaRoutes()[0].offline?.assets[0],
        declaration.offline.assets[0],
    );
    enabled = false;
    assert.equal(registry.listSpaRoutes().length, 0);
});

test("the anonymous offline catalog contains only enabled explicit public opt-ins", async () => {
    const { createUiRoutes } = await import("../../routes/ui/index.js");
    const { createResponseRecorder } =
        await import("./ui-routes-test-helpers.js");
    const registry = new UIRegistry();
    registry.registerSpaRoute(declaration);
    registry.registerSpaRoute({
        id: "private",
        pattern: "^/private$",
        base: "/private",
        scriptUrl: "/static/private.js",
    });
    registry.registerSpaRoute({
        ...declaration,
        id: "disabled",
        pattern: "^/disabled$",
        base: "/disabled",
        isEnabled: () => false,
    });
    registry.registerCapabilityProvider({
        scriptUrl: "/static/legal.js",
        providesCapabilities: ["legal:consent"],
        offlineAccessGuard: "terms-of-service",
    });
    registry.registerCapabilityProvider({
        scriptUrl: "/static/disabled-legal.js",
        providesCapabilities: ["disabled:consent"],
        offlineAccessGuard: "disabled",
        isEnabled: () => false,
    });
    const response = createResponseRecorder();
    await createUiRoutes(undefined, registry)(
        { method: "GET", headers: {} } as import("node:http").IncomingMessage,
        response.res as unknown as import("node:http").ServerResponse,
        new URL("http://localhost/api/v1/ui/offline-routes"),
    );
    assert.equal(response.status, 200);
    assert.equal(response.headers["cache-control"], "no-store");
    assert.deepEqual(JSON.parse(response.body).offlineGuards, [
        "terms-of-service",
    ]);
    const routes = JSON.parse(response.body).data;
    assert.deepEqual(
        routes.map((route: { id: string }) => route.id),
        [declaration.id],
    );
    assert.equal(routes[0].offline.assets[0], "/static/modules/example/en.xml");
});

test("external module revisioning traverses the same offline asset declaration", async () => {
    const { versionModuleUiAssets } =
        await import("../../reuse/module-ui-assets.js");
    const revised = versionModuleUiAssets(declaration, "example", "2.0.0");
    assert.equal(
        revised.scriptUrl,
        "/static/modules/example/index.js?revision=2.0.0",
    );
    assert.equal(
        revised.offline.assets[0],
        "/static/modules/example/en.xml?revision=2.0.0",
    );
});

test("module assets identify their current revision and reject an obsolete cache key", async () => {
    const { validateModuleAssetRevision } =
        await import("../../routes/ui/module-string-assets.js");
    const headers = new Map();
    let status = 200;
    const response = {
        setHeader(name: string, value: string) {
            headers.set(name, value);
        },
        writeHead(code: number) {
            status = code;
        },
        end() {},
    } as unknown as import("node:http").ServerResponse;
    const runtime = {
        listManifests: async () => [{ id: "example", version: "2.0.0" }],
    } as unknown as import("@cognis/core").ModuleRuntimeGateway;
    assert.equal(
        await validateModuleAssetRevision(
            response,
            new URL(
                "http://localhost/static/modules/example/index.js?revision=2.0.0",
            ),
            "example",
            runtime,
        ),
        true,
    );
    assert.equal(headers.get("x-cognis-module-revision"), "2.0.0");
    assert.equal(
        await validateModuleAssetRevision(
            response,
            new URL(
                "http://localhost/static/modules/example/index.js?revision=1.0.0",
            ),
            "example",
            runtime,
        ),
        false,
    );
    assert.equal(status, 409);
});

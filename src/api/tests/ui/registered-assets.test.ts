import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { UIRegistry } from "../../reuse/ui-registry.js";
import { serveProviders } from "../../routes/ui/capability-providers.js";
import type { RouteContext } from "../../reuse/route-context.js";
import { createResponseRecorder } from "./ui-routes-test-helpers.js";

function createRegistry(): UIRegistry {
    return new UIRegistry(
        new URL("./fixtures/asset-manifest.json", import.meta.url).pathname,
    );
}

test("registered gateway and adapter paths resolve to the same built source identity", () => {
    const registry = createRegistry();
    const directory = path.resolve("src/adapters/example/sample/ui");
    registry.registerStaticDir("alias", directory);
    registry.registerAdapterStaticDir("example", "sample", directory);
    for (const prefix of [
        "/static/gateways/alias",
        "/static/adapters/example/sample",
    ]) {
        assert.equal(
            registry.resolveAssetUrl(`${prefix}/provider.js`),
            "/assets/provider-ABC123.js",
        );
        assert.equal(
            registry.resolveAssetUrl(`${prefix}/styles.css`),
            "/assets/styles-ABC123.css",
        );
        assert.equal(
            registry.resolveAssetUrl(`${prefix}/fresh.xml`),
            `${prefix}/fresh.xml`,
        );
    }
    assert.equal(
        registry.resolveAssetUrl("/static/gateways/example/ui/direct.js"),
        "/assets/direct-ABC123.js",
    );
});

test("unbuilt, external and revision-qualified resources retain their authoritative URLs", () => {
    const registry = createRegistry();
    registry.registerStaticDir(
        "external",
        path.resolve("external-modules/example/ui"),
    );
    registry.registerStaticDir(
        "alias",
        path.resolve("src/adapters/example/sample/ui"),
    );
    registry.registerModuleStaticDir(
        "example",
        path.resolve("src/adapters/example/sample/ui"),
    );
    for (const url of [
        "/static/gateways/external/provider.js",
        "/static/gateways/unknown/provider.js",
        "/static/gateways/alias/provider.js?revision=2",
        "/static/gateways/alias/provider.js#section",
        "/static/gateways/alias/../ui/provider.js",
        `/static/gateways/alias/${path.resolve("src/adapters/example/sample/ui/provider.js")}`,
        "/static/modules/example/provider.js?revision=2",
        "/static/modules/example/provider.js",
    ])
        assert.equal(registry.resolveAssetUrl(url), url);
    const sourceRegistry = new UIRegistry("");
    sourceRegistry.registerStaticDir(
        "alias",
        path.resolve("src/adapters/example/sample/ui"),
    );
    assert.equal(
        sourceRegistry.resolveAssetUrl("/static/gateways/alias/provider.js"),
        "/static/gateways/alias/provider.js",
    );
});

test("provider discovery retains injected authorization and live owner lifecycle filtering", () => {
    const registry = createRegistry();
    registry.registerStaticDir(
        "alias",
        path.resolve("src/adapters/example/sample/ui"),
    );
    let enabled = true;
    registry.registerCapabilityProvider({
        scriptUrl: "/static/gateways/alias/provider.js",
        providesCapabilities: ["example:action"],
        ownerId: "example",
        isEnabled: () => enabled,
    });
    let allowed = false;
    const context = {
        requireAuth(_request: IncomingMessage, response: ServerResponse) {
            if (allowed) return { sub: "fixture", role: "user" };
            response.writeHead(401);
            response.end();
            return null;
        },
    } as RouteContext;
    const read = () => {
        const response = createResponseRecorder();
        assert.equal(
            serveProviders(
                { method: "GET" } as IncomingMessage,
                response.res as unknown as ServerResponse,
                new URL("http://localhost/api/v1/ui/capability-providers"),
                context,
                registry,
                "host-version",
            ),
            true,
        );
        return response;
    };
    assert.equal(read().status, 401);
    allowed = true;
    assert.equal(
        JSON.parse(read().body).data[0].scriptUrl,
        "/assets/provider-ABC123.js",
    );
    enabled = false;
    assert.deepEqual(JSON.parse(read().body).data, []);
    enabled = true;
    assert.equal(JSON.parse(read().body).data.length, 1);
    registry.unregisterModuleContributions("example");
    assert.deepEqual(JSON.parse(read().body).data, []);
    allowed = false;
    assert.equal(read().status, 401);
});

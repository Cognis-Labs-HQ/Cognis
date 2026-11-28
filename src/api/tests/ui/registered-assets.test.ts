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
    registry.registerStaticDirectory("alias", directory);
    registry.registerAdapterStaticDirectory("example", "sample", directory);
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

test("repository-root production launches resolve compiled component aliases", () => {
    const registry = createRegistry();
    const directory = path.resolve(
        "dist/server/src/adapters/example/sample/ui",
    );
    registry.registerStaticDirectory("compiled-alias", directory);
    registry.registerAdapterStaticDirectory(
        "example",
        "compiled-sample",
        directory,
    );
    for (const prefix of [
        "/static/gateways/compiled-alias",
        "/static/adapters/example/compiled-sample",
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
    registry.registerStaticDirectory(
        "outside",
        path.resolve("dist/server/src-other/adapters/example/sample/ui"),
    );
    assert.equal(
        registry.resolveAssetUrl("/static/gateways/outside/provider.js"),
        "/static/gateways/outside/provider.js",
    );
});

test("unbuilt, external and revision-qualified resources retain their authoritative URLs", () => {
    const registry = createRegistry();
    registry.registerStaticDirectory(
        "external",
        path.resolve("external-modules/example/ui"),
    );
    registry.registerStaticDirectory(
        "alias",
        path.resolve("src/adapters/example/sample/ui"),
    );
    registry.registerModuleStaticDirectory(
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
    sourceRegistry.registerStaticDirectory(
        "alias",
        path.resolve("src/adapters/example/sample/ui"),
    );
    assert.equal(
        sourceRegistry.resolveAssetUrl("/static/gateways/alias/provider.js"),
        "/static/gateways/alias/provider.js",
    );
});

test("provider discovery retains injected authorization and live owner lifecycle filtering", async () => {
    const registry = createRegistry();
    registry.registerStaticDirectory(
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
        getAuthClaims() {
            return allowed ? { sub: "fixture", role: "user" } : null;
        },
        getCapability() {
            return undefined;
        },
    } as unknown as RouteContext;
    const read = async () => {
        const response = createResponseRecorder();
        assert.equal(
            await serveProviders(
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
    assert.deepEqual(JSON.parse((await read()).body).data, []);
    allowed = true;
    assert.equal(
        JSON.parse((await read()).body).data[0].scriptUrl,
        "/assets/provider-ABC123.js",
    );
    enabled = false;
    assert.deepEqual(JSON.parse((await read()).body).data, []);
    enabled = true;
    assert.equal(JSON.parse((await read()).body).data.length, 1);
    registry.unregisterModuleContributions("example");
    assert.deepEqual(JSON.parse((await read()).body).data, []);
    allowed = false;
    assert.deepEqual(JSON.parse((await read()).body).data, []);
});

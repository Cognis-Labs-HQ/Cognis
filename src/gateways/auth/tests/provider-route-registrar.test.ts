import assert from "node:assert/strict";
import test from "node:test";
import { RouteRegistry } from "../../../api/reuse/route-registry.js";
import { registerAuthProviderRoutes } from "../provider-route-registrar.js";
import type { AuthProviderAdapter } from "../gateway.js";
import { dispatchRoute, makeJsonRequest } from "./auth-gateway-test-helpers.js";

function createProvider(): AuthProviderAdapter {
    return {
        id: "x-sso",
        name: "X SSO",
        locked: true,
        routeNamespace: "x",
        authenticate: async () => null,
        configure() {},
        getConfigSchema: () => [],
        registerRoutes(router) {
            router.get("/callback", (_req, res, url) => {
                if (url.searchParams.has("fail")) {
                    throw new Error("provider_callback_failed");
                }
                res.writeHead(302, { location: "/dashboard" });
                res.end();
            });
        },
    };
}

test("provider routes accept browser-facing query callbacks", async () => {
    const routes = new RouteRegistry();
    const unregister = registerAuthProviderRoutes(
        routes,
        createProvider(),
        () => true,
    );
    const callback = await dispatchRoute(
        routes,
        makeJsonRequest("GET", {}),
        "/sso/x/callback?code=authorization-code&state=state-token",
    );

    assert.equal(callback.handled, true);
    assert.equal(callback.res.status, 302);
    assert.equal(callback.res.headers.location, "/dashboard");
    unregister();
    const removed = await dispatchRoute(
        routes,
        makeJsonRequest("GET", {}),
        "/sso/x/callback?code=authorization-code",
    );
    assert.equal(removed.handled, false);
});

test("provider routes serve a fragment callback bridge", async () => {
    const routes = new RouteRegistry();
    const unregister = registerAuthProviderRoutes(
        routes,
        createProvider(),
        () => true,
    );
    const callback = await dispatchRoute(
        routes,
        makeJsonRequest("GET", {}),
        "/sso/x/callback",
    );

    assert.equal(callback.handled, true);
    assert.equal(callback.res.status, 200);
    assert.match(callback.res.payload, /login-page\/callback\.js/);
    unregister();
});

test("provider callback failures return explicit API and login errors", async () => {
    const routes = new RouteRegistry();
    const unregister = registerAuthProviderRoutes(
        routes,
        createProvider(),
        () => true,
    );
    const apiCallback = await dispatchRoute(
        routes,
        makeJsonRequest("GET", {}),
        "/api/v1/auth/x/callback?fail=1",
    );
    assert.equal(apiCallback.res.status, 500);
    assert.match(apiCallback.res.payload, /sso_callback_failed/);

    const publicCallback = await dispatchRoute(
        routes,
        makeJsonRequest("GET", {}),
        "/sso/x/callback?fail=1",
    );
    assert.equal(publicCallback.res.status, 302);
    assert.equal(
        publicCallback.res.headers.location,
        "/login?reason=sso_callback_failed",
    );
    unregister();
});

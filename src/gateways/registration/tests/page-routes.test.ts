import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultRouteContext } from "../../../api/reuse/route-context.js";
import { createResponseRecorder } from "../../../api/tests/ui/ui-routes-test-helpers.js";
import { createRegistrationPageRoutes } from "../bootstrap/page-routes.js";

function createRoute(role: "admin" | "user", enabled = true) {
    const routeContext = {
        ...createDefaultRouteContext(),
        getCookieSession: () => ({ sub: "founder", role }),
        setPageSecurityHeaders: () => undefined,
    };
    return createRegistrationPageRoutes(
        { isFounder: async () => true } as any,
        () => enabled,
        routeContext,
    );
}

test("registration gateway serves its registration page", async () => {
    const response = createResponseRecorder();
    const handled = await createRoute("user")(
        { method: "GET" } as any,
        response.res as any,
        new URL("http://localhost/register"),
    );

    assert.equal(handled, true);
    assert.equal(response.status, 200);
    assert.match(
        response.body,
        /static\/gateways\/registration\/register\/index\.js/,
    );
});

test("registration gateway redirects admins away from founder invites", async () => {
    const response = createResponseRecorder();
    await createRoute("admin")(
        { method: "GET" } as any,
        response.res as any,
        new URL("http://localhost/invite"),
    );

    assert.equal(response.status, 302);
    assert.equal(response.headers.location, "/users");
});

test("registration gateway serves founder invite management", async () => {
    const response = createResponseRecorder();
    await createRoute("user")(
        { method: "GET" } as any,
        response.res as any,
        new URL("http://localhost/invite"),
    );

    assert.equal(response.status, 200);
    assert.match(
        response.body,
        /static\/gateways\/registration\/app\/invite\/index\.js/,
    );
});

test("registration gateway blocks invites while disabled", async () => {
    const response = createResponseRecorder();
    await createRoute("user", false)(
        { method: "GET" } as any,
        response.res as any,
        new URL("http://localhost/invite"),
    );

    assert.equal(response.status, 302);
    assert.equal(response.headers.location, "/dashboard");
});

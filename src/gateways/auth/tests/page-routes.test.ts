import assert from "node:assert/strict";
import test from "node:test";
import { createDefaultRouteContext } from "../../../api/reuse/route-context.js";
import { createResponseRecorder } from "../../../api/tests/ui/ui-routes-test-helpers.js";
import { createAuthPageRoutes } from "../bootstrap/routes/pages.js";

test("auth gateway serves the standalone login page", async () => {
    const response = createResponseRecorder();
    const route = createAuthPageRoutes({
        ...createDefaultRouteContext(),
        setPageSecurityHeaders: () => undefined,
    });
    const handled = await route(
        { method: "GET", headers: {} } as any,
        response.res as any,
        new URL("http://localhost/login"),
    );

    assert.equal(handled, true);
    assert.equal(response.status, 200);
    assert.match(response.body, /id="app"/);
    assert.match(response.body, /gateways\/auth\/login-page\/index\.js/);
});

test("auth page routes ignore pages outside their ownership", async () => {
    const response = createResponseRecorder();
    const handled = await createAuthPageRoutes({
        ...createDefaultRouteContext(),
        setPageSecurityHeaders: () => undefined,
    })(
        { method: "GET", headers: {} } as any,
        response.res as any,
        new URL("http://localhost/dashboard"),
    );

    assert.equal(handled, false);
    assert.equal(response.writeHeadCalls, 0);
});

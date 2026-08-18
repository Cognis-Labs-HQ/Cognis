import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { UIRegistry } from "../../reuse/ui-registry.js";
import { createDefaultRouteContext } from "../../reuse/route-context.js";
import { handleRegisteredSpaPage } from "../../routes/ui/spa-pages.js";
import { createResponseRecorder } from "./ui-routes-test-helpers.js";

test("direct SPA loads import declared providers before the route once", async () => {
    const recorder = createResponseRecorder();
    const handled = await handleRegisteredSpaPage({
        req: { method: "GET" } as any,
        res: recorder.res as any,
        route: {
            id: "meetings",
            pattern: "^/meetings$",
            base: "/meetings",
            scriptUrl: "/static/modules/jitsi-meet/app.js?v=test",
            capabilityScripts: [
                "/static/adapters/social/profile/navbar.js?v=test",
            ],
        },
        uiRegistry: new UIRegistry(),
        publicRoot: path.resolve("src/ui/public"),
        routeContext: createDefaultRouteContext(),
        resolveLoginRedirect: async () => null,
        redirect: () => true,
        getSessionRole: () => "user",
    });

    assert.equal(handled, true);
    assert.match(recorder.body, /static\/reuse\/spa-page-entry\.js/);
    assert.match(recorder.body, /spa-page-entry-config/);
    assert.match(recorder.body, /profile\/navbar\.js\?v=test/);
    assert.match(recorder.body, /jitsi-meet\/app\.js\?v=test/);
    assert.equal(
        recorder.body.match(/jitsi-meet\/app\.js\?v=test/g)?.length,
        1,
    );
});

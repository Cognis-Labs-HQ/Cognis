import test from "node:test";
import assert from "node:assert/strict";
import type { IncomingMessage, ServerResponse } from "node:http";
import { UIRegistry } from "../../reuse/ui-registry.js";
import { serveProviders } from "../../routes/ui/capability-providers.js";
import { createDefaultRouteContext } from "../../reuse/route-context.js";
import { createResponseRecorder } from "./ui-routes-test-helpers.js";

test("anonymous discovery exposes only explicitly public providers without role restrictions", async () => {
    const registry = new UIRegistry("");
    registry.registerCapabilityProvider({
        scriptUrl: "/logging.js",
        providesCapabilities: ["logging:browser"],
        public: true,
    });
    registry.registerCapabilityProvider({
        scriptUrl: "/private.js",
        providesCapabilities: ["private:action"],
    });
    registry.registerCapabilityProvider({
        scriptUrl: "/admin.js",
        providesCapabilities: ["admin:action"],
        public: true,
        access: { minRole: "admin" },
    });
    const response = createResponseRecorder();
    await serveProviders(
        { method: "GET", headers: {} } as IncomingMessage,
        response.res as unknown as ServerResponse,
        new URL("http://localhost/api/v1/ui/capability-providers"),
        createDefaultRouteContext(),
        registry,
        "test",
    );
    assert.equal(response.status, 200);
    assert.deepEqual(
        JSON.parse(response.body).data.map(
            (entry: { scriptUrl: string }) => entry.scriptUrl,
        ),
        ["/logging.js"],
    );
});

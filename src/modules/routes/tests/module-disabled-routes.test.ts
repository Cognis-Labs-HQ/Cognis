import test from "node:test";
import assert from "node:assert/strict";
import { createModuleExtensionRoutes } from "../module-extensions.js";
import { createDefaultRouteContext } from "../../../api/reuse/route-context.js";

function createResponseRecorder(): {
    status: number;
    payload: string;
    writeHead(code: number): void;
    end(body: string): void;
} {
    return {
        status: 0,
        payload: "",
        writeHead(code: number) {
            this.status = code;
        },
        end(body: string) {
            this.payload = body;
        },
    };
}

test("module extension routes return module_disabled for disabled modules", async () => {
    const extensions = createModuleExtensionRoutes(
        {
            listManifests: async () => [
                {
                    id: "analytics",
                    entrypoints: { api: "./api/index.js" },
                },
            ],
        } as never,
        () => false,
        undefined,
        { routeContext: createDefaultRouteContext() },
    );
    await extensions.refresh();

    const responseRecorder = createResponseRecorder();
    const handled = await extensions.handle(
        {
            method: "GET",
            headers: {},
        } as never,
        responseRecorder as never,
        new URL("http://localhost/api/v1/modules/analytics/metrics"),
    );

    assert.equal(handled, true);
    assert.equal(responseRecorder.status, 503);
    assert.deepEqual(JSON.parse(responseRecorder.payload), {
        error: {
            code: "module_disabled",
            message: "Module disabled",
        },
    });
});

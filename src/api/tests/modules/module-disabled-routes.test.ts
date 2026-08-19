import test from "node:test";
import assert from "node:assert/strict";
import { createModuleExtensionRoutes } from "../../reuse/module-extension-routes.js";
import { createDefaultRouteContext } from "../../reuse/route-context.js";

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

test("disabled modules expose no route handlers", async () => {
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

    assert.equal(handled, false);
    assert.equal(responseRecorder.status, 0);
    assert.equal(responseRecorder.payload, "");
});

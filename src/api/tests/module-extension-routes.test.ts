import test from "node:test";
import assert from "node:assert/strict";
import { createModuleExtensionRoutes } from "../../modules/routes/module-extensions.js";

test("module extension routes expose module API endpoints", async () => {
    const extensions = createModuleExtensionRoutes(
        {
            listManifests: async () => [
                {
                    id: "sample-analytics",
                    entrypoints: { api: "./api/index.js" },
                },
            ],
        } as any,
        () => true,
    );
    await extensions.refresh();

    let status = 0;
    let body = "";

    const handled = await extensions.handle(
        { method: "GET" } as any,
        {
            writeHead(code: number) {
                status = code;
            },
            end(payload: string) {
                body = payload;
            },
        } as any,
        new URL("http://localhost/api/v1/modules/sample-analytics/metrics"),
    );

    assert.equal(handled, true);
    assert.equal(status, 200);
    assert.match(body, /visitors/);
});

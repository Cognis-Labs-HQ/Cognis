import test from "node:test";
import assert from "node:assert/strict";
import { createDocsRoutes } from "../routes/docs/index.js";

test("docs route handles docs index with markdown slugs", async () => {
    const route = createDocsRoutes();
    let status = 0;
    let body = "";
    const handled = await route(
        { method: "GET" } as any,
        {
            writeHead(code: number) {
                status = code;
            },
            end(payload: string) {
                body = payload;
            },
        } as any,
        new URL("http://localhost/api/v1/docs"),
    );
    assert.equal(handled, true);
    assert.equal(status, 200);
    assert.match(body, /"slug":"docs\/ui"/);
});

test("docs route supports slug lookup", async () => {
    const route = createDocsRoutes();
    let status = 0;
    let body = "";
    const handled = await route(
        { method: "GET" } as any,
        {
            writeHead(code: number) {
                status = code;
            },
            end(payload: string) {
                body = payload;
            },
        } as any,
        new URL("http://localhost/api/v1/docs/docs/ui"),
    );
    assert.equal(handled, true);
    assert.equal(status, 200);
    assert.match(body, /UI Component/);
});

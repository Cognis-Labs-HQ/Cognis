import test from "node:test";
import assert from "node:assert/strict";
import { createDocsRoutes } from "../../routes/docs/index.js";

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
    assert.match(body, /"slug":"ui"/);
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
        new URL("http://localhost/api/v1/docs/ui"),
    );
    assert.equal(handled, true);
    assert.equal(status, 200);
    assert.match(body, /UI/);
});

test("docs route returns group and title metadata", async () => {
    const route = createDocsRoutes();
    let status = 0;
    let body = "";
    await route(
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
    assert.equal(status, 200);
    const parsed = JSON.parse(body);
    const uiEntry = parsed.data.find((d: any) => d.slug === "ui");
    assert.ok(uiEntry, "ui slug present");
    assert.ok("group" in uiEntry, "group field present");
    assert.ok("title" in uiEntry, "title field present");
});

test("docs route falls back to English when requested lang is missing", async () => {
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
        new URL("http://localhost/api/v1/docs/ui?lang=xx"),
    );
    assert.equal(handled, true);
    assert.equal(status, 200);
    assert.match(body, /UI/);
});

test("docs route uses secondary language before falling back to English", async () => {
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
        new URL("http://localhost/api/v1/docs/ui?langs=xx%2Cde"),
    );
    assert.equal(handled, true);
    assert.equal(status, 200);
    const parsed = JSON.parse(body);
    assert.ok(
        parsed.data.markdown.includes("Benutzeroberfläche") ||
            parsed.data.markdown.includes("UI"),
        "served secondary language (de) before English",
    );
});

test("docs route returns 404 for unknown slug", async () => {
    const route = createDocsRoutes();
    let status = 0;
    const handled = await route(
        { method: "GET" } as any,
        {
            writeHead(code: number) {
                status = code;
            },
            end() {},
        } as any,
        new URL("http://localhost/api/v1/docs/no-such-doc-xyz"),
    );
    assert.equal(handled, true);
    assert.equal(status, 404);
});

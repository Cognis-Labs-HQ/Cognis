import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import { JSDOM } from "jsdom";

const uiRoot = new URL("../../../", import.meta.url);
const globals = [
    "window",
    "document",
    "localStorage",
    "sessionStorage",
    "HTMLElement",
    "HTMLInputElement",
    "HTMLTextAreaElement",
    "Element",
    "Node",
    "NodeFilter",
    "Event",
    "CustomEvent",
    "MouseEvent",
    "KeyboardEvent",
    "AbortController",
    "AbortSignal",
    "MutationObserver",
    "DOMException",
    "DOMParser",
    "getComputedStyle",
    "history",
    "location",
];

export function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((done, fail) => {
        resolve = done;
        reject = fail;
    });
    return { promise, resolve, reject };
}

export const wait = (duration = 0) =>
    new Promise((resolve) => setTimeout(resolve, duration));

export async function selectionFixture(context) {
    const hooks = registerHooks({
        resolve(specifier, parent, next) {
            return next(
                specifier.startsWith("/static/")
                    ? new URL(specifier.slice(8), uiRoot).href
                    : specifier,
                parent,
            );
        },
    });
    const dom = new JSDOM(
        '<!doctype html><html><head><link rel="stylesheet" href="/static/styles/reuse/toast.css"></head><body><main id="app"></main></body></html>',
        { url: "https://fixture.invalid/dashboard", pretendToBeVisual: true },
    );
    const previous = new Map(globals.map((key) => [key, globalThis[key]]));
    for (const key of globals) globalThis[key] = dom.window[key];
    for (const key of ["requestAnimationFrame", "cancelAnimationFrame"]) {
        previous.set(key, globalThis[key]);
        globalThis[key] = dom.window[key].bind(dom.window);
    }
    Object.defineProperty(document.querySelector("link"), "sheet", {
        value: {},
    });
    const errors = [];
    window.addEventListener("error", (event) => errors.push(event.error));
    const results = [
        { id: "one", label: "Fixture destination", url: "/settings" },
        { id: "two", label: "Fixture second", url: "/docs" },
    ];
    const requests = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input) => {
        const url = String(input);
        requests.push(url);
        if (url.startsWith("/static/languages/")) {
            return new Response(await readFile(new URL(url.slice(8), uiRoot)), {
                headers: { "Content-Type": "application/xml" },
            });
        }
        if (url.startsWith("/api/v1/search?"))
            return Response.json({ data: results });
        if (["/api/v1/docs", "/api/v1/ui/settings-sections"].includes(url))
            return Response.json({ data: [] });
        throw new Error(`Unexpected fixture request: ${url}`);
    };
    const api = await import("../popup.js");
    const { uiCtx } = await import("../../ui-ctx.js");
    const logs = [];
    const logger = (level, message, metadata) =>
        logs.push({ level, message, metadata });
    assert.equal(uiCtx.capabilities.contribute("ui:log", logger), true);
    context.after(async () => {
        await reset();
        assert.deepEqual(errors, [], "DOM event handlers must not throw");
        uiCtx.capabilities.remove("ui:log", logger);
        globalThis.fetch = originalFetch;
        for (const [key, value] of previous) globalThis[key] = value;
        hooks.deregister();
        dom.window.close();
    });
    async function reset() {
        for (const overlay of document.querySelectorAll(
            ".search-popup-overlay",
        ))
            overlay.__closeSearchPopup();
        await wait(160);
        document
            .querySelectorAll(".search-bar-wrap, .toast-tray")
            .forEach((element) => element.remove());
        localStorage.clear();
        results.splice(
            0,
            results.length,
            { id: "one", label: "Fixture destination", url: "/settings" },
            { id: "two", label: "Fixture second", url: "/docs" },
        );
    }
    function open(options = {}, navbar = false) {
        const config = { endpoint: "/api/v1/search", ...options };
        let toggle;
        let close;
        if (navbar) {
            const bar = api.createSearchBar(config);
            document.body.append(bar);
            toggle = bar.querySelector("button");
            toggle.click();
        } else close = api.openSearchPopup(config);
        const overlay = document.querySelector(
            ".search-popup-overlay:not(.search-popup-overlay--closing)",
        );
        return {
            overlay,
            close,
            toggle,
            input: overlay?.querySelector("input"),
        };
    }
    async function query(popup, text = "Fixture") {
        popup.input.value = text;
        popup.input.dispatchEvent(new Event("input", { bubbles: true }));
        for (
            let attempt = 0;
            attempt < 100 &&
            !popup.overlay.querySelector(".search-popup-result");
            attempt += 1
        )
            await wait(10);
        const rows = [
            ...popup.overlay.querySelectorAll(".search-popup-result"),
        ];
        assert.ok(rows.length, "Actual Search renders matching results");
        return rows;
    }
    const key = (element, value) =>
        element.dispatchEvent(
            new KeyboardEvent("keydown", {
                key: value,
                bubbles: true,
                cancelable: true,
            }),
        );
    return { ...api, uiCtx, logs, requests, results, open, query, key, reset };
}

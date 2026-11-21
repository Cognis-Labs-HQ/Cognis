import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

let sequence = 0;
async function fixture({ pending = false } = {}) {
    const dom = new JSDOM(
        '<!doctype html><html><head></head><body><section><button id="trigger">Actions</button></section><button id="outside">Outside</button></body></html>',
        { url: "https://fixture.invalid" },
    );
    for (const name of [
        "window",
        "document",
        "HTMLButtonElement",
        "AbortController",
        "AbortSignal",
    ])
        globalThis[name] = dom.window[name];
    dom.window.matchMedia = () => ({ matches: false });
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/static/styles/reuse/hamburger-menu.css";
    if (!pending) Object.defineProperty(link, "sheet", { value: {} });
    document.head.append(link);
    const { openHamburgerMenu } = await import(
        `../../reuse/hamburger-menu.js?audit=${++sequence}`
    );
    const styles = new dom.window.MutationObserver(() => {
        if (pending) return;
        for (const resource of document.head.querySelectorAll("link")) {
            if (!resource.sheet) {
                Object.defineProperty(resource, "sheet", { value: {} });
                resource.dispatchEvent(new dom.window.Event("load"));
            }
        }
    });
    styles.observe(document.head, { childList: true });
    const button = document.querySelector("#trigger");
    const items = [
        { id: "disabled", label: "Unavailable", disabled: true },
        { id: "view", label: "View" },
        { id: "edit", label: "Edit" },
    ];
    const open = () => openHamburgerMenu(button, { items });
    const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
    const escape = () =>
        document.dispatchEvent(
            new dom.window.KeyboardEvent("keydown", {
                key: "Escape",
                bubbles: true,
            }),
        );
    return { dom, button, link, open, tick, escape };
}

async function using(options, callback) {
    const setup = await fixture(options);
    try {
        await callback(setup);
    } finally {
        setup.escape();
        setup.dom.window.close();
    }
}

test("disconnected trigger while CSS pending does not open a stale menu", async () =>
    using({ pending: true }, async ({ button, link, open, tick, dom }) => {
        const result = open();
        button.remove();
        link.dispatchEvent(new dom.window.Event("load"));
        await tick();
        assert.equal(document.querySelector(".hamburger-menu"), null);
        assert.equal(await result, null);
    }));

test("disconnecting an active menu trigger dismisses its surface", async () =>
    using({}, async ({ button, open, tick }) => {
        open();
        await tick();
        button.remove();
        await tick();
        assert.equal(document.querySelector(".hamburger-menu"), null);
    }));

test("opening menu moves focus to first enabled item", async () =>
    using({}, async ({ button, open, tick }) => {
        button.focus();
        open();
        await tick();
        assert.equal(document.activeElement?.dataset.actionId, "view");
    }));

test("ArrowDown moves to the next enabled menu item", async () =>
    using({}, async ({ open, tick, dom }) => {
        open();
        await tick();
        const first = document.querySelector('[data-action-id="view"]');
        first.focus();
        first.dispatchEvent(
            new dom.window.KeyboardEvent("keydown", {
                key: "ArrowDown",
                bubbles: true,
                cancelable: true,
            }),
        );
        assert.equal(document.activeElement?.dataset.actionId, "edit");
    }));

test("Escape returns focus from a menu item to its invoker", async () =>
    using({}, async ({ button, open, tick, escape }) => {
        const result = open();
        await tick();
        document.querySelector('[data-action-id="view"]').focus();
        escape();
        assert.equal(await result, null);
        assert.equal(document.activeElement, button);
    }));

test("ordinary click resolves selected action exactly once and removes menu", async () =>
    using({}, async ({ open, tick }) => {
        const result = open();
        await tick();
        document.querySelector('[data-action-id="view"]').click();
        assert.equal(await result, "view");
        assert.equal(document.querySelector(".hamburger-menu"), null);
    }));

test("disabled button does not choose an action and outside click dismisses", async () =>
    using({}, async ({ open, tick }) => {
        const result = open();
        await tick();
        document.querySelector('[data-action-id="disabled"]').click();
        assert.ok(document.querySelector(".hamburger-menu"));
        document.querySelector("#outside").click();
        assert.equal(await result, null);
    }));

test("a new opening dismisses the old one and stays active", async () =>
    using({}, async ({ open, tick, escape }) => {
        const first = open();
        await tick();
        const second = open();
        await tick();
        assert.equal(await first, null);
        assert.equal(document.querySelectorAll(".hamburger-menu").length, 1);
        escape();
        assert.equal(await second, null);
    }));

test("retired trigger menu cannot return an action after page content replacement", async () =>
    using({}, async ({ button, open, tick }) => {
        const result = open();
        await tick();
        const retained = document.querySelector('[data-action-id="edit"]');
        button.parentElement.replaceChildren(document.createElement("p"));
        await tick();
        retained.click();
        assert.equal(await result, null);
    }));

test("retained old item cannot settle a replacement menu", async () =>
    using({}, async ({ open, tick, escape }) => {
        const first = open();
        await tick();
        const retained = document.querySelector('[data-action-id="edit"]');
        const second = open();
        await tick();
        retained.click();
        assert.equal(await first, null);
        assert.equal(document.querySelectorAll(".hamburger-menu").length, 1);
        escape();
        assert.equal(await second, null);
    }));

test("mount cancellation settles pending CSS without waiting for load", async () =>
    using({ pending: true }, async ({ button, dom, tick }) => {
        const { openHamburgerMenu } =
            await import("../../reuse/hamburger-menu.js");
        const controller = new dom.window.AbortController();
        const result = openHamburgerMenu(button, {
            items: [{ id: "edit", label: "Edit" }],
            signal: controller.signal,
        });
        controller.abort();
        assert.equal(await result, null);
        await tick();
        assert.equal(document.querySelector(".hamburger-menu"), null);
    }));

test("empty, disabled and already aborted menus resolve null", async () =>
    using({}, async ({ button, dom }) => {
        const { openHamburgerMenu } =
            await import("../../reuse/hamburger-menu.js");
        assert.equal(await openHamburgerMenu(button, { items: [] }), null);
        assert.equal(
            await openHamburgerMenu(button, {
                items: [{ id: "none", disabled: true }],
            }),
            null,
        );
        const controller = new dom.window.AbortController();
        controller.abort();
        assert.equal(
            await openHamburgerMenu(button, {
                items: [{ id: "edit" }],
                signal: controller.signal,
            }),
            null,
        );
    }));

test("synchronous disconnection rejects retained selection before observer delivery", async () =>
    using({}, async ({ button, open, tick }) => {
        const result = open();
        await tick();
        const retained = document.querySelector('[data-action-id="view"]');
        button.remove();
        retained.click();
        assert.equal(await result, null);
    }));

test("ArrowUp wraps, Home and End skip disabled items, Tab releases without prevention", async () =>
    using({}, async ({ open, tick, dom, button }) => {
        const result = open();
        await tick();
        const key = (value) => {
            const event = new dom.window.KeyboardEvent("keydown", {
                key: value,
                bubbles: true,
                cancelable: true,
            });
            document.activeElement.dispatchEvent(event);
            return event;
        };
        key("ArrowUp");
        assert.equal(document.activeElement.dataset.actionId, "edit");
        key("Home");
        assert.equal(document.activeElement.dataset.actionId, "view");
        key("End");
        assert.equal(document.activeElement.dataset.actionId, "edit");
        assert.equal(key("Tab").defaultPrevented, false);
        assert.equal(await result, null);
        assert.equal(document.activeElement, button);
    }));

test("outside pointer focus is retained and transient attributes restored", async () =>
    using({}, async ({ open, tick, button }) => {
        button.setAttribute("aria-haspopup", "dialog");
        const result = open();
        await tick();
        const outside = document.querySelector("#outside");
        outside.focus();
        outside.click();
        assert.equal(await result, null);
        assert.equal(document.activeElement, outside);
        assert.equal(button.getAttribute("aria-haspopup"), "dialog");
        assert.equal(button.getAttribute("aria-expanded"), null);
    }));

test("escaped localized labels, titles and IDs retain the existing contract", async () =>
    using({}, async ({ button, tick }) => {
        const { openHamburgerMenu } =
            await import("../../reuse/hamburger-menu.js");
        const result = openHamburgerMenu(button, {
            items: [
                {
                    id: "a&amp;b",
                    label: "&lt;編集&gt;",
                    title: "&quot;説明&quot;",
                },
            ],
        });
        await tick();
        const item = document.querySelector(".hamburger-menu-item");
        assert.equal(item.textContent, "<編集>");
        assert.equal(item.title, '"説明"');
        item.click();
        assert.equal(await result, "a&b");
    }));

test("reentrant focus activation keeps the newer menu current", async () =>
    using({}, async ({ button, open, tick, escape }) => {
        const first = open();
        await tick();
        let second;
        button.addEventListener(
            "focus",
            () => {
                second = open();
            },
            { once: true },
        );
        escape();
        assert.equal(await first, null);
        await tick();
        assert.equal(document.querySelectorAll(".hamburger-menu").length, 1);
        escape();
        assert.equal(await second, null);
    }));

test("direct and actual bundled imports share pending and active ownership", async (context) =>
    using({ pending: true }, async ({ button, open, tick, dom, link }) => {
        const { build } = await import("esbuild");
        const { mkdtemp, rm } = await import("node:fs/promises");
        const { tmpdir } = await import("node:os");
        const { join } = await import("node:path");
        const { pathToFileURL } = await import("node:url");
        const directory = await mkdtemp(join(tmpdir(), "cognis-menu-bundle-"));
        context.after(() => rm(directory, { recursive: true, force: true }));
        const outfile = join(directory, "menu.mjs");
        await build({
            entryPoints: [
                new URL("../../reuse/hamburger-menu.js", import.meta.url)
                    .pathname,
            ],
            bundle: true,
            format: "esm",
            platform: "browser",
            outfile,
        });
        const bundled = await import(pathToFileURL(outfile).href);
        const first = open();
        const second = bundled.openHamburgerMenu(button, {
            items: [{ id: "bundle", label: "Bundled action" }],
        });
        assert.equal(await first, null);
        await tick();
        const pending = document.querySelector(
            'link[href="/static/styles/reuse/hamburger-menu.css"]',
        );
        pending.dispatchEvent(new dom.window.Event("load"));
        link.dispatchEvent(new dom.window.Event("load"));
        await tick();
        const retained = document.querySelector('[data-action-id="bundle"]');
        assert.ok(retained);
        retained.click();
        assert.equal(await second, "bundle");
    }));

test("focus departure cancels pending stylesheet preparation before late load", async () =>
    using({ pending: true }, async ({ button, link, open, tick, dom }) => {
        button.focus();
        const result = open();
        const outside = document.querySelector("#outside");
        outside.focus();
        assert.equal(await result, null);
        link.dispatchEvent(new dom.window.Event("load"));
        await tick();
        assert.equal(document.activeElement, outside);
        assert.equal(document.querySelector(".hamburger-menu"), null);
    }));

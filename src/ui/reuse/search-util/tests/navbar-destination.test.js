import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
    deferred,
    selectionFixture,
    wait,
    waitForRemoval,
} from "./selection-fixture.js";
import { navigation } from "./fixtures/router.js";

// Public router and authentication dependencies are static contract fixtures.
const hooks = registerHooks({
    resolve(specifier, parent, next) {
        if (
            specifier === "../reuse/app-router.js" &&
            parent.parentURL?.endsWith("/layouts/dashboard-layout.js")
        )
            return next(
                new URL("./fixtures/router.js", import.meta.url).href,
                parent,
            );
        if (specifier.endsWith("/gateways/auth/session-flow-hooks.js"))
            return next(
                new URL("./fixtures/session.js", import.meta.url).href,
                parent,
            );
        return next(specifier, parent);
    },
});

test("the actual navbar preserves a destination veto before route teardown", async (context) => {
    const fixture = await selectionFixture(context);
    context.after(() => hooks.deregister());
    const oldNavigator = Object.getOwnPropertyDescriptor(
        globalThis,
        "navigator",
    );
    Object.defineProperty(globalThis, "navigator", {
        configurable: true,
        value: window.navigator,
    });
    context.after(() => {
        if (oldNavigator)
            Object.defineProperty(globalThis, "navigator", oldNavigator);
        else delete globalThis.navigator;
    });
    window.ResizeObserver = class {
        observe() {}
        disconnect() {}
    };
    window.matchMedia = () => ({
        matches: false,
        addEventListener() {},
        removeEventListener() {},
    });
    const fetchSearch = globalThis.fetch;
    globalThis.fetch = async (input, options = {}) => {
        const url = String(input);
        assert.equal(options.method ?? "GET", "GET");
        if (url.startsWith("/static/templates/"))
            return new Response(
                await readFile(
                    new URL(`../../../public/${url.slice(8)}`, import.meta.url),
                ),
            );
        if (url.startsWith("/static/"))
            return new Response(
                await readFile(
                    new URL(`../../../${url.slice(8)}`, import.meta.url),
                ),
            );
        if (url.startsWith("/api/v1/search?"))
            return fetchSearch(input, options);
        return Response.json({ data: [] });
    };
    const observer = new MutationObserver(() => {
        for (const link of document.querySelectorAll(
            'link[rel="stylesheet"]',
        )) {
            if (!link.dataset.fixtureLoaded) {
                link.dataset.fixtureLoaded = "true";
                queueMicrotask(() => link.dispatchEvent(new Event("load")));
            }
        }
    });
    observer.observe(document.head, { childList: true });
    context.after(() => observer.disconnect());
    const { createI18n } = await import("../../i18n.js");
    const i18n = await createI18n({
        preferredLanguages: ["en"],
        persistLocale: false,
    });
    const { renderDashboardLayout } =
        await import("../../../layouts/dashboard-layout.js");
    const lifetime = new AbortController();
    context.after(() => lifetime.abort());
    await renderDashboardLayout(document.querySelector("#app"), {
        i18n,
        signal: lifetime.signal,
        requireAccountSession: false,
        usePreferenceApi: false,
        enableAccountEnhancements: true,
        topbar: "",
        content: "<main>Fixture</main>",
    });
    const toggle = document.querySelector(".search-bar-toggle");
    assert.ok(toggle);
    assert.equal(navigation.initializations, 1);
    toggle.click();
    const overlay = document.querySelector(".search-popup-overlay");
    const popup = { overlay, input: overlay.querySelector("input") };
    const [row] = await fixture.query(popup);
    navigation.result = false;
    row.click();
    await wait(170);
    assert.deepEqual(navigation.calls, ["/settings"]);
    assert.equal(
        overlay.classList.contains("search-popup-overlay--closing"),
        false,
    );
    assert.equal(document.querySelectorAll(".toast--error").length, 0);
    assert.equal(popup.input.value, "Fixture");
    const pending = deferred();
    navigation.result = pending.promise;
    row.click();
    await wait();
    assert.equal(
        overlay.classList.contains("search-popup-overlay--closing"),
        false,
    );
    pending.resolve(true);
    await waitForRemoval(overlay);
    assert.equal(overlay.isConnected, false);
    fixture.results.splice(0, fixture.results.length, {
        id: "local-target",
        label: "Fixture on-page action",
    });
    const target = document.createElement("div");
    target.id = "local-target";
    let scrolled = false;
    target.scrollIntoView = () => {
        scrolled = true;
    };
    document.querySelector("#app").append(target);
    toggle.click();
    const localOverlay = document.querySelector(".search-popup-overlay");
    const localPopup = {
        overlay: localOverlay,
        input: localOverlay.querySelector("input"),
    };
    (await fixture.query(localPopup))[0].click();
    await waitForRemoval(localOverlay);
    assert.equal(
        navigation.calls.length,
        2,
        "ID-only results keep their existing on-page behavior",
    );
    assert.equal(scrolled, true);
    assert.equal(target.classList.contains("search-target-highlight"), true);
    assert.equal(localOverlay.isConnected, false);
});

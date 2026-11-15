import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const dom = new JSDOM(
    "<!doctype html><html><head></head><body></body></html>",
    {
        url: "https://cognis.test/users",
        pretendToBeVisual: true,
    },
);
for (const name of [
    "window",
    "document",
    "HTMLElement",
    "HTMLButtonElement",
    "MutationObserver",
    "AbortController",
    "AbortSignal",
    "CustomEvent",
    "Event",
    "KeyboardEvent",
    "localStorage",
])
    globalThis[name] = dom.window[name];
dom.window.matchMedia = () => ({ matches: false });
// Only resource readiness is supplied; production stylesheet ownership remains active.
const resources = new MutationObserver(() => {
    for (const link of document.head.querySelectorAll(
        'link[rel="stylesheet"]',
    )) {
        if (link.sheet) continue;
        Object.defineProperty(link, "sheet", { value: {} });
        link.dispatchEvent(new Event("load"));
    }
});
resources.observe(document.head, { childList: true });
const { uiCtx } = await import("../../reuse/ui-ctx.js");
const { openHamburgerMenu } = await import("../../reuse/hamburger-menu.js");
const { transientSurfaces } = await import("../../reuse/transient-surfaces.js");
const queue = uiCtx.capabilities.get("ui:floatingMenus");
const tick = () => new Promise(setImmediate);
const items = [{ id: "inspect", label: "Inspect" }];
const lifetimes = [];
function lifetime() {
    const controller = new AbortController();
    lifetimes.push(controller);
    return controller;
}
function button() {
    const element = document.createElement("button");
    element.textContent = "Actions";
    document.body.append(element);
    return element;
}
async function waitFor(check) {
    for (let count = 0; count < 30; count++) {
        if (check()) return;
        await tick();
    }
    assert.ok(check(), "Expected state was not reached");
}
test.afterEach(async () => {
    for (const controller of lifetimes.splice(0)) controller.abort();
    await tick();
    document.body.replaceChildren();
});
test.after(() => {
    resources.disconnect();
    dom.window.close();
});

test("action menu preempts a toolbar lease and releases it on owner abort", async () => {
    const toolbar = document.createElement("div");
    document.body.append(toolbar);
    const toolbarLease = await queue.request({ signal: lifetime().signal });
    await toolbarLease.present(toolbar);
    assert.equal(toolbar.hidden, false);
    const owner = lifetime();
    const result = openHamburgerMenu(button(), { items, signal: owner.signal });
    await waitFor(() => document.querySelector(".hamburger-menu-item"));
    assert.equal(toolbar.hidden, true);
    owner.abort();
    assert.equal(await result, null);
    await waitFor(() => !toolbar.hidden);
});

test("tutorial reservation delays an action menu without moving focus", async () => {
    const reservation = await queue.request({
        priority: 100,
        signal: lifetime().signal,
    });
    const target = button();
    target.focus();
    const result = openHamburgerMenu(target, {
        items,
        signal: lifetime().signal,
    });
    await tick();
    assert.equal(document.querySelector(".hamburger-menu"), null);
    assert.equal(document.activeElement, target);
    await reservation.dispose();
    await waitFor(() => document.activeElement.matches(".hamburger-menu-item"));
    document.activeElement.click();
    assert.equal(await result, "inspect");
});

test("a new tutorial reservation dismisses an open action menu without stealing tutorial focus", async () => {
    const target = button();
    const result = openHamburgerMenu(target, {
        items,
        signal: lifetime().signal,
    });
    await waitFor(() => document.querySelector(".hamburger-menu-item"));
    const tutorialControl = button();
    const reservation = await queue.request({
        priority: 100,
        signal: lifetime().signal,
    });
    tutorialControl.focus();
    assert.equal(await result, null);
    assert.equal(document.activeElement, tutorialControl);
    await reservation.dispose();
    assert.equal(document.querySelector(".hamburger-menu"), null);
});

test("transient consumer abort closes the registered action surface and releases the queue", async () => {
    const result = openHamburgerMenu(button(), {
        items,
        signal: lifetime().signal,
    });
    await waitFor(() => document.querySelector(".hamburger-menu-item"));
    const consumer = lifetime();
    assert.equal(
        transientSurfaces.attachLifetime(
            document.querySelector(".hamburger-menu"),
            consumer.signal,
        ),
        true,
    );
    consumer.abort();
    assert.equal(await result, null);
    const lease = await queue.request({ signal: lifetime().signal });
    assert.equal(await lease.ready, true);
});

test("abort while queued never presents after tutorial release", async () => {
    const reservation = await queue.request({
        priority: 100,
        signal: lifetime().signal,
    });
    const owner = lifetime();
    const target = button();
    target.focus();
    const result = openHamburgerMenu(target, { items, signal: owner.signal });
    await tick();
    owner.abort();
    assert.equal(await result, null);
    await reservation.dispose();
    await tick();
    assert.equal(document.querySelector(".hamburger-menu"), null);
    assert.equal(document.activeElement, target);
});

// Resource/localization contracts are static; registration, progression, presentation,
// reservations and teardown all execute the exported tutorial runtime.
const originalResources = uiCtx.capabilities.get("ui:reuse");
uiCtx.capabilities.remove("ui:reuse", originalResources);
uiCtx.capabilities.contribute("ui:reuse", {
    ...originalResources,
    loadStylesheets: async () => {},
    importModule: async (name) => {
        assert.equal(name, "i18n.js");
        return { createI18n: async () => ({ t: (key) => key }) };
    },
});
uiCtx.capabilities.contribute("session:isAuthenticated", () => true);
localStorage.setItem("cognis_account", "fixture-account");
localStorage.setItem("cognis_role", "admin");
const { guides: userGuides } = await import("../../app/users/guides.js");
const { guides: moduleGuides } = await import("../../app/modules/guides.js");

for (const scenario of [
    {
        guide: userGuides[0],
        path: "/users",
        id: "directory",
        step: "account-actions",
        markup: '<div class="users-list"></div><select class="users-role-select"></select><button class="users-menu-btn">Actions</button><a class="users-name">Name</a>',
        selector: ".users-menu-btn:not(:disabled)",
    },
    {
        guide: moduleGuides[0],
        path: "/administration/modules/example",
        id: "details",
        step: "manage-lifecycle",
        markup: '<div class="module-detail"><div class="module-detail-release"></div><button data-module-menu="example">Actions</button></div>',
        selector: "[data-module-menu]",
    },
]) {
    test(`real ${scenario.id} tutorial preserves reservations through Back, Restart and owner teardown`, async () => {
        dom.reconfigure({ url: `https://cognis.test${scenario.path}` });
        document.body.innerHTML = scenario.markup;
        for (const element of document.body.querySelectorAll("*")) {
            element.getClientRects = () => [{ width: 100, height: 30 }];
            element.getBoundingClientRect = () => ({
                left: 20,
                top: 20,
                right: 120,
                bottom: 50,
                width: 100,
                height: 30,
            });
        }
        const api = uiCtx.capabilities.get("ui:tutorials");
        const owner = lifetime();
        await api.mountPage({
            ...scenario.guide,
            root: document.body,
            signal: owner.signal,
            i18n: { t: (key) => key },
        });
        const listed = await api.list({ page: { pathname: scenario.path } });
        const play = listed.find((entry) =>
            entry.id.endsWith(`:${scenario.id}`),
        );
        assert.ok(play);
        const session = await api.start(play.id);
        assert.equal(await session.ready, true);
        for (
            let count = 0;
            count < 6 && session.state().stepId !== scenario.step;
            count++
        ) {
            await session.next();
        }
        assert.equal(session.state().stepId, scenario.step);
        const target = document.querySelector(scenario.selector);
        assert.ok(target);
        const result = openHamburgerMenu(target, {
            items,
            signal: owner.signal,
        });
        await tick();
        assert.equal(document.querySelector(".hamburger-menu"), null);
        await session.back();
        await session.restart();
        assert.equal(session.state().index, 0);
        assert.equal(document.querySelector(".hamburger-menu"), null);
        owner.abort();
        assert.equal((await session.finished).status, "cancelled");
        assert.equal(await result, null);
        await tick();
        assert.equal(document.querySelector(".tutorial-layer"), null);
        assert.equal(document.querySelector(".tutorial-actions"), null);
        const lease = await queue.request({ signal: lifetime().signal });
        assert.equal(await lease.ready, true);
    });
}

test("focus departure cancels a queued opening before a reservation yields", async () => {
    const reservation = await queue.request({
        priority: 100,
        signal: lifetime().signal,
    });
    const trigger = button();
    const outside = button();
    trigger.focus();
    const result = openHamburgerMenu(trigger, {
        items,
        signal: lifetime().signal,
    });
    await tick();
    outside.focus();
    assert.equal(await result, null);
    await reservation.dispose();
    await tick();
    assert.equal(document.activeElement, outside);
    assert.equal(document.querySelector(".hamburger-menu"), null);
});

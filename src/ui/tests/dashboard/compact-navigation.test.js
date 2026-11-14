import test from "node:test";
import assert from "node:assert/strict";
import { bindCompactNavigation } from "../../layouts/compact-navigation.js";
import { createDrawerDocument } from "../../reuse/tests/fixtures/drawer-dom.js";

function fixture() {
    const { document, observers } = createDrawerDocument();
    document.defaultView.MutationObserver = document.defaultView.ResizeObserver;
    const root = document.createElement("section");
    const navrow = document.createElement("nav");
    navrow.className = "global-navrow";
    const topnav = document.createElement("div");
    topnav.className = "topnav";
    topnav.scrollWidth = 600;
    topnav.clientWidth = 180;
    topnav.innerHTML = '<a href="/dashboard">Dashboard</a>';
    const trigger = document.createElement("button");
    trigger.id = "nav-compact-toggle";
    navrow.append(trigger, topnav);
    const panel = document.createElement("aside");
    panel.id = "nav-drawer";
    const closeButton = document.createElement("button");
    closeButton.id = "nav-drawer-close";
    const navigation = document.createElement("nav");
    navigation.className = "nav-drawer-nav";
    panel.append(closeButton, navigation);
    const backdrop = document.createElement("div");
    backdrop.id = "nav-drawer-backdrop";
    root.append(navrow, panel, backdrop);
    document.body.append(root);
    const logs = [];
    const controller = new AbortController();
    let preparations = 0;
    const destroy = bindCompactNavigation(root, {
        signal: controller.signal,
        prepareNavigation: () => preparations++,
        log: (...args) => logs.push(args),
    });
    return {
        document,
        observers,
        root,
        navrow,
        topnav,
        trigger,
        panel,
        navigation,
        backdrop,
        closeButton,
        controller,
        destroy,
        logs,
        preparations: () => preparations,
    };
}

test("overflowing shell navigation opens accessibly and closes by Escape or backdrop", () => {
    const state = fixture();
    assert.equal(
        state.navrow.classList.contains("global-navrow--compact"),
        true,
    );
    assert.equal(state.topnav.inert, true);
    assert.equal(state.panel.inert, true);
    assert.equal(state.navigation.innerHTML, state.topnav.innerHTML);
    state.trigger.click();
    assert.equal(state.panel.classList.contains("nav-drawer--open"), true);
    assert.equal(state.panel.inert, false);
    assert.equal(state.trigger.getAttribute("aria-expanded"), "true");
    assert.equal(state.document.activeElement, state.closeButton);
    state.document.dispatch("keydown", { key: "Escape" });
    assert.equal(state.trigger.getAttribute("aria-expanded"), "false");
    assert.equal(state.document.activeElement, state.trigger);
    state.trigger.click();
    state.backdrop.click();
    assert.equal(state.panel.inert, true);
    assert.equal(state.document.body.style.overflow, "");
    assert.equal(state.logs.length, 4);
    state.destroy();
});

test("desktop resize releases drawer isolation and keeps primary links interactive", () => {
    const state = fixture();
    state.trigger.click();
    state.topnav.clientWidth = 900;
    state.observers[0].callback();
    assert.equal(state.trigger.hidden, true);
    assert.equal(state.topnav.inert, false);
    assert.equal(
        state.navrow.classList.contains("global-navrow--compact"),
        false,
    );
    assert.equal(state.panel.getAttribute("aria-hidden"), "true");
    assert.equal(state.document.body.style.overflow, "");
    state.destroy();
});

test("provider changes redraw current navigation and page abort disconnects all observers", () => {
    const state = fixture();
    state.topnav.innerHTML = '<a href="/study">Study</a>';
    state.observers[1].callback();
    assert.equal(state.navigation.innerHTML, state.topnav.innerHTML);
    assert.equal(state.preparations(), 2);
    state.trigger.click();
    state.controller.abort();
    assert.equal(state.panel.getAttribute("aria-hidden"), "true");
    assert.equal(state.document.body.style.overflow, "");
    assert.equal(
        state.observers.every((observer) => observer.disconnected),
        true,
    );
    assert.equal(state.trigger.listenerCount("click"), 0);
    assert.equal(state.document.listenerCount("keydown"), 0);
    state.trigger.click();
    assert.equal(state.trigger.getAttribute("aria-expanded"), "false");
});

test("repeated shell binding cleans prior handlers and can reopen the current drawer", () => {
    const state = fixture();
    state.trigger.click();
    const destroy = bindCompactNavigation(state.root);
    assert.equal(state.document.body.style.overflow, "");
    assert.equal(state.trigger.listenerCount("click"), 1);
    state.trigger.click();
    assert.equal(state.trigger.getAttribute("aria-expanded"), "true");
    destroy();
    state.destroy();
    assert.equal(state.document.body.style.overflow, "");
});

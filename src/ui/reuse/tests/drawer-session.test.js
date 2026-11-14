import test from "node:test";
import assert from "node:assert/strict";
import { beginDrawerSession } from "../drawer-session.js";
import { lockPageScroll } from "../page-scroll-lock.js";
import { createDrawerDocument } from "./fixtures/drawer-dom.js";

const separateModuleUrl = new URL("../page-scroll-lock.js", import.meta.url);
separateModuleUrl.search = "separate";
const { lockPageScroll: lockFromSeparateImport } = await import(
    separateModuleUrl.href
);

function fixture() {
    const { document } = createDrawerDocument();
    const shell = document.createElement("section");
    const header = document.createElement("header");
    const trigger = document.createElement("button");
    const account = document.createElement("button");
    const main = document.createElement("main");
    const panel = document.createElement("aside");
    const backdrop = document.createElement("div");
    const first = document.createElement("button");
    const last = document.createElement("a");
    last.setAttribute("href", "/settings");
    header.append(trigger, account);
    panel.append(first, last);
    shell.append(header, main, panel, backdrop);
    document.body.append(shell);
    return {
        document,
        shell,
        panel,
        trigger,
        backdrop,
        first,
        last,
        main,
        account,
    };
}

test("drawers isolate background branches and cycle focus including their external toggle", () => {
    const state = fixture();
    state.panel.style.zIndex = "1760";
    state.trigger.style.zIndex = "1770";
    state.trigger.style.position = "fixed";
    const close = beginDrawerSession(state);
    assert.equal(state.document.activeElement, state.first);
    assert.equal(state.main.inert, true);
    assert.equal(state.account.inert, true);
    assert.equal(state.trigger.inert, false);
    assert.equal(state.backdrop.inert, false);
    assert.equal(state.panel.getAttribute("role"), "dialog");
    assert.equal(state.document.body.style.overflow, "hidden");
    state.document.dispatch("keydown", { key: "Tab", shiftKey: true });
    assert.equal(state.document.activeElement, state.trigger);
    state.document.dispatch("keydown", { key: "Tab" });
    assert.equal(state.document.activeElement, state.first);
    state.document.dispatch("keydown", { key: "Tab" });
    assert.equal(state.document.activeElement, state.last);
    close();
    assert.equal(state.document.activeElement, state.trigger);
    assert.equal(state.main.inert, false);
    assert.equal(state.account.inert, false);
    assert.equal(state.panel.getAttribute("role"), null);
    assert.equal(state.document.body.style.overflow, "");
    assert.equal(state.document.listenerCount("keydown"), 0);
});

test("drawers dismiss with Escape and ignore already-handled or nested dialog events", () => {
    const state = fixture();
    let dismissals = 0;
    const close = beginDrawerSession({
        ...state,
        onDismiss: () => dismissals++,
    });
    const handled = state.document.dispatch("keydown", {
        key: "Escape",
        defaultPrevented: true,
    });
    assert.equal(handled.defaultPrevented, true);
    assert.equal(dismissals, 0);
    const nested = state.document.createElement("section");
    nested.setAttribute("role", "dialog");
    nested.setAttribute("aria-modal", "true");
    const nestedButton = state.document.createElement("button");
    nested.append(nestedButton);
    state.document.body.append(nested);
    nestedButton.focus();
    const nestedEvent = state.document.dispatch("keydown", { key: "Escape" });
    assert.equal(nestedEvent.defaultPrevented, false);
    assert.equal(dismissals, 0);
    state.first.focus();
    const escape = state.document.dispatch("keydown", { key: "Escape" });
    assert.equal(escape.defaultPrevented, true);
    assert.equal(dismissals, 1);
    close();
});

test("owner abort restores preexisting attributes and leaves newer focus untouched", () => {
    const state = fixture();
    state.panel.setAttribute("role", "navigation");
    state.panel.setAttribute("tabindex", "0");
    state.main.inert = true;
    state.document.body.style.overflow = "clip";
    const controller = new AbortController();
    const close = beginDrawerSession({ ...state, signal: controller.signal });
    controller.abort();
    assert.equal(state.main.inert, true);
    assert.equal(state.account.inert, false);
    assert.equal(state.panel.getAttribute("role"), "navigation");
    assert.equal(state.panel.getAttribute("tabindex"), "0");
    assert.equal(state.document.body.style.overflow, "clip");
    assert.equal(state.document.activeElement, state.first);
    close();
    assert.equal(state.document.activeElement, state.first);
});

test("an empty drawer remains focusable and skips hidden, disabled and negative-tabindex controls", () => {
    const state = fixture();
    state.first.disabled = true;
    state.last.hidden = true;
    state.trigger.tabIndex = -1;
    const close = beginDrawerSession(state);
    assert.equal(state.document.activeElement, state.panel);
    state.document.dispatch("keydown", { key: "Tab" });
    assert.equal(state.document.activeElement, state.panel);
    close();
});

for (const closeDrawerFirst of [true, false]) {
    test(`scroll locks preserve modal ownership when ${closeDrawerFirst ? "drawer" : "popup"} closes first`, () => {
        const state = fixture();
        state.document.defaultView.innerWidth = 1000;
        state.document.documentElement.clientWidth = 985;
        state.document.documentElement.style.scrollbarGutter = "auto";
        state.document.body.style.overflow = "auto";
        const closeDrawer = beginDrawerSession(state);
        const closePopup = lockFromSeparateImport(state.document);
        (closeDrawerFirst ? closeDrawer : closePopup)();
        assert.equal(state.document.body.style.overflow, "hidden");
        assert.equal(
            state.document.documentElement.style.scrollbarGutter,
            "stable",
        );
        (closeDrawerFirst ? closePopup : closeDrawer)();
        assert.equal(state.document.body.style.overflow, "auto");
        assert.equal(
            state.document.documentElement.style.scrollbarGutter,
            "auto",
        );
        closePopup();
        closeDrawer();
        assert.equal(state.document.body.style.overflow, "auto");
    });
}

test("page scroll locking includes independently scrollable main surfaces", () => {
    const state = fixture();
    state.main.style.overflow = "auto";
    state.main.style.overflowY = "auto";
    state.main.scrollHeight = 800;
    state.main.clientHeight = 400;
    state.main.style.scrollbarGutter = "auto";
    const release = lockPageScroll(state.document);
    assert.equal(state.main.style.overflow, "hidden");
    assert.equal(state.main.style.scrollbarGutter, "stable");
    release();
    assert.equal(state.main.style.overflow, "auto");
    assert.equal(state.main.style.scrollbarGutter, "auto");
});

test("foreground tutorial controls remain interactive above an open drawer", () => {
    const state = fixture();
    state.panel.style.position = "fixed";
    state.panel.style.zIndex = "1700";
    const tutorial = state.document.createElement("section");
    tutorial.style.position = "fixed";
    tutorial.style.zIndex = "1800";
    const next = state.document.createElement("button");
    tutorial.append(next);
    state.document.body.append(tutorial);
    const close = beginDrawerSession(state);
    assert.equal(tutorial.inert, false);
    next.focus();
    assert.equal(state.document.activeElement, next);
    const event = state.document.dispatch("keydown", { key: "Tab" });
    assert.equal(event.defaultPrevented, false);
    assert.equal(state.document.activeElement, next);
    close({ restoreFocus: false });
});

import assert from "node:assert/strict";
import test from "node:test";
import { fixture, nextTask } from "./fixture.js";

function hoverPanel(state) {
    for (const button of [state.first, state.second]) {
        button.getBoundingClientRect = () => ({
            left: 100,
            top: 100,
            bottom: 118,
            width: 18,
        });
    }
    state.mouse(state.first, "mouseover");
    state.mouse(state.first, "mouseout", state.overlay());
    state.mouse(state.overlay(), "mouseover", state.first);
    state.visible();
}

test("a hovered panel survives keyboard owner switching and focus departure", async (context) => {
    const state = fixture(context);
    hoverPanel(state);
    const panel = state.overlay();
    state.second.focus();
    state.visible(state.second, "Second explanation");
    assert.equal(state.first.getAttribute("aria-describedby"), null);
    state.outside.focus();
    await nextTask();
    state.visible(state.second, "Second explanation");
    assert.equal(state.overlay(), panel);
    state.mouse(panel, "mouseout");
    state.hidden();
    assert.equal(state.second.getAttribute("aria-describedby"), null);
});

test("rapid keyboard switching transfers panel ownership without stale trigger departures", async (context) => {
    const state = fixture(context);
    hoverPanel(state);
    for (let index = 0; index < 5; index += 1) {
        state.second.focus();
        state.first.focus();
        state.second.focus();
        state.mouse(state.first, "mouseout");
        state.outside.focus();
        state.visible(state.second, "Second explanation");
    }
    await nextTask();
    state.visible(state.second, "Second explanation");
    state.mouse(state.overlay(), "mouseout", state.first);
    state.mouse(state.first, "mouseover", state.overlay());
    state.visible();
    state.mouse(state.first, "mouseout");
    state.hidden();
});

test("removing an old trigger retains the transferred panel but removing its current owner closes it", async (context) => {
    const state = fixture(context);
    hoverPanel(state);
    state.second.focus();
    state.outside.focus();
    state.first.remove();
    await nextTask();
    state.visible(state.second, "Second explanation");
    state.second.remove();
    await nextTask();
    state.hidden();
});

test("Escape after transfer suppresses remaining focus until a new interaction", async (context) => {
    const state = fixture(context);
    hoverPanel(state);
    state.second.focus();
    state.escape();
    state.hidden();
    state.mouse(state.overlay(), "mouseout");
    state.root.append(state.document.createElement("div"));
    state.second.dispatchEvent(
        new state.window.FocusEvent("focusin", { bubbles: true }),
    );
    await nextTask();
    state.hidden();
    assert.equal(state.document.activeElement, state.second);
    state.outside.focus();
    state.second.focus();
    state.visible(state.second, "Second explanation");
    state.outside.focus();
    state.hidden();
});

test("changed panel placement still releases hover when its mouseout arrives", async (context) => {
    const state = fixture(context);
    hoverPanel(state);
    const panel = state.overlay();
    const initialLeft = panel.style.left;
    state.second.getBoundingClientRect = () => ({
        left: 500,
        top: 100,
        bottom: 118,
        width: 18,
    });
    state.second.focus();
    assert.notEqual(panel.style.left, initialLeft);
    state.mouse(panel, "mouseout");
    state.visible(state.second, "Second explanation");
    state.outside.focus();
    await nextTask();
    state.hidden();
});

test("an empty replacement explanation closes the panel and releases its hover", async (context) => {
    const state = fixture(context);
    hoverPanel(state);
    const empty = state.render("", "Empty help");
    empty.focus();
    state.hidden();
    assert.equal(state.first.getAttribute("aria-describedby"), null);
    state.outside.focus();
    state.second.focus();
    state.outside.focus();
    await nextTask();
    state.hidden();
});

test("page departure suspends transferred panel ownership through restoration", async (context) => {
    const state = fixture(context);
    hoverPanel(state);
    state.second.focus();
    state.window.dispatchEvent(
        new state.window.PageTransitionEvent("pagehide", { persisted: true }),
    );
    state.window.dispatchEvent(
        new state.window.PageTransitionEvent("pageshow", { persisted: true }),
    );
    state.root.append(state.document.createElement("div"));
    await nextTask();
    state.hidden();
    state.outside.focus();
    state.second.focus();
    state.visible(state.second, "Second explanation");
    state.outside.focus();
    state.hidden();
});

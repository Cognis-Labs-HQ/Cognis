import assert from "node:assert/strict";
import test from "node:test";
import { fixture, nextTask } from "./fixture.js";

test("focused help survives hover departure without moving focus", (context) => {
    const state = fixture(context);
    state.first.focus();
    state.mouse(state.first, "mouseover");
    state.mouse(state.first, "mouseout");
    assert.equal(state.document.activeElement, state.first);
    state.visible();
});

test("ordinary focus departure hides help but blur while hovered retains it", (context) => {
    const state = fixture(context);
    state.first.focus();
    state.outside.focus();
    state.hidden();
    state.first.focus();
    state.mouse(state.first, "mouseover");
    state.outside.focus();
    state.visible();
    state.mouse(state.first, "mouseout");
    state.hidden();
});

test("trigger to panel and panel to trigger retain help until pointer departure", (context) => {
    const state = fixture(context);
    state.mouse(state.first, "mouseover");
    state.mouse(state.first, "mouseout", state.overlay());
    state.visible();
    state.mouse(state.overlay(), "mouseover", state.first);
    state.visible();
    state.mouse(state.overlay(), "mouseout", state.first);
    state.visible();
    state.mouse(state.first, "mouseover", state.overlay());
    state.mouse(state.first, "mouseout", state.overlay());
    state.mouse(state.overlay(), "mouseover", state.first);
    state.mouse(state.overlay(), "mouseout");
    state.hidden();
});

test("panel departure preserves focused help and blur preserves panel hover", (context) => {
    const state = fixture(context);
    state.first.focus();
    state.mouse(state.first, "mouseover");
    state.mouse(state.first, "mouseout", state.overlay());
    state.mouse(state.overlay(), "mouseover", state.first);
    state.mouse(state.overlay(), "mouseout");
    state.visible();
    state.mouse(state.overlay(), "mouseover");
    state.outside.focus();
    state.visible();
    state.mouse(state.overlay(), "mouseout");
    state.hidden();
});

test("an old trigger's mouseout cannot hide newly focused help", (context) => {
    const state = fixture(context);
    state.mouse(state.first, "mouseover");
    state.second.focus();
    state.mouse(state.first, "mouseout");
    state.visible(state.second, "Second explanation");
    assert.equal(state.first.getAttribute("aria-describedby"), null);
});

test("focus switching replaces content and description ownership", (context) => {
    const state = fixture(context);
    state.first.focus();
    state.second.focus();
    state.visible(state.second, "Second explanation");
    assert.equal(state.first.getAttribute("aria-describedby"), null);
    state.outside.focus();
    state.hidden();
});

test("hover can select another trigger and departure returns to remaining focus", (context) => {
    const state = fixture(context);
    state.first.focus();
    state.mouse(state.second, "mouseover");
    state.visible(state.second, "Second explanation");
    state.mouse(state.second, "mouseout");
    state.visible();
    assert.equal(state.document.activeElement, state.first);
});

test("rapid mixed interactions always retain the current owner", async (context) => {
    const state = fixture(context);
    for (let index = 0; index < 10; index += 1) {
        state.first.focus();
        state.mouse(state.first, "mouseover");
        state.second.focus();
        state.mouse(state.first, "mouseout", state.second);
        state.mouse(state.second, "mouseover", state.first);
        state.mouse(state.second, "mouseout", state.overlay());
        state.mouse(state.overlay(), "mouseover", state.second);
        state.visible(state.second, "Second explanation");
        state.mouse(state.overlay(), "mouseout");
        state.visible(state.second, "Second explanation");
    }
    await nextTask();
    state.visible(state.second, "Second explanation");
});

test("nested trigger and panel targets do not count as leaving their owner", (context) => {
    const state = fixture(context);
    const icon = state.document.createElement("span");
    icon.textContent = "i";
    state.first.replaceChildren(icon);
    state.mouse(icon, "mouseover");
    state.mouse(icon, "mouseout", state.first);
    state.visible();
    state.mouse(state.first, "mouseover", icon);
    state.mouse(icon, "mouseout", state.overlay());
    const textNode = state.overlay().firstChild;
    state.mouse(textNode, "mouseover", icon);
    state.mouse(textNode, "mouseout", state.overlay());
    state.visible();
    state.mouse(state.overlay(), "mouseout");
    state.hidden();
});

test("Escape stays dismissed through redundant events without consuming Escape", async (context) => {
    const state = fixture(context);
    state.first.focus();
    state.mouse(state.first, "mouseover");
    let received = 0;
    state.window.addEventListener("keydown", (event) => {
        assert.equal(event.defaultPrevented, false);
        received += 1;
    });
    assert.equal(state.escape(), true);
    assert.equal(received, 1);
    assert.equal(state.document.activeElement, state.first);
    state.hidden();
    state.mouse(state.first, "mouseover");
    state.first.dispatchEvent(
        new state.window.FocusEvent("focusin", { bubbles: true }),
    );
    state.render("Another explanation", "Another help");
    await nextTask();
    state.hidden();
    state.mouse(state.first, "mouseout");
    state.mouse(state.first, "mouseover");
    state.hidden();
    state.outside.focus();
    state.hidden();
    state.mouse(state.first, "mouseout");
    state.mouse(state.first, "mouseover");
    state.visible();
});

test("Escape suppresses existing focus and hover owners but permits a new interaction", (context) => {
    const state = fixture(context);
    state.first.focus();
    state.mouse(state.second, "mouseover");
    state.escape();
    state.mouse(state.second, "mouseout");
    state.hidden();
    state.mouse(state.second, "mouseover");
    state.visible(state.second, "Second explanation");
    state.mouse(state.second, "mouseout");
    state.hidden();
    state.outside.focus();
    state.first.focus();
    state.visible();
});

test("Escape over the panel closes it and a later hover can reopen", (context) => {
    const state = fixture(context);
    state.mouse(state.first, "mouseover");
    state.mouse(state.first, "mouseout", state.overlay());
    state.mouse(state.overlay(), "mouseover", state.first);
    state.escape();
    state.hidden();
    state.mouse(state.overlay(), "mouseout");
    state.mouse(state.first, "mouseover");
    state.visible();
});

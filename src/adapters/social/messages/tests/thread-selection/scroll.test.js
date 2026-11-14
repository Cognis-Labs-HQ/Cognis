import test from "node:test";
import assert from "node:assert/strict";
import { createRenderer, message, select } from "./fixture.js";

// jsdom has no layout engine. Supply geometry to check the scroll policy,
// without asserting browser pixels, native scrolling or clipboard behavior.
function geometry(state) {
    Object.defineProperties(state.container, {
        clientHeight: { get: () => 100 },
        scrollHeight: { get: () => state.container.children.length * 20 },
    });
    Object.defineProperty(
        state.document.defaultView.HTMLElement.prototype,
        "offsetTop",
        {
            get() {
                return (
                    Array.from(this.parentNode?.children ?? []).indexOf(this) *
                    20
                );
            },
            configurable: true,
        },
    );
}

test("synthetic scroll geometry keeps near-bottom following and a scrolled-up row anchored", async (context) => {
    const state = createRenderer();
    context.after(state.dispose);
    geometry(state);
    state.messages = Array.from({ length: 20 }, (_value, index) =>
        message(`message-${index}`, index),
    );
    await state.render();
    state.container.scrollTop = state.container.scrollHeight - 100;
    state.messages.push(message("new", 20));
    await state.render();
    assert.equal(state.container.scrollTop, state.container.scrollHeight);
    state.container.scrollTop = 160;
    const body = state.body("message-10");
    const snapshot = select(
        state.document,
        body.querySelector("strong").firstChild,
    );
    state.messages.push(message("next", 21));
    await state.render();
    assert.equal(state.container.scrollTop, 160);
    state.messages.unshift(message("earlier", -1));
    await state.render();
    // The inserted message adds a previous-day divider and its row.
    assert.equal(state.container.scrollTop, 200);
    assert.equal(state.body("message-10"), body);
    assert.equal(snapshot.selection.toString(), snapshot.text);
});

test("synthetic history prepend geometry preserves the viewport offset and selected body", async (context) => {
    const state = createRenderer();
    context.after(state.dispose);
    geometry(state);
    state.messages = Array.from({ length: 100 }, (_value, index) =>
        message(`message-${index}`, index),
    );
    await state.render();
    state.container.scrollTop = 150;
    const height = state.container.scrollHeight;
    const body = state.body("message-55");
    const snapshot = select(
        state.document,
        body.querySelector("strong").firstChild,
    );
    await state.render({ before: message("boundary", 50).createdAt });
    assert.equal(
        state.container.scrollTop,
        150 + state.container.scrollHeight - height,
    );
    assert.equal(state.body("message-55"), body);
    assert.equal(snapshot.selection.toString(), snapshot.text);
});

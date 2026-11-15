import assert from "node:assert/strict";
import test from "node:test";
import { fixture } from "./fixture.js";

test("selection preserves native focus and the document URL", () => {
    const state = fixture();
    try {
        state.buttons[1].focus();
        assert.equal(state.dom.window.document.activeElement, state.buttons[1]);
        state.buttons[1].click();
        assert.equal(state.dom.window.document.activeElement, state.buttons[1]);
        assert.equal(
            state.dom.window.location.href,
            "https://fixture.invalid/docs",
        );
        assert.equal(state.submissions.length, 0);
    } finally {
        state.signal.abort();
        state.dom.window.close();
    }
});

test("owner cleanup allows repeated mounts without duplicate selection or scroll", () => {
    const state = fixture();
    let owner = state.signal;
    try {
        for (let i = 0; i < 3; i++) {
            owner.abort();
            state.buttons[0].click();
            assert.equal(state.selections.length, i);
            assert.equal(state.scrolls.length, i);
            owner = new state.dom.window.AbortController();
            state.menu.mount(state.root, { signal: owner.signal });
            state.buttons[0].click();
            assert.equal(state.selections.length, i + 1);
            assert.equal(state.scrolls.length, i + 1);
            assert.equal(state.buttons[0].getAttribute("aria-current"), "page");
        }
        assert.deepEqual(state.selections, [
            "overview",
            "overview",
            "overview",
        ]);
        assert.equal(state.submissions.length, 0);
    } finally {
        owner.abort();
        state.dom.window.close();
    }
});

test("collapsible group state persists until its owner is aborted", () => {
    const state = fixture();
    try {
        const group = state.root.querySelector("details");
        assert.equal(group.open, true);
        group.open = false;
        group.dispatchEvent(new state.dom.window.Event("toggle"));
        assert.equal(
            state.dom.window.localStorage.getItem("synthetic-menu:guide"),
            "false",
        );
        const preview = state.dom.window.document.createElement("section");
        preview.innerHTML = state.menu.render();
        assert.equal(preview.querySelector("details").open, false);
        assert.equal(
            preview.querySelector("summary").textContent,
            "Guide & Notes",
        );
        state.signal.abort();
        group.open = true;
        group.dispatchEvent(new state.dom.window.Event("toggle"));
        assert.equal(
            state.dom.window.localStorage.getItem("synthetic-menu:guide"),
            "false",
        );
    } finally {
        state.signal.abort();
        state.dom.window.close();
    }
});

import assert from "node:assert/strict";
import test from "node:test";
import { fixture } from "./fixture.js";

test("existing and concurrently added description tokens survive switching and dismissal", (context) => {
    const state = fixture(context);
    state.first.setAttribute("aria-describedby", "existing another");
    state.first.focus();
    state.visible();
    assert.equal(
        state.first.getAttribute("aria-describedby"),
        "existing another info-tooltip-overlay",
    );
    state.first.setAttribute(
        "aria-describedby",
        `${state.first.getAttribute("aria-describedby")} later`,
    );
    state.second.focus();
    assert.equal(
        state.first.getAttribute("aria-describedby"),
        "existing another later",
    );
    state.first.focus();
    state.escape();
    assert.equal(
        state.first.getAttribute("aria-describedby"),
        "existing another later",
    );
});

test("a preexisting overlay description token is not owned or removed by the runtime", (context) => {
    const state = fixture(context);
    state.first.setAttribute(
        "aria-describedby",
        "existing info-tooltip-overlay",
    );
    state.first.focus();
    state.visible();
    state.outside.focus();
    assert.equal(
        state.first.getAttribute("aria-describedby"),
        "existing info-tooltip-overlay",
    );
});

test("plain text, labels and caller IDs stay escaped on a native non-submit button", (context) => {
    const state = fixture(context);
    const text = '<img src=x onerror="fail()"> & contextual help';
    const label = 'Help "with" <markup>';
    const button = state.render(text, label, 'id" data-untrusted="yes');
    assert.equal(button.type, "button");
    assert.equal(button.tabIndex, 0);
    assert.equal(button.getAttribute("aria-label"), label);
    assert.equal(button.getAttribute("data-untrusted"), null);
    button.focus();
    state.visible(button, text);
    assert.equal(state.overlay().getAttribute("role"), "tooltip");
    assert.equal(state.overlay().querySelector("img"), null);
    assert.equal(state.document.activeElement, button);
});

test("placement retains clamping, the gap and top-bottom selection using synthetic bounds", (context) => {
    const state = fixture(context);
    state.first.getBoundingClientRect = () => ({
        left: 100,
        top: 100,
        bottom: 118,
        width: 18,
    });
    state.first.focus();
    const panel = state.overlay();
    Object.defineProperties(panel, {
        offsetWidth: { value: 220 },
        offsetHeight: { value: 60 },
    });
    state.outside.focus();
    state.first.focus();
    assert.equal(panel.style.left, "8px");
    assert.equal(panel.style.top, "32px");
    assert.equal(panel.dataset.placement, "top");
    assert.equal(panel.style.getPropertyValue("--info-tooltip-gap"), "8px");
    state.second.getBoundingClientRect = () => ({
        left: 100,
        top: 2,
        bottom: 20,
        width: 18,
    });
    state.second.focus();
    assert.equal(panel.style.top, "28px");
    assert.equal(panel.dataset.placement, "bottom");
});

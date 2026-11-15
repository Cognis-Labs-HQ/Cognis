import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { renderInfoTooltip } from "../../reuse/info-tooltip.js";
import { fixture, nextTask } from "./fixture.js";

test("removing a focused owner clears the body panel and its description", async (context) => {
    const state = fixture(context);
    state.first.focus();
    state.root.replaceChildren();
    await nextTask();
    state.hidden();
    assert.equal(state.first.getAttribute("aria-describedby"), null);
    const next = state.render("Next explanation", "Next help");
    next.focus();
    state.visible(next, "Next explanation");
});

test("removed hovered owners and panels cannot retain stale help", async (context) => {
    const state = fixture(context);
    state.mouse(state.first, "mouseover");
    state.mouse(state.first, "mouseout", state.overlay());
    state.mouse(state.overlay(), "mouseover", state.first);
    state.first.remove();
    await nextTask();
    state.hidden();
    state.root.append(state.first);
    state.mouse(state.first, "mouseover");
    state.visible();
    state.overlay().remove();
    await nextTask();
    state.visible();
    assert.equal(
        state.document.querySelectorAll("#info-tooltip-overlay").length,
        1,
    );
});

test("reparenting a live owner retains help while body replacement releases it", async (context) => {
    const state = fixture(context);
    state.mouse(state.first, "mouseover");
    state.root.append(state.first);
    await nextTask();
    state.visible();
    const oldPanel = state.overlay();
    const body = state.document.createElement("body");
    state.document.body.replaceWith(body);
    await nextTask();
    assert.equal(oldPanel.hidden, true);
    assert.equal(state.first.getAttribute("aria-describedby"), null);
    body.innerHTML = renderInfoTooltip(
        "Replacement explanation",
        "Replacement help",
    );
    const next = body.querySelector("button");
    next.focus();
    state.visible(next, "Replacement explanation");
    assert.notEqual(state.overlay(), oldPanel);
});

test("repeated rendering keeps one panel and preserves the current interaction", async (context) => {
    const state = fixture(context);
    state.first.focus();
    const panel = state.overlay();
    const ids = new Set();
    for (let index = 0; index < 20; index += 1) {
        const button = state.render(
            `Explanation ${index}`,
            `Help ${index}`,
            "stable",
        );
        ids.add(button.dataset.infoTooltipId);
    }
    await nextTask();
    state.visible();
    assert.equal(ids.size, 20);
    assert.equal(state.overlay(), panel);
    assert.equal(
        state.document.querySelectorAll("#info-tooltip-overlay").length,
        1,
    );
    state.second.focus();
    state.visible(state.second, "Second explanation");
});

test("pagehide releases pointer state and later interaction can reopen", async (context) => {
    const state = fixture(context);
    state.mouse(state.first, "mouseover");
    state.window.dispatchEvent(
        new state.window.PageTransitionEvent("pagehide", { persisted: true }),
    );
    await nextTask();
    state.hidden();
    state.window.dispatchEvent(
        new state.window.PageTransitionEvent("pageshow", { persisted: true }),
    );
    state.hidden();
    state.mouse(state.second, "mouseover");
    state.visible(state.second, "Second explanation");
});

test("a new document releases old listeners, observations and overlay ownership", async (context) => {
    const state = fixture(context);
    state.first.focus();
    const oldPanel = state.overlay();
    const nextDom = new JSDOM("<!doctype html><body></body>", {
        url: "https://cognis.test/next",
    });
    const names = [
        "window",
        "document",
        "Element",
        "HTMLElement",
        "HTMLButtonElement",
    ];
    const previous = new Map(names.map((name) => [name, globalThis[name]]));
    try {
        for (const name of names) globalThis[name] = nextDom.window[name];
        const nextDocument = nextDom.window.document;
        nextDocument.body.innerHTML = renderInfoTooltip(
            "New document explanation",
            "New help",
        );
        assert.equal(oldPanel.hidden, true);
        assert.equal(state.first.getAttribute("aria-describedby"), null);
        const nextButton = nextDocument.querySelector("button");
        nextButton.focus();
        const nextPanel = nextDocument.querySelector("#info-tooltip-overlay");
        state.first.dispatchEvent(
            new state.window.MouseEvent("mouseover", { bubbles: true }),
        );
        state.window.dispatchEvent(new state.window.Event("resize"));
        state.root.replaceChildren();
        await nextTask();
        assert.equal(nextPanel.hidden, false);
        assert.equal(nextPanel.textContent, "New document explanation");
        assert.equal(oldPanel.hidden, true);
    } finally {
        nextDom.window.close();
        for (const [name, value] of previous) globalThis[name] = value;
    }
});

test("scroll and resize keep their dismissal behavior until interaction restarts", async (context) => {
    const state = fixture(context);
    for (const eventType of ["scroll", "resize"]) {
        state.first.focus();
        state.visible();
        const target = eventType === "scroll" ? state.root : state.window;
        target.dispatchEvent(new state.window.Event(eventType));
        await nextTask();
        state.hidden();
        assert.equal(state.document.activeElement, state.first);
        state.outside.focus();
    }
});

test("reparenting a focused owner does not retain focus that the DOM released", async (context) => {
    const state = fixture(context);
    state.first.focus();
    state.root.append(state.first);
    assert.equal(state.document.activeElement, state.document.body);
    await nextTask();
    state.hidden();
});

test("rendering before a body exists initializes help when its markup is mounted", (context) => {
    const state = fixture(context);
    state.document.body.remove();
    const markup = renderInfoTooltip("Early explanation", "Early help");
    const body = state.document.createElement("body");
    body.innerHTML = markup;
    state.document.documentElement.append(body);
    const button = body.querySelector("button");
    button.focus();
    state.visible(button, "Early explanation");
});

test("focused help stays dismissed across pagehide and restored-page mutations", async (context) => {
    const state = fixture(context);
    state.first.focus();
    state.window.dispatchEvent(
        new state.window.PageTransitionEvent("pagehide", { persisted: true }),
    );
    await nextTask();
    state.hidden();
    assert.equal(state.document.activeElement, state.first);
    state.window.dispatchEvent(
        new state.window.PageTransitionEvent("pageshow", { persisted: true }),
    );
    state.root.append(state.document.createElement("div"));
    await nextTask();
    state.hidden();
    state.outside.focus();
    state.first.focus();
    state.visible();
    state.first.remove();
    await nextTask();
    state.hidden();
});

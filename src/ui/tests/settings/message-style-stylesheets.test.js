import assert from "node:assert/strict";
import test from "node:test";
import { settingsFixture, settle } from "../fixtures/message-style.js";

const links = (fixture) => [
    ...fixture.dom.window.document.head.querySelectorAll(
        'link[rel="stylesheet"]',
    ),
];
const ready = async (fixture) => {
    links(fixture).forEach((link) =>
        link.dispatchEvent(new fixture.dom.window.Event("load")),
    );
    await settle();
};

test("style switches share one real stylesheet lease until provider removal or page replacement", async (context) => {
    const fixture = await settingsFixture(context, { realStyles: true });
    await ready(fixture);
    assert.equal(links(fixture).length, 1);
    const initial = fixture.state.styleSignals[0];
    for (let i = 0; i < 30; i++) {
        fixture.root
            .querySelector(
                `[data-message-style-value="${i % 2 ? "irc" : "speech_bubbles"}"]`,
            )
            .click();
        await settle();
    }
    assert.equal(fixture.state.stylesheets.length, 1);
    assert.equal(initial.aborted, false);
    fixture.state.remove();
    await settle();
    assert.equal(initial.aborted, true);
    assert.equal(links(fixture).length, 0);
    fixture.state.install();
    await ready(fixture);
    assert.equal(links(fixture).length, 1);
    assert.equal(
        fixture.root.querySelector("[data-message-style-preview]").dataset
            .messageStyle,
        "irc",
    );
    const replacement = fixture.state.styleSignals.at(-1);
    fixture.state.redraw();
    await ready(fixture);
    assert.equal(replacement.aborted, true);
    assert.equal(links(fixture).length, 1);
    fixture.controller.abort();
    await settle();
    assert.equal(links(fixture).length, 0);
    assert.ok(fixture.state.styleSignals.every((signal) => signal.aborted));
});

test("provider removal cancels pending styles and late load cannot revive the preview", async (context) => {
    const fixture = await settingsFixture(context, { realStyles: true });
    const pending = links(fixture)[0];
    assert.ok(pending);
    fixture.state.remove();
    await settle();
    assert.equal(links(fixture).length, 0);
    pending.dispatchEvent(new fixture.dom.window.Event("load"));
    await settle();
    assert.equal(fixture.state.renders.length, 0);
    assert.equal(
        fixture.root.querySelector("[data-message-style-preview]").hidden,
        true,
    );
    fixture.state.install();
    await ready(fixture);
    assert.equal(fixture.state.renders.length, 1);
    assert.equal(
        fixture.root.querySelector("[data-message-style-preview]").hidden,
        false,
    );
    assert.deepEqual(fixture.state.errors, []);
});

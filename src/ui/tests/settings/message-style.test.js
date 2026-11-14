import assert from "node:assert/strict";
import test from "node:test";
import { settingsFixture, settle } from "../fixtures/message-style.js";

const preview = (fixture) =>
    fixture.root.querySelector("[data-message-style-preview]");
const choose = (fixture, style) =>
    fixture.root.querySelector(`[data-message-style-value="${style}"]`).click();

test("Settings previews every unsaved style and preserves discard and save", async (context) => {
    const fixture = await settingsFixture(context);
    await settle();
    const region = preview(fixture);
    for (const style of ["default", "speech_bubbles", "irc"]) {
        choose(fixture, style);
        await settle();
        assert.equal(preview(fixture), region);
        assert.equal(region.hidden, false);
        assert.equal(region.dataset.messageStyle, style);
        assert.equal(
            fixture.root
                .querySelector(".message-style-btn.active")
                .getAttribute("aria-pressed"),
            "true",
        );
        assert.equal(fixture.state.writes.length, 0);
        assert.equal(fixture.dom.window.localStorage.length, 0);
        assert.equal(
            fixture.dom.window.document.documentElement.dataset.messageStyle,
            undefined,
        );
    }
    fixture.state.discard();
    await settle();
    assert.equal(region.dataset.messageStyle, "default");
    choose(fixture, "speech_bubbles");
    await fixture.state.save();
    assert.equal(fixture.state.writes.length, 1);
    assert.equal(fixture.state.writes[0].messageStyle, "speech_bubbles");
    choose(fixture, "irc");
    fixture.state.discard();
    await settle();
    assert.equal(region.dataset.messageStyle, "speech_bubbles");
    const record = fixture.state.renders.at(-1).records;
    assert.equal(record.length, 3);
    assert.notEqual(record[0].senderId, record[1].senderId);
    assert.equal(fixture.state.errors.length, 0);
});

test("Settings redraw preserves unsaved choice and replaces listeners", async (context) => {
    const fixture = await settingsFixture(context);
    choose(fixture, "irc");
    fixture.state.redraw();
    await settle();
    assert.equal(preview(fixture).dataset.messageStyle, "irc");
    const before = fixture.state.renders.length;
    choose(fixture, "speech_bubbles");
    await settle();
    assert.equal(fixture.state.renders.length, before + 1);
    await fixture.state.mount();
    await settle();
    assert.equal(preview(fixture).dataset.messageStyle, "default");
    assert.equal(fixture.state.writes.length, 0);
});

test("optional, late, removed and unsupported providers leave Settings usable", async (context) => {
    const fixture = await settingsFixture(context, { provider: false });
    choose(fixture, "irc");
    await settle();
    assert.equal(preview(fixture).hidden, true);
    fixture.state.install();
    await settle();
    assert.equal(preview(fixture).dataset.messageStyle, "irc");
    fixture.state.remove();
    await settle();
    assert.equal(preview(fixture).hidden, true);
    assert.equal(
        preview(fixture).querySelector("[data-message-preview-thread]")
            .childNodes.length,
        0,
    );
    fixture.state.install();
    fixture.state.provider.version = 2;
    choose(fixture, "default");
    await settle();
    assert.equal(preview(fixture).hidden, true);
    await fixture.state.save();
    assert.equal(fixture.state.writes[0].messageStyle, "default");
});

test("late renders cannot overwrite newer styles, replacement mounts or navigation", async (context) => {
    const fixture = await settingsFixture(context);
    await settle();
    const pending = [];
    fixture.state.provider.render = (input) =>
        new Promise((resolve) => pending.push({ input, resolve }));
    choose(fixture, "speech_bubbles");
    await settle();
    choose(fixture, "irc");
    await settle();
    pending[1].resolve("newest");
    await settle();
    pending[0].resolve("obsolete");
    await settle();
    assert.equal(preview(fixture).textContent.includes("obsolete"), false);
    choose(fixture, "default");
    await settle();
    fixture.controller.abort();
    fixture.root.innerHTML = "<p>destination</p>";
    pending[2].resolve("late navigation result");
    await settle();
    assert.equal(fixture.root.textContent, "destination");
});

test("malformed version one provider lifetimes fail closed without affecting Settings", async (context) => {
    const fixture = await settingsFixture(context);
    await settle();
    const renderCount = fixture.state.renders.length;
    const styleCount = fixture.state.stylesheets.length;
    for (const signal of [
        undefined,
        null,
        {},
        { aborted: false },
        { aborted: "false", addEventListener() {}, removeEventListener() {} },
    ]) {
        fixture.state.provider.signal = signal;
        choose(fixture, "irc");
        await settle();
        assert.equal(preview(fixture).hidden, true);
        assert.equal(fixture.state.renders.length, renderCount);
        assert.equal(fixture.state.stylesheets.length, styleCount);
        assert.equal(
            fixture.root.querySelector(".message-style-btn.active").dataset
                .messageStyleValue,
            "irc",
        );
    }
    await fixture.state.save();
    assert.equal(fixture.state.writes[0].messageStyle, "irc");
    assert.deepEqual(fixture.state.errors, []);
});

test("missing translations from the presentation provider remain explicit failures", async (context) => {
    const fixture = await settingsFixture(context);
    await settle();
    const failure = Object.assign(new Error("missing_translation"), {
        code: "missing_translation",
        key: "sample.required",
    });
    fixture.state.provider.render = async () => {
        throw failure;
    };
    await assert.rejects(
        fixture.state.messagePrefs.bind(),
        (error) => error === failure,
    );
    assert.equal(preview(fixture).hidden, true);
    assert.equal(fixture.state.errors.length, 1);
    assert.equal(fixture.state.writes.length, 0);
});

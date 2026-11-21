import test from "node:test";
import assert from "node:assert/strict";
import { composerFixture, settle } from "./fixtures/save-runtime.js";

async function setup(context, options = {}) {
    const fixture = await composerFixture({
        mode: "400",
        realToast: true,
        manualFrames: true,
        ...options,
    });
    context.after(() => fixture.dispose());
    context.after(() => assert.deepEqual(fixture.errors, []));
    fixture.flushFrames();
    fixture.edit();
    fixture.hide("fixture-a");
    return fixture;
}

async function rejectSave(fixture) {
    fixture.done();
    await settle();
    const toast = [...fixture.document.querySelectorAll(".toast")].at(-1);
    assert.ok(toast);
    assert.ok(
        toast.textContent.includes(
            fixture.i18n.t("ui.reuse.layout_save_rejected"),
        ),
    );
    return toast;
}

function showFeedback(fixture) {
    const stylesheet = fixture.document.querySelector(
        'link[href="/static/styles/reuse/toast.css"]',
    );
    assert.ok(stylesheet);
    stylesheet.dispatchEvent(new fixture.window.Event("load"));
    fixture.flushFrames();
}

function assertRetired(fixture, toast) {
    showFeedback(fixture);
    assert.equal(toast.classList.contains("toast--visible"), false);
    assert.equal(toast.classList.contains("toast--hiding"), true);
    toast.dispatchEvent(new fixture.window.Event("transitionend"));
    assert.equal(toast.isConnected, false);
}

for (const nested of [false, true]) {
    for (const visible of [false, true]) {
        for (const ending of ["teardown", "discard", "retry-success"]) {
            test(`${nested ? "nested" : "main"} ${ending} retires ${visible ? "visible" : "queued"} recovery feedback`, async (context) => {
                const fixture = await setup(context, { nested });
                const toast = await rejectSave(fixture);
                if (visible) showFeedback(fixture);
                assert.equal(
                    toast.classList.contains("toast--visible"),
                    visible,
                );
                if (ending === "teardown") fixture.abort();
                if (ending === "discard")
                    fixture.document
                        .querySelector(".composer-discard-btn")
                        .click();
                if (ending === "retry-success") {
                    fixture.setMode("success");
                    fixture.done();
                    await settle();
                    assert.equal(fixture.snapshot().editorPresent, false);
                }
                assertRetired(fixture, toast);
            });
        }
    }
}

for (const visible of [false, true]) {
    test(`switching nested views retires ${visible ? "visible" : "queued"} guidance without replay on return`, async (context) => {
        const fixture = await setup(context, {
            nested: true,
            navigation: true,
        });
        const toast = await rejectSave(fixture);
        if (visible) showFeedback(fixture);
        fixture.root
            .querySelector('[data-composer-scroll="other-section"]')
            .click();
        await settle();
        assertRetired(fixture, toast);
        fixture.root
            .querySelector('[data-composer-scroll="fixture-section"]')
            .click();
        await settle();
        fixture.flushFrames();
        assert.equal(fixture.document.querySelector(".toast"), null);
        assert.equal(fixture.snapshot().editorPresent, true);
        assert.equal(fixture.snapshot().leaveProtected, true);
    });
}

test("inactive failure defers actual feedback until return and retires it when discarded", async (context) => {
    const fixture = await setup(context, {
        nested: true,
        navigation: true,
        mode: "deferred",
    });
    fixture.done();
    await settle();
    fixture.root
        .querySelector('[data-composer-scroll="other-section"]')
        .click();
    await settle();
    fixture.complete(0, 400);
    await settle();
    fixture.flushFrames();
    assert.equal(fixture.document.querySelector(".toast"), null);
    fixture.root
        .querySelector('[data-composer-scroll="fixture-section"]')
        .click();
    await settle();
    const toast = fixture.document.querySelector(".toast");
    assert.ok(
        toast.textContent.includes(
            fixture.i18n.t("ui.reuse.layout_save_rejected"),
        ),
    );
    showFeedback(fixture);
    assert.equal(toast.classList.contains("toast--visible"), true);
    fixture.document.querySelector(".composer-discard-btn").click();
    assertRetired(fixture, toast);
});

test("a failed retry replaces only its own feedback and preserves unrelated Toasts", async (context) => {
    const fixture = await setup(context);
    const prior = await rejectSave(fixture);
    const { showToast } = await fixture.importModule("src/ui/reuse/toast.js");
    showToast("Synthetic unrelated feedback", { permanent: true });
    const unrelated = [...fixture.document.querySelectorAll(".toast")].at(-1);
    const current = await rejectSave(fixture);
    assert.notEqual(prior, current);
    assertRetired(fixture, prior);
    assert.equal(current.classList.contains("toast--visible"), true);
    assert.equal(unrelated.classList.contains("toast--visible"), true);
    fixture.document.querySelector(".composer-discard-btn").click();
    assertRetired(fixture, current);
    assert.equal(unrelated.isConnected, true);
    assert.equal(unrelated.classList.contains("toast--visible"), true);
});

test("full refresh ending main editing retires the previous draft guidance", async (context) => {
    const fixture = await setup(context);
    const toast = await rejectSave(fixture);
    fixture.composer.refresh();
    assert.equal(fixture.snapshot().editorPresent, false);
    assert.equal(fixture.snapshot().leaveProtected, false);
    assertRetired(fixture, toast);
});

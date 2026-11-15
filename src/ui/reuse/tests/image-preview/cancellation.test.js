import test from "node:test";
import assert from "node:assert/strict";
import { uiCtx } from "../../ui-ctx.js";
import { imageFixture, deferred } from "./dom-fixture.js";

async function setup(context, { holdLocale = false, ...options } = {}) {
    const readiness = deferred();
    const fixture = await imageFixture(context, {
        ...options,
        ...(holdLocale ? { locale: () => readiness.promise } : {}),
    });
    const release = fixture.release;
    return {
        ...fixture,
        release: async () => {
            readiness.resolve(fixture.translations);
            await release();
        },
    };
}

test("caller abort during cold popup preparation settles before the resource", async (context) => {
    const fixture = await setup(context, { cold: true });
    const state = fixture.start();
    await fixture.settle();
    assert.ok(
        fixture.document.querySelector('link[href="/static/styles/popup.css"]'),
    );
    fixture.controller.abort();
    await fixture.settle();
    const observed = state.settled;
    await fixture.release();
    await state.result;
    assert.equal(state.error.name, "AbortError");
    assert.equal(fixture.active().length, 0);
    assert.equal(
        observed,
        true,
        "canceled public action must settle without stylesheet completion",
    );
});

test("provider removal during cold popup preparation settles its former public action", async (context) => {
    const fixture = await setup(context, { cold: true });
    const state = fixture.start();
    await fixture.settle();
    await fixture.lifecycle.reconcile([]);
    assert.equal(uiCtx.capabilities.get("ui:imagePreview"), undefined);
    await fixture.settle();
    const observed = state.settled;
    await fixture.release();
    await state.result;
    assert.equal(state.error.name, "AbortError");
    assert.equal(
        observed,
        true,
        "provider disposal must release pending public action",
    );
});

test("caller abort during image locale initialization settles before locale completion", async (context) => {
    const fixture = await setup(context, { holdLocale: true });
    const state = fixture.start();
    await fixture.settle();
    fixture.controller.abort();
    await fixture.settle();
    const observed = state.settled;
    await fixture.release();
    await state.result;
    assert.equal(state.error.name, "AbortError");
    assert.equal(fixture.active().length, 0);
    assert.equal(
        observed,
        true,
        "canceled public action must settle without locale completion",
    );
});

test("control: healthy preview opens and deliberate Close resolves", async (context) => {
    const fixture = await setup(context);
    const state = fixture.start();
    await fixture.settle();
    assert.equal(fixture.active().length, 1);
    assert.equal(
        fixture.active()[0].getAttribute("aria-label"),
        "Image Preview",
    );
    fixture.active()[0].querySelector('[data-popup-action="close"]').click();
    await fixture.release();
    await state.result;
    assert.equal(state.error, undefined);
    assert.equal(fixture.active().length, 0);
});

test("control: caller abort after open removes the modal and rejects with AbortError", async (context) => {
    const fixture = await setup(context);
    const state = fixture.start();
    await fixture.settle();
    assert.equal(fixture.active().length, 1);
    fixture.controller.abort();
    await fixture.release();
    await state.result;
    assert.equal(state.error.name, "AbortError");
    assert.equal(fixture.active().length, 0);
    assert.equal(fixture.document.body.style.overflow, "");
});

test("control: pre-aborted caller never acquires modal preparation", async (context) => {
    const fixture = await setup(context, { cold: true });
    fixture.controller.abort();
    const state = fixture.start();
    await state.result;
    assert.equal(state.error.name, "AbortError");
    assert.equal(
        fixture.document.querySelector('link[href="/static/styles/popup.css"]'),
        null,
    );
});

test("canceled preview cannot report a later popup stylesheet failure", async (context) => {
    const fixture = await setup(context, { cold: true });
    const state = fixture.start();
    await fixture.settle();
    fixture.controller.abort();
    await fixture.settle();
    fixture.document
        .querySelector('link[href="/static/styles/popup.css"]')
        .dispatchEvent(new fixture.window.Event("error"));
    await fixture.settle();
    await state.result;
    assert.equal(fixture.active().length, 0);
    assert.equal(
        fixture.notices.length,
        0,
        "retired image action must not publish late resource failure feedback",
    );
});

test("control: visible provider-owned viewer is dismissed when provider is removed", async (context) => {
    const fixture = await setup(context);
    const result = fixture.capability.open({
        src: "https://fixture.invalid/synthetic.svg",
        alt: "Synthetic",
    });
    const rejected = assert.rejects(result, { name: "AbortError" });
    await fixture.settle();
    assert.equal(fixture.active().length, 1);
    await fixture.lifecycle.reconcile([]);
    await fixture.release();
    await rejected;
    assert.equal(fixture.active().length, 0);
});

test("control: retained caller lifetime preserves snapshot after thumbnail replacement", async (context) => {
    const fixture = await setup(context);
    const root = fixture.document.createElement("section");
    root.innerHTML = fixture.provider.renderImagePreview({
        src: "https://fixture.invalid/synthetic.svg",
        alt: "Synthetic",
    });
    fixture.document.body.append(root);
    fixture.provider.bindImagePreviews(root, {
        signal: fixture.controller.signal,
    });
    root.querySelector("button").click();
    await fixture.settle();
    assert.equal(fixture.active().length, 1);
    root.innerHTML = fixture.provider.renderImagePreview({
        src: "https://fixture.invalid/new.svg",
        alt: "New",
    });
    await fixture.settle();
    assert.equal(fixture.active().length, 1);
    assert.equal(fixture.active()[0].querySelector("img").alt, "Synthetic");
    fixture.controller.abort();
    await fixture.release();
    assert.equal(fixture.active().length, 0);
});

test("control: viewer with no caller signal survives unrelated route notification", async (context) => {
    const fixture = await setup(context);
    const result = fixture.capability.open({
        src: "https://fixture.invalid/synthetic.svg",
        alt: "Synthetic",
    });
    await fixture.settle();
    fixture.window.dispatchEvent(
        new fixture.window.Event("cognis:route-will-change"),
    );
    await fixture.settle();
    assert.equal(fixture.active().length, 1);
    fixture.active()[0].querySelector('[data-popup-action="close"]').click();
    await fixture.release();
    await result;
});

test("control: canceling image caller does not cancel a healthy shared popup waiter", async (context) => {
    const fixture = await setup(context, { cold: true });
    const state = fixture.start();
    const peer = await fixture.open();
    fixture.controller.abort();
    await fixture.release();
    await state.result;
    assert.equal(state.error.name, "AbortError");
    assert.equal(fixture.active().length, 1);
    assert.ok(fixture.active()[0].querySelector("input"));
    fixture.active()[0].querySelector('[data-popup-action="close"]').click();
    await fixture.release();
    await peer.result;
});

import test from "node:test";
import assert from "node:assert/strict";
import { imageFixture, deferred, observe } from "./dom-fixture.js";

for (const reason of ["caller", "provider"]) {
    test(`${reason} abort during owner locale readiness settles before late rejection`, async (context) => {
        const readiness = deferred();
        const fixture = await imageFixture(context, {
            locale: () => readiness.promise,
        });
        const state = fixture.start();
        await fixture.settle();
        if (reason === "caller") fixture.controller.abort();
        else await fixture.lifecycle.reconcile([]);
        await fixture.settle();
        assert.equal(state.settled, true);
        assert.equal(state.error.name, "AbortError");
        readiness.reject(new Error("locale_initialization_failed"));
        await fixture.settle();
        assert.equal(fixture.active().length, 0);
        assert.equal(fixture.notices.length, 0);
    });

    test(`${reason} abort while bound error localization waits suppresses stale feedback`, async (context) => {
        const readiness = deferred();
        const fixture = await imageFixture(context, {
            locale: () => readiness.promise,
        });
        const binding = fixture.bind();
        fixture.uiCtx.extendFlow(
            "ui:imagePreview:open",
            "execute",
            { id: "test:fail-image-action", order: -100 },
            () => {
                throw new Error("preview_failed");
            },
        );
        const activation = observe(binding.activate());
        await fixture.settle();
        assert.equal(
            fixture.localeCalls(),
            1,
            "failure localization must already be waiting",
        );
        if (reason === "caller") fixture.controller.abort();
        else {
            await fixture.lifecycle.reconcile([]);
            await fixture.enable();
        }
        readiness.resolve(fixture.translations);
        await activation.result;
        assert.equal(activation.error, undefined);
        assert.equal(fixture.notices.length, 0);
    });
}

test("owner locale failure propagates while healthy and a later open can recover", async (context) => {
    const readiness = deferred();
    const fixture = await imageFixture(context, {
        locale: (translations, count) =>
            count === 1 ? readiness.promise : Promise.resolve(translations),
    });
    const first = fixture.start();
    await fixture.settle();
    readiness.reject(new Error("locale_initialization_failed"));
    await first.result;
    assert.match(first.error.message, /locale_initialization_failed/);
    const next = fixture.start();
    await fixture.settle();
    assert.equal(fixture.active().length, 1);
    fixture.active()[0].querySelector('[data-popup-action="close"]').click();
    await fixture.release();
    await next.result;
    assert.equal(next.error, undefined);
});

test("bound failure shows localized feedback and permits repeated successful activation", async (context) => {
    const fixture = await imageFixture(context);
    const binding = fixture.bind();
    let fail = true;
    fixture.uiCtx.extendFlow(
        "ui:imagePreview:open",
        "execute",
        { id: "test:fail-once", order: -100 },
        () => {
            if (fail) throw new Error("preview_failed");
        },
    );
    await binding.activate();
    assert.equal(fixture.notices.length, 1);
    assert.equal(fixture.notices[0][0], "Preview Failed");
    assert.equal(fixture.notices[0][1].variant, "error");
    fail = false;
    for (let attempt = 0; attempt < 2; attempt++) {
        const activation = binding.activate();
        await fixture.settle();
        await binding.activate();
        assert.equal(
            fixture.active().length,
            1,
            "reentrant click must not duplicate the viewer",
        );
        fixture
            .active()[0]
            .querySelector('[data-popup-action="close"]')
            .click();
        await fixture.release();
        await activation;
        assert.equal(
            fixture.document.activeElement,
            binding.root.querySelector("button"),
        );
    }
    assert.equal(fixture.notices.length, 1);
});

test("missing healthy error translation remains an explicit failure", async (context) => {
    const fixture = await imageFixture(context, {
        labels: { "ui.reuse.image_preview_failed": "" },
    });
    const binding = fixture.bind();
    fixture.uiCtx.extendFlow(
        "ui:imagePreview:open",
        "execute",
        { id: "test:fail-image", order: -100 },
        () => {
            throw new Error("preview_failed");
        },
    );
    await assert.rejects(
        binding.activate(),
        /missing_translation:ui.reuse.image_preview_failed/,
    );
    assert.equal(fixture.notices.length, 0);
});

test("concurrent owner locale waiters survive canceling one caller", async (context) => {
    const readiness = deferred();
    const fixture = await imageFixture(context, {
        locale: () => readiness.promise,
    });
    const first = fixture.start();
    const other = new fixture.window.AbortController();
    const second = fixture.start({ signal: other.signal, alt: "Second" });
    await fixture.settle();
    fixture.controller.abort();
    await fixture.settle();
    assert.equal(first.settled, true);
    assert.equal(second.settled, false);
    readiness.resolve(fixture.translations);
    await fixture.settle();
    assert.equal(fixture.active().length, 1);
    assert.equal(fixture.active()[0].querySelector("img").alt, "Second");
    fixture.active()[0].querySelector('[data-popup-action="close"]').click();
    await fixture.release();
    await second.result;
    assert.equal(second.error, undefined);
});

test("provider disable and re-enable leaves only the new preparation live", async (context) => {
    const fixture = await imageFixture(context, { cold: true });
    const first = fixture.start();
    await fixture.settle();
    await fixture.lifecycle.reconcile([]);
    await fixture.settle();
    assert.equal(first.settled, true);
    assert.equal(first.error.name, "AbortError");
    await fixture.enable();
    const current = fixture.uiCtx.capabilities.get("ui:imagePreview");
    assert.notEqual(current, fixture.capability);
    const second = fixture.start({ alt: "Replacement" }, current);
    await fixture.release();
    assert.equal(fixture.active().length, 1);
    assert.equal(fixture.active()[0].querySelector("img").alt, "Replacement");
    await assert.rejects(
        fixture.capability.open({ src: "https://fixture.invalid/retired.svg" }),
        { name: "AbortError" },
    );
    assert.equal(fixture.active().length, 1);
    fixture.active()[0].querySelector('[data-popup-action="close"]').click();
    await fixture.release();
    await second.result;
    assert.equal(second.error, undefined);
});

test("canceling an old opening cannot close a newer caller sharing stylesheet preparation", async (context) => {
    const fixture = await imageFixture(context, { cold: true });
    const first = fixture.start();
    await fixture.settle();
    fixture.controller.abort();
    const controller = new fixture.window.AbortController();
    const second = fixture.start({
        signal: controller.signal,
        alt: "New caller",
    });
    await fixture.release();
    await first.result;
    assert.equal(first.error.name, "AbortError");
    assert.equal(fixture.active().length, 1);
    assert.equal(fixture.active()[0].querySelector("img").alt, "New caller");
    controller.abort();
    await fixture.release();
    await second.result;
    assert.equal(second.error.name, "AbortError");
    assert.equal(fixture.active().length, 0);
});

test("completed and canceled openings detach their owned abort listeners", async (context) => {
    const fixture = await imageFixture(context);
    const prototype = fixture.window.AbortSignal.prototype;
    const add = prototype.addEventListener;
    const remove = prototype.removeEventListener;
    const tracked = new Map();
    prototype.addEventListener = function (type, listener, options) {
        if (type === "abort") {
            const listeners = tracked.get(this) ?? new Set();
            listeners.add(listener);
            tracked.set(this, listeners);
        }
        return add.call(this, type, listener, options);
    };
    prototype.removeEventListener = function (type, listener, options) {
        if (type === "abort") tracked.get(this)?.delete(listener);
        return remove.call(this, type, listener, options);
    };
    context.after(() => {
        prototype.addEventListener = add;
        prototype.removeEventListener = remove;
    });
    for (const abort of [false, true]) {
        const controller = new fixture.window.AbortController();
        const state = fixture.start({ signal: controller.signal });
        await fixture.settle();
        assert.ok(
            [...tracked.values()].some((listeners) => listeners.size > 0),
        );
        if (abort) controller.abort();
        else
            fixture
                .active()[0]
                .querySelector('[data-popup-action="close"]')
                .click();
        await fixture.release();
        await state.result;
        assert.equal(
            [...tracked.values()].reduce(
                (sum, listeners) => sum + listeners.size,
                0,
            ),
            0,
        );
    }
});

for (const reason of ["caller", "provider"]) {
    test(`${reason} retirement fences a late bound-feedback locale rejection`, async (context) => {
        const readiness = deferred();
        const fixture = await imageFixture(context, {
            locale: () => readiness.promise,
        });
        const binding = fixture.bind();
        fixture.uiCtx.extendFlow(
            "ui:imagePreview:open",
            "execute",
            { id: "test:fail-for-feedback", order: -100 },
            () => {
                throw new Error("preview_failed");
            },
        );
        const activation = observe(binding.activate());
        await fixture.settle();
        assert.equal(fixture.localeCalls(), 1);
        if (reason === "caller") fixture.controller.abort();
        else await fixture.lifecycle.reconcile([]);
        readiness.reject(new Error("late_locale_failure"));
        await activation.result;
        assert.equal(
            activation.error,
            undefined,
            "retired event feedback must not reject after its owner ends",
        );
        assert.equal(fixture.notices.length, 0);
    });
}

test("active bound-feedback locale rejection is not suppressed", async (context) => {
    const readiness = deferred();
    const fixture = await imageFixture(context, {
        locale: () => readiness.promise,
    });
    const binding = fixture.bind();
    fixture.uiCtx.extendFlow(
        "ui:imagePreview:open",
        "execute",
        { id: "test:fail-before-feedback", order: -100 },
        () => {
            throw new Error("preview_failed");
        },
    );
    const activation = observe(binding.activate());
    await fixture.settle();
    readiness.reject(
        new Error("missing_translation:ui.reuse.image_preview_failed"),
    );
    await activation.result;
    assert.match(
        activation.error.message,
        /missing_translation:ui.reuse.image_preview_failed/,
    );
    assert.equal(fixture.notices.length, 0);
});

test("aborted binding cannot activate its retained thumbnail again", async (context) => {
    const fixture = await imageFixture(context);
    const binding = fixture.bind();
    fixture.controller.abort();
    binding.root.querySelector("button").click();
    await fixture.settle();
    assert.equal(fixture.localeCalls(), 0);
    assert.equal(fixture.active().length, 0);
    assert.equal(fixture.notices.length, 0);
});

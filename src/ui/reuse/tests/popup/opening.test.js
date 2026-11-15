import assert from "node:assert/strict";
import test from "node:test";
import { popupFixture } from "./dom-fixture.js";

async function rejectOpening(fixture, options = {}) {
    const { openPopup } = await fixture.importModule("popup.js");
    const failure = new Error("Synthetic popup initialization failed");
    await assert.rejects(
        openPopup({
            title: "Synthetic unavailable editor",
            body: '<input aria-label="Synthetic field">',
            onOpen: () => {
                throw failure;
            },
            ...options,
        }),
        (error) => error === failure,
    );
    await fixture.settle();
}

test("a rejected ordinary opening releases its active overlay", async (context) => {
    const fixture = await popupFixture(context);
    await rejectOpening(fixture);
    assert.equal(fixture.active().length, 0);
});

test("a rejected opening restores original page scroll styles", async (context) => {
    const fixture = await popupFixture(context);
    fixture.document.documentElement.style.overflow = "auto";
    fixture.document.body.style.overflow = "scroll";
    await rejectOpening(fixture);
    assert.equal(fixture.document.documentElement.style.overflow, "auto");
    assert.equal(fixture.document.body.style.overflow, "scroll");
});

test("a rejected mandatory opening no longer intercepts background focus", async (context) => {
    const fixture = await popupFixture(context);
    await rejectOpening(fixture, { mandatory: true, actions: [] });
    const next = fixture.document.querySelector("a");
    next.focus();
    assert.equal(fixture.document.activeElement, next);
});

test("a rejected nested opening returns focus authority to the live parent", async (context) => {
    const fixture = await popupFixture(context);
    const parent = await fixture.open();
    const parentInput = parent.overlay.querySelector("input");
    parentInput.focus();
    await rejectOpening(fixture);
    parentInput.focus();
    assert.equal(fixture.document.activeElement, parentInput);
    assert.equal(fixture.active().length, 1);
});

test("a successful later popup cannot resurrect a previously rejected opening", async (context) => {
    const fixture = await popupFixture(context);
    await rejectOpening(fixture);
    const later = await fixture.open();
    await later.dismiss();
    later.overlay.dispatchEvent(new fixture.window.Event("transitionend"));
    assert.equal(fixture.active().length, 0);
    assert.equal(fixture.document.activeElement, fixture.invoker);
});

test("control: body-render failure before acquisition leaves no overlay or scroll lock", async (context) => {
    const fixture = await popupFixture(context);
    const { openPopup } = await fixture.importModule("popup.js");
    await assert.rejects(
        openPopup({
            title: "Synthetic unavailable editor",
            body: () => {
                throw new Error("Synthetic body failure");
            },
        }),
        /Synthetic body failure/,
    );
    assert.equal(fixture.active().length, 0);
    assert.equal(fixture.document.body.style.overflow, "");
    assert.equal(fixture.document.activeElement, fixture.invoker);
});

test("control: successful opening and explicit close return focus and scrolling", async (context) => {
    const fixture = await popupFixture(context);
    let initialized = 0;
    const popup = await fixture.open({
        onOpen: () => {
            initialized++;
        },
    });
    assert.equal(initialized, 1);
    assert.equal(fixture.active().length, 1);
    await popup.dismiss();
    popup.overlay.dispatchEvent(new fixture.window.Event("transitionend"));
    assert.equal(await popup.result, null);
    assert.equal(fixture.active().length, 0);
    assert.equal(fixture.document.body.style.overflow, "");
    assert.equal(fixture.document.activeElement, fixture.invoker);
});

test("control: abort after successful initialization immediately releases ownership", async (context) => {
    const fixture = await popupFixture(context);
    const controller = new fixture.window.AbortController();
    const popup = await fixture.open({ signal: controller.signal });
    controller.abort();
    assert.equal(await popup.result, null);
    assert.equal(fixture.active().length, 0);
    assert.equal(popup.overlay.isConnected, false);
    assert.equal(fixture.document.body.style.overflow, "");
    const next = fixture.document.querySelector("a");
    next.focus();
    assert.equal(fixture.document.activeElement, next);
});

test("failed dirty initialization bypasses cancellation and releases its supplied signal", async (context) => {
    const fixture = await popupFixture(context);
    const { openPopup } = await fixture.importModule("popup.js");
    const controller = new fixture.window.AbortController();
    const failure = new Error("Synthetic dirty initialization failure");
    let stale;
    let actions = 0;
    await assert.rejects(
        openPopup({
            closeProtection: true,
            mandatory: true,
            signal: controller.signal,
            body: '<input value="Initial"><button data-popup-action="save">Save</button>',
            onAction: () => {
                actions++;
            },
            onOpen: (overlay, dismiss, api) => {
                stale = { overlay, dismiss, api };
                overlay.querySelector("input").value = "Edited";
                api.markDirty();
                throw failure;
            },
        }),
        (error) => error === failure,
    );
    assert.equal(stale.overlay.isConnected, false);
    assert.equal(
        fixture.active().length,
        0,
        "failed construction must not open a discard confirmation",
    );
    assert.equal(fixture.document.activeElement, fixture.invoker);
    const newer = await fixture.open();
    const newerInput = newer.overlay.querySelector("input");
    newerInput.focus();
    controller.abort();
    await stale.dismiss();
    stale.overlay.querySelector('[data-popup-action="save"]').click();
    assert.equal(stale.api.updateBody("Stale"), null);
    assert.equal(actions, 0);
    assert.equal(fixture.document.activeElement, newerInput);
    assert.deepEqual(fixture.active(), [newer.overlay]);
});

for (const ending of ["close", "abort"]) {
    test(`reentrant ${ending} before an initialization throw preserves its settled result`, async (context) => {
        const fixture = await popupFixture(context);
        const { openPopup } = await fixture.importModule("popup.js");
        const controller = new fixture.window.AbortController();
        let overlay;
        const result = await openPopup({
            signal: controller.signal,
            onOpen: (element, dismiss) => {
                overlay = element;
                if (ending === "close") void dismiss();
                else controller.abort();
                throw new Error("Synthetic failure after settlement");
            },
        });
        assert.equal(result, null);
        assert.equal(overlay.hasAttribute("data-popup-active"), false);
        overlay.dispatchEvent(new fixture.window.Event("transitionend"));
        assert.equal(overlay.isConnected, false);
        assert.equal(fixture.document.body.style.overflow, "");
        const next = fixture.document.querySelector("a");
        next.focus();
        assert.equal(fixture.document.activeElement, next);
    });
}

test("failed child preserves the live parent and an independent scroll lease", async (context) => {
    const fixture = await popupFixture(context);
    const { lockPageScroll } = await fixture.importModule(
        "page-scroll-lock.js",
    );
    fixture.document.documentElement.style.overflow = "auto";
    fixture.document.body.style.overflow = "scroll";
    const release = lockPageScroll(fixture.document);
    const parent = await fixture.open();
    const input = parent.overlay.querySelector("input");
    input.focus();
    await rejectOpening(fixture);
    assert.equal(fixture.document.activeElement, input);
    assert.deepEqual(fixture.active(), [parent.overlay]);
    assert.equal(fixture.document.body.style.overflow, "hidden");
    await parent.dismiss();
    parent.overlay.dispatchEvent(new fixture.window.Event("transitionend"));
    assert.equal(fixture.document.body.style.overflow, "hidden");
    release();
    assert.equal(fixture.document.body.style.overflow, "scroll");
    assert.equal(fixture.document.documentElement.style.overflow, "auto");
});

test("page switching reinitializes callbacks and retains ordinary dirty protection", async (context) => {
    const fixture = await popupFixture(context);
    const visits = [];
    const popup = await fixture.open({
        closeProtection: true,
        pages: [
            { id: "first", body: '<input value="First">', actions: [] },
            {
                id: "second",
                body: '<input value="Second">',
                actions: [{ id: "done", label: "Done" }],
            },
        ],
        onOpen: (_overlay, _dismiss, api) => visits.push(api.pageId),
    });
    assert.equal(popup.api.setPage("second"), true);
    assert.equal(popup.api.setPage("first"), true);
    assert.deepEqual(visits, ["first", "second", "first"]);
    popup.overlay.querySelector("input").value = "Edited";
    const closing = popup.dismiss();
    await fixture.settle();
    fixture.active().at(-1).querySelector('[data-popup-action="keep"]').click();
    assert.equal(await closing, false);
    assert.equal(fixture.active()[0], popup.overlay);
    const discarded = popup.dismiss();
    await fixture.settle();
    fixture
        .active()
        .at(-1)
        .querySelector('[data-popup-action="discard"]')
        .click();
    assert.equal(await discarded, true);
    assert.equal(await popup.result, null);
});

test("a dirty close requested during failed initialization cannot orphan its pending confirmation", async (context) => {
    const fixture = await popupFixture(context);
    const { openPopup } = await fixture.importModule("popup.js");
    const failure = new Error("Synthetic failure after dirty close request");
    let closing;
    await assert.rejects(
        openPopup({
            closeProtection: true,
            onOpen: (_overlay, dismiss, api) => {
                api.markDirty();
                closing = dismiss();
                throw failure;
            },
        }),
        (error) => error === failure,
    );
    assert.equal(await closing, false);
    await fixture.settle();
    assert.equal(fixture.active().length, 0);
    assert.equal(fixture.document.querySelector(".popup-overlay"), null);
    assert.equal(fixture.document.body.style.overflow, "");
    assert.equal(fixture.document.activeElement, fixture.invoker);
});

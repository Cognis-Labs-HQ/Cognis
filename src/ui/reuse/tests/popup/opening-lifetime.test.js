import assert from "node:assert/strict";
import test from "node:test";
import { popupFixture } from "./dom-fixture.js";
import { tutorialFixture } from "./tutorial-fixture.js";

function trackListeners(target) {
    const listeners = new Map();
    const add = target.addEventListener.bind(target);
    const remove = target.removeEventListener.bind(target);
    target.addEventListener = (name, listener, options) => {
        const entries = listeners.get(name) ?? new Set();
        entries.add(listener);
        listeners.set(name, entries);
        return add(name, listener, options);
    };
    target.removeEventListener = (name, listener, options) => {
        listeners.get(name)?.delete(listener);
        return remove(name, listener, options);
    };
    return (name) => listeners.get(name)?.size ?? 0;
}

test("failure after tracker and timeout acquisition clears listeners, timers and late font work", async (context) => {
    const failure = new Error("Synthetic animation scheduler failure");
    const timers = new Map();
    const fixture = await popupFixture(context, undefined, new Map(), {
        clock: {
            setTimeout: (callback) => {
                const handle = {};
                timers.set(handle, callback);
                return handle;
            },
            clearTimeout: (handle) => timers.delete(handle),
            requestAnimationFrame: () => {
                throw failure;
            },
        },
    });
    const windowListeners = trackListeners(fixture.window);
    const documentListeners = trackListeners(fixture.document);
    let fontsReady;
    fixture.document.fonts = {
        ready: new Promise((resolve) => {
            fontsReady = resolve;
        }),
    };
    const { openPopup } = await fixture.importModule("popup.js");
    let overlay;
    let fieldListeners;
    await assert.rejects(
        openPopup({
            closeProtection: true,
            timeoutMs: 1000,
            body: '<input value="Initial">',
            onOpen: (element) => {
                overlay = element;
                fieldListeners = trackListeners(element.querySelector("input"));
            },
        }),
        (error) => error === failure,
    );
    assert.equal(overlay.isConnected, false);
    assert.equal(timers.size, 0);
    for (const name of [
        "resize",
        "beforeunload",
        "cognis:route-before-navigate",
    ]) {
        assert.equal(windowListeners(name), 0, name);
    }
    for (const name of ["keydown", "focusin"])
        assert.equal(documentListeners(name), 0, name);
    assert.equal(fieldListeners("input"), 0);
    assert.equal(fieldListeners("change"), 0);
    overlay.querySelector = () => {
        throw new Error("Stale font callback touched a removed popup");
    };
    fontsReady();
    await fixture.settle();
    fixture.window.dispatchEvent(new fixture.window.Event("resize"));
    const navigation = new fixture.window.Event(
        "cognis:route-before-navigate",
        { cancelable: true },
    );
    fixture.window.dispatchEvent(navigation);
    assert.equal(navigation.defaultPrevented, false);
    assert.equal(fixture.document.body.style.overflow, "");
});

test("page initialization during onOpen releases the acquired dirty tracker on failure", async (context) => {
    const fixture = await popupFixture(context);
    const listeners = trackListeners(fixture.window);
    const { openPopup } = await fixture.importModule("popup.js");
    const failure = new Error("Synthetic second page initialization failure");
    const visits = [];
    await assert.rejects(
        openPopup({
            closeProtection: true,
            pages: [
                { id: "first", body: '<input value="First">' },
                { id: "second", body: '<input value="Second">' },
            ],
            onOpen: (overlay, dismiss, api) => {
                visits.push(api.pageId);
                if (api.pageId === "first") api.setPage("second");
                else {
                    overlay.querySelector("input").value = "Edited";
                    api.markDirty();
                    throw failure;
                }
            },
        }),
        (error) => error === failure,
    );
    assert.deepEqual(visits, ["first", "second"]);
    assert.equal(fixture.active().length, 0);
    assert.equal(listeners("beforeunload"), 0);
    assert.equal(listeners("cognis:route-before-navigate"), 0);
});

test("rollback revokes delegated focus once and preserves a newer opening started during revocation", async (context) => {
    const fixture = await popupFixture(context);
    const parent = await fixture.open();
    const { openPopup } = await fixture.importModule("popup.js");
    const controller = new fixture.window.AbortController();
    const surface = fixture.document.createElement("button");
    fixture.document.body.append(surface);
    let newer;
    let newerResult;
    let release;
    let revoked = 0;
    const failure = new Error("Synthetic delegated initializer failure");
    await assert.rejects(
        openPopup({
            body: "<input>",
            onOpen: (overlay) => {
                release = fixture.capabilities
                    .get("ui:popupFocus")
                    .delegate(overlay, {
                        signal: controller.signal,
                        surfaces: [surface],
                        contains: (element) => element === surface,
                        focus: () => surface.focus(),
                        onRevoke: () => {
                            revoked++;
                            surface.remove();
                            newerResult = openPopup({
                                body: "<input>",
                                onOpen: (element, dismiss) => {
                                    newer = { overlay: element, dismiss };
                                },
                            });
                        },
                    });
                surface.focus();
                throw failure;
            },
        }),
        (error) => error === failure,
    );
    await fixture.settle();
    assert.equal(revoked, 1);
    assert.deepEqual(fixture.active(), [parent.overlay, newer.overlay]);
    assert.ok(newer.overlay.contains(fixture.document.activeElement));
    controller.abort();
    release();
    assert.equal(revoked, 1);
    assert.ok(newer.overlay.contains(fixture.document.activeElement));
    await newer.dismiss();
    assert.equal(await newerResult, null);
    newer.overlay.dispatchEvent(new fixture.window.Event("transitionend"));
    assert.deepEqual(fixture.active(), [parent.overlay]);
    assert.ok(parent.overlay.contains(fixture.document.activeElement));
    assert.equal(fixture.document.body.style.overflow, "hidden");
    await parent.dismiss();
    parent.overlay.dispatchEvent(new fixture.window.Event("transitionend"));
    assert.equal(fixture.document.body.style.overflow, "");
});

for (const phase of ["acquired", "released"]) {
    test(`focus ${phase} logging failure cannot replace the opening error or retain the page`, async (context) => {
        const failure = new Error("Synthetic original failure");
        const fixture = await popupFixture(context, undefined, new Map(), {
            console: {
                info: (message) => {
                    if (message.includes(phase))
                        throw phase === "acquired"
                            ? failure
                            : new Error("Synthetic release log failure");
                },
                error: () => {
                    throw new Error("Synthetic failure log unavailable");
                },
            },
        });
        const { openPopup } = await fixture.importModule("popup.js");
        await assert.rejects(
            openPopup({
                onOpen: () => {
                    throw failure;
                },
            }),
            (error) => error === failure,
        );
        assert.equal(fixture.active().length, 0);
        assert.equal(fixture.document.body.style.overflow, "");
        const background = fixture.document.querySelector("a");
        background.focus();
        assert.equal(fixture.document.activeElement, background);
    });
}

test("a failed child returns to the accepted parent tutorial without changing its target or actions", async (context) => {
    const fixture = await tutorialFixture(context);
    const parent = await fixture.open();
    const guide = await fixture.guide(parent);
    const { openPopup } = await fixture.importModule("popup.js");
    const failure = new Error("Synthetic child initializer failure");
    await assert.rejects(
        openPopup({
            onOpen: () => {
                throw failure;
            },
        }),
        (error) => error === failure,
    );
    assert.deepEqual(fixture.active(), [parent.overlay]);
    assert.equal(guide.menu.isConnected, true);
    const next = guide.menu.querySelector('[data-action="next"]');
    next.focus();
    assert.equal(fixture.document.activeElement, next);
    next.click();
    assert.equal(guide.actions.at(-1), "next");
    guide.view.dispose();
    const replay = await fixture.guide(parent, { index: 1 });
    replay.menu.querySelector('[data-action="restart"]').click();
    assert.equal(replay.actions.at(-1), "restart");
    replay.view.dispose();
    await parent.dismiss();
    assert.equal(fixture.document.activeElement, fixture.invoker);
});

test("successful opening and closing keep their existing animation and scroll lease timing", async (context) => {
    const frames = [];
    const fixture = await popupFixture(context, undefined, new Map(), {
        clock: { requestAnimationFrame: (callback) => frames.push(callback) },
    });
    const popup = await fixture.open();
    assert.equal(
        popup.overlay.classList.contains("popup-overlay--visible"),
        false,
    );
    assert.equal(frames.length, 1);
    frames.shift()();
    assert.equal(
        popup.overlay.classList.contains("popup-overlay--visible"),
        true,
    );
    await popup.dismiss();
    assert.equal(await popup.result, null);
    assert.equal(
        popup.overlay.classList.contains("popup-overlay--visible"),
        false,
    );
    assert.equal(popup.overlay.inert, true);
    assert.equal(popup.overlay.isConnected, true);
    assert.equal(fixture.document.body.style.overflow, "hidden");
    popup.overlay.dispatchEvent(new fixture.window.Event("transitionend"));
    assert.equal(popup.overlay.isConnected, false);
    assert.equal(fixture.document.body.style.overflow, "");
});

test("later page callback failure remains synchronous without disposing the established popup", async (context) => {
    const fixture = await popupFixture(context);
    const failure = new Error("Synthetic later page failure");
    const popup = await fixture.open({
        pages: [{ id: "first" }, { id: "later" }],
        onOpen: (_overlay, _dismiss, api) => {
            if (api.pageId === "later") throw failure;
        },
    });
    assert.throws(
        () => popup.api.setPage("later"),
        (error) => error === failure,
    );
    assert.deepEqual(fixture.active(), [popup.overlay]);
    await popup.dismiss();
    popup.overlay.dispatchEvent(new fixture.window.Event("transitionend"));
    assert.equal(await popup.result, null);
});

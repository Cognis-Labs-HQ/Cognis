import assert from "node:assert/strict";
import test from "node:test";
import { popupFixture } from "./dom-fixture.js";

async function setup(context, options = {}) {
    const notifications = [];
    const timers = new Map();
    const fixture = await popupFixture(
        context,
        options.window,
        options.capabilities ?? new Map(),
        {
            ...options,
            console: { ...console, error() {} },
            clock: {
                setTimeout(callback, delay) {
                    const token = {};
                    timers.set(token, { callback, delay });
                    return token;
                },
                clearTimeout(token) {
                    timers.delete(token);
                },
                ...options.clock,
            },
            boundaries: new Map([
                [
                    "toast.js",
                    { showToast: (...args) => notifications.push(args) },
                ],
            ]),
        },
    );
    if (!options.keepStyles) fixture.document.querySelector("link").remove();
    const popup = await fixture.importModule("popup.js");
    return {
        ...fixture,
        popup,
        notifications,
        timers,
        link: () =>
            fixture.document.querySelector(
                'link[href="/static/styles/popup.css"]',
            ),
        expire(delay) {
            for (const [token, timer] of [...timers]) {
                if (timer.delay !== delay) continue;
                timers.delete(token);
                timer.callback();
            }
        },
    };
}

function start(fixture, signal) {
    const state = { settled: false };
    state.result = fixture.popup
        .openPopup({ title: "Fixture", body: "Fixture", actions: [], signal })
        .then((value) => {
            state.settled = true;
            state.value = value;
            return value;
        });
    return state;
}

async function close(fixture, state) {
    const overlay = fixture.active().at(-1);
    overlay.querySelector('[data-popup-action="close"]').click();
    overlay.dispatchEvent(new fixture.window.Event("transitionend"));
    await state.result;
}

async function load(fixture) {
    await fixture.settle();
    fixture.link().dispatchEvent(new fixture.window.Event("load"));
    await fixture.settle();
}

test("pre-aborted popup acquires no stylesheet or locale", async (context) => {
    let locales = 0;
    const fixture = await setup(context, {
        createI18n: () => {
            locales++;
            throw new Error("Unexpected locale");
        },
    });
    const controller = new fixture.window.AbortController();
    controller.abort();
    assert.equal(await start(fixture, controller.signal).result, null);
    assert.equal(fixture.link(), null);
    assert.equal(locales, 0);
    assert.equal(fixture.timers.size, 0);
});

test("abort during CSS settles promptly and leaves healthy shared peer intact", async (context) => {
    const fixture = await setup(context);
    const controller = new fixture.window.AbortController();
    let listeners = 0;
    const add = controller.signal.addEventListener.bind(controller.signal);
    const remove = controller.signal.removeEventListener.bind(
        controller.signal,
    );
    controller.signal.addEventListener = (...args) => {
        listeners++;
        add(...args);
    };
    controller.signal.removeEventListener = (...args) => {
        listeners--;
        remove(...args);
    };
    const canceled = start(fixture, controller.signal);
    const live = start(fixture);
    controller.abort();
    await fixture.settle();
    assert.equal(canceled.settled, true);
    assert.equal(canceled.value, null);
    assert.equal(listeners, 0);
    await load(fixture);
    assert.equal(fixture.active().length, 1);
    assert.equal(fixture.notifications.length, 0);
    await close(fixture, live);
});

test("abort during locale settles promptly without canceling shared locale initialization", async (context) => {
    let release;
    let locales = 0;
    const fixture = await setup(context, {
        keepStyles: true,
        createI18n: () => {
            locales++;
            return new Promise((resolve) => {
                release = resolve;
            });
        },
    });
    const controller = new fixture.window.AbortController();
    const canceled = start(fixture, controller.signal);
    const live = start(fixture);
    await fixture.settle();
    controller.abort();
    await fixture.settle();
    assert.equal(canceled.settled, true);
    assert.equal(canceled.value, null);
    release({
        t: (key) => {
            assert.equal(key, "ui.reuse.close");
            return "Close";
        },
    });
    await fixture.settle();
    assert.equal(locales, 1);
    assert.equal(fixture.active().length, 1);
    await close(fixture, live);
});

test("failed owned links reject without modal acquisition, notify once, and retry only on explicit opening", async (context) => {
    const fixture = await setup(context);
    const first = start(fixture);
    const peer = start(fixture);
    const firstRejected = assert.rejects(
        first.result,
        /popup_stylesheet_load_failed/,
    );
    const peerRejected = assert.rejects(
        peer.result,
        /popup_stylesheet_load_failed/,
    );
    await fixture.settle();
    const failed = fixture.link();
    assert.equal(failed.dataset.resourceErrorHandled, "true");
    failed.dispatchEvent(new fixture.window.Event("error"));
    await Promise.all([firstRejected, peerRejected]);
    assert.equal(fixture.notifications.length, 1);
    assert.equal(fixture.active().length, 0);
    assert.equal(failed.isConnected, false);
    assert.equal(fixture.link(), null);
    assert.equal(fixture.timers.size, 0);
    const retry = start(fixture);
    await fixture.settle();
    assert.notEqual(fixture.link(), failed);
    failed.dispatchEvent(new fixture.window.Event("load"));
    assert.equal(fixture.active().length, 0);
    await load(fixture);
    await close(fixture, retry);
});

test("no terminal link event expires the owner attempt and permits later retry", async (context) => {
    const fixture = await setup(context);
    const first = start(fixture);
    const rejected = assert.rejects(first.result, /popup_stylesheet_timeout/);
    await fixture.settle();
    fixture.expire(5000);
    await rejected;
    assert.equal(fixture.active().length, 0);
    assert.equal(fixture.link(), null);
    assert.equal(fixture.timers.size, 0);
    const next = start(fixture);
    await load(fixture);
    await close(fixture, next);
});

for (const failure of ["open", "match", "body", "unhealthy", "empty"]) {
    test(`cache ${failure} failure uses network without poisoning later openings`, async (context) => {
        const fixture = await setup(context, {
            clock: {
                caches: {
                    open: async () => {
                        if (failure === "open")
                            throw new Error("cache unavailable");
                        return {
                            match: async () => {
                                if (failure === "match")
                                    throw new Error("cache unavailable");
                                return {
                                    ok: failure !== "unhealthy",
                                    text: async () => {
                                        if (failure === "body")
                                            throw new Error(
                                                "cache unavailable",
                                            );
                                        return failure === "empty"
                                            ? ""
                                            : ".popup-overlay { position: fixed; }";
                                    },
                                };
                            },
                        };
                    },
                },
            },
        });
        const state = start(fixture);
        await load(fixture);
        assert.equal(fixture.active().length, 1);
        await close(fixture, state);
    });
}

test("healthy full cached sheet opens offline and never creates a link", async (context) => {
    const css =
        ".popup-overlay { position: fixed; } .popup-window { display: flex; }";
    const fixture = await setup(context, {
        clock: {
            caches: {
                open: async () => ({
                    match: async () => ({ ok: true, text: async () => css }),
                }),
            },
        },
    });
    const state = start(fixture);
    await fixture.settle();
    assert.equal(fixture.link(), null);
    assert.equal(
        fixture.document.querySelector("#popup-cached-styles").textContent,
        css,
    );
    await close(fixture, state);
});

for (const stage of ["open", "match", "body"]) {
    test(`stalled cache ${stage} falls back and cannot install a late sheet`, async (context) => {
        let release;
        const pending = new Promise((resolve) => {
            release = resolve;
        });
        const response = {
            ok: true,
            text: () =>
                stage === "body" ? pending : Promise.resolve("stale CSS"),
        };
        const cache = {
            match: () =>
                stage === "match" ? pending : Promise.resolve(response),
        };
        const fixture = await setup(context, {
            clock: {
                caches: {
                    open: () =>
                        stage === "open" ? pending : Promise.resolve(cache),
                },
            },
        });
        const state = start(fixture);
        await fixture.settle();
        fixture.expire(1000);
        await load(fixture);
        release(
            stage === "open"
                ? cache
                : stage === "match"
                  ? response
                  : "stale CSS",
        );
        await fixture.settle();
        assert.equal(
            fixture.document.querySelector("#popup-cached-styles"),
            null,
        );
        await close(fixture, state);
    });
}

test("adopted pending link is shared, preserved on failure, and bypassed by next owned attempt", async (context) => {
    const fixture = await setup(context, { keepStyles: true });
    const adopted = fixture.link();
    Object.defineProperty(adopted, "sheet", { value: null });
    const first = start(fixture);
    const rejected = assert.rejects(
        first.result,
        /popup_stylesheet_load_failed/,
    );
    await fixture.settle();
    assert.equal(fixture.document.querySelectorAll("link").length, 1);
    adopted.dispatchEvent(new fixture.window.Event("error"));
    await rejected;
    assert.equal(adopted.isConnected, true);
    const next = start(fixture);
    await fixture.settle();
    const owned = [...fixture.document.querySelectorAll("link")].at(-1);
    assert.notEqual(owned, adopted);
    adopted.dispatchEvent(new fixture.window.Event("load"));
    assert.equal(fixture.active().length, 0);
    owned.dispatchEvent(new fixture.window.Event("load"));
    await fixture.settle();
    await close(fixture, next);
});

test("canceled failure waiters do not notify or acquire locale after their shared attempt expires", async (context) => {
    let locales = 0;
    const fixture = await setup(context, {
        createI18n: () => {
            locales++;
            throw new Error("Unexpected locale");
        },
    });
    const controller = new fixture.window.AbortController();
    const state = start(fixture, controller.signal);
    controller.abort();
    await state.result;
    await fixture.settle();
    fixture.expire(5000);
    await fixture.settle();
    assert.equal(locales, 0);
    assert.equal(fixture.notifications.length, 0);
    assert.equal(fixture.active().length, 0);
});

test("anchored failure is consumed and later show retries; hide fences delayed feedback", async (context) => {
    const fixture = await setup(context);
    const anchored = fixture.popup.createAnchoredPopup({
        className: "horizontal-carousel-preview",
    });
    anchored.show(fixture.invoker, "Fixture");
    await fixture.settle();
    fixture.link().dispatchEvent(new fixture.window.Event("error"));
    await fixture.settle();
    assert.equal(fixture.notifications.length, 1);
    assert.equal(
        fixture.document.querySelector(".horizontal-carousel-preview").hidden,
        true,
    );
    anchored.show(fixture.invoker, "Retry");
    await fixture.settle();
    assert.ok(fixture.link());
    anchored.hide();
    fixture.expire(5000);
    await fixture.settle();
    assert.equal(fixture.notifications.length, 1);
    assert.equal(
        fixture.document.querySelector(".horizontal-carousel-preview").hidden,
        true,
    );
    anchored.destroy();
});

test("direct and bundled public exports share one pending owner attempt", async (context) => {
    const first = await setup(context);
    const second = await setup(context, {
        window: first.window,
        capabilities: first.capabilities,
        keepStyles: true,
    });
    const left = start(first);
    const right = start(second);
    await first.settle();
    assert.equal(first.document.querySelectorAll("link").length, 1);
    await load(first);
    assert.equal(first.active().length, 2);
    await close(first, right);
    await close(first, left);
});

for (const stage of ["open", "fetch", "body", "put"]) {
    test(`stalled priming ${stage} settles without rejection and fences late DOM refresh`, async (context) => {
        let release;
        const pending = new Promise((resolve) => {
            release = resolve;
        });
        let fetches = 0;
        let puts = 0;
        const response = {
            ok: true,
            clone() {
                return this;
            },
            text: () =>
                stage === "body"
                    ? pending
                    : Promise.resolve(".popup-overlay { color: blue; }"),
        };
        const cache = {
            put: () => {
                puts++;
                return stage === "put" ? pending : Promise.resolve();
            },
            match: async () => null,
        };
        const fixture = await setup(context, {
            clock: {
                caches: {
                    open: () =>
                        stage === "open" ? pending : Promise.resolve(cache),
                },
            },
            fetch: () => {
                fetches++;
                return stage === "fetch" ? pending : Promise.resolve(response);
            },
        });
        const style = fixture.document.createElement("style");
        style.id = "popup-cached-styles";
        style.textContent = ".popup-overlay { color: red; }";
        fixture.document.head.append(style);
        const first = fixture.popup.primePopupStylesheet();
        assert.equal(first, fixture.popup.primePopupStylesheet());
        await fixture.settle();
        fixture.expire(5000);
        await first;
        release(
            stage === "open"
                ? cache
                : stage === "fetch"
                  ? response
                  : stage === "body"
                    ? ".popup-overlay { color: blue; }"
                    : undefined,
        );
        await fixture.settle();
        assert.equal(style.textContent, ".popup-overlay { color: red; }");
        assert.ok(fetches <= 1);
        assert.ok(puts <= 1);
        assert.equal(fixture.timers.size, 0);
    });
}

test("repeated failed openings each have one owned attempt and no accumulated links or timers", async (context) => {
    const fixture = await setup(context);
    for (let index = 0; index < 3; index++) {
        const state = start(fixture);
        const rejected = assert.rejects(
            state.result,
            /popup_stylesheet_load_failed/,
        );
        await fixture.settle();
        assert.equal(fixture.document.querySelectorAll("link").length, 1);
        fixture.link().dispatchEvent(new fixture.window.Event("error"));
        await rejected;
        assert.equal(fixture.link(), null);
        assert.equal(fixture.timers.size, 0);
    }
    assert.equal(fixture.notifications.length, 3);
});

test("canceled retry cannot notify while a live peer observes one failure", async (context) => {
    const fixture = await setup(context);
    const first = start(fixture);
    const rejected = assert.rejects(
        first.result,
        /popup_stylesheet_load_failed/,
    );
    await fixture.settle();
    fixture.link().dispatchEvent(new fixture.window.Event("error"));
    await rejected;
    const controller = new fixture.window.AbortController();
    const canceled = start(fixture, controller.signal);
    const live = start(fixture);
    const failed = assert.rejects(live.result, /popup_stylesheet_timeout/);
    controller.abort();
    assert.equal(await canceled.result, null);
    await fixture.settle();
    fixture.expire(5000);
    await failed;
    assert.equal(fixture.notifications.length, 2);
    assert.equal(fixture.active().length, 0);
});

test("canceled locale child preserves its live parent focus and independent scroll lease", async (context) => {
    const parent = await setup(context, { keepStyles: true });
    const state = start(parent);
    await parent.settle();
    const overlay = parent.active()[0];
    const focused = parent.document.activeElement;
    const overflow = parent.document.body.style.overflow;
    let release;
    const child = await setup(context, {
        window: parent.window,
        capabilities: parent.capabilities,
        keepStyles: true,
        createI18n: () =>
            new Promise((resolve) => {
                release = resolve;
            }),
    });
    const controller = new child.window.AbortController();
    const canceled = start(child, controller.signal);
    await child.settle();
    controller.abort();
    assert.equal(await canceled.result, null);
    release({
        t: () => {
            throw new Error("Canceled child must not render");
        },
    });
    await child.settle();
    assert.deepEqual(parent.active(), [overlay]);
    assert.equal(parent.document.activeElement, focused);
    assert.equal(parent.document.body.style.overflow, overflow);
    await close(parent, state);
});

test("healthy anchored preview does not acquire unrelated locale initialization", async (context) => {
    let locales = 0;
    const fixture = await setup(context, {
        keepStyles: true,
        createI18n: () => {
            locales++;
            throw new Error("Unrelated locale unavailable");
        },
    });
    const anchored = fixture.popup.createAnchoredPopup({
        className: "horizontal-carousel-preview",
    });
    anchored.show(fixture.invoker, "Fixture");
    await fixture.settle();
    assert.equal(locales, 0);
    assert.equal(
        fixture.document.querySelector(".horizontal-carousel-preview").hidden,
        false,
    );
    assert.equal(fixture.notifications.length, 0);
    anchored.destroy();
});

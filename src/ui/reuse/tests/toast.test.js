import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

class FakeElement {
    constructor() {
        this.children = [];
        this.listeners = new Map();
        this.style = {
            animation: "",
            opacity: "",
            transform: "",
            removeProperty: (property) => {
                this.style[property] = "";
            },
            setProperty() {},
        };
        this.classes = new Set();
        this.classList = {
            add: (className) => this.classes.add(className),
            contains: (className) => this.classes.has(className),
            remove: (className) => this.classes.delete(className),
        };
    }

    set innerHTML(value) {
        if (value.includes('class="toast-timebar"')) {
            const timebar = new FakeElement();
            timebar.className = "toast-timebar";
            this.children.push(timebar);
        }
    }

    appendChild(child) {
        child.parent = this;
        this.children.push(child);
    }

    addEventListener(type, listener, options = {}) {
        if (!this.listeners.has(type)) this.listeners.set(type, new Map());
        this.listeners.get(type).set(listener, options);
    }

    removeEventListener(type, listener) {
        const listeners = this.listeners.get(type);
        listeners?.delete(listener);
        if (!listeners?.size) this.listeners.delete(type);
    }

    dispatch(type, event = {}) {
        for (const [listener, options] of [
            ...(this.listeners.get(type) ?? []),
        ]) {
            if (options.once) this.removeEventListener(type, listener);
            listener(event);
        }
    }

    querySelector(selector) {
        const className = selector.slice(1);
        return (
            this.children.find((child) => child.className === className) ?? null
        );
    }

    setAttribute() {}

    matches() {
        return false;
    }

    remove() {
        if (this.parent) {
            this.parent.children = this.parent.children.filter(
                (child) => child !== this,
            );
        }
    }

    setPointerCapture() {}

    get offsetWidth() {
        return 1;
    }
}

test("temporary toast hover and drag gestures control dismissal", async () => {
    const originalGlobals = {
        document: globalThis.document,
        localStorage: globalThis.localStorage,
        requestAnimationFrame: globalThis.requestAnimationFrame,
        setTimeout: globalThis.setTimeout,
        clearTimeout: globalThis.clearTimeout,
    };
    const timers = new Map();
    let timerId = 0;
    const body = new FakeElement();
    const tray = new FakeElement();
    tray.className = "toast-tray";
    body.appendChild(tray);

    globalThis.document = {
        body,
        createElement: () => new FakeElement(),
        querySelector: (selector) =>
            selector === ".toast-tray" ? tray : { sheet: true },
    };
    globalThis.requestAnimationFrame = (callback) => callback();
    globalThis.setTimeout = (callback, delay) => {
        const id = ++timerId;
        timers.set(id, { callback, delay });
        return id;
    };
    globalThis.clearTimeout = (id) => timers.delete(id);

    try {
        const { showToast } = await import(`../toast.js?test=${Date.now()}`);
        for (const role of ["user", "teacher", "moderator", "unknown", null]) {
            globalThis.localStorage = { getItem: () => role };
            const before = tray.children.length;
            const timerCount = timers.size;
            const dismiss = showToast("Privileged operational message", {
                minRole: "admin",
                onDismiss: () => assert.fail("suppressed toast callback"),
            });
            dismiss();
            assert.equal(tray.children.length, before);
            assert.equal(timers.size, timerCount);
        }
        for (const role of ["admin", "owner"]) {
            globalThis.localStorage = { getItem: () => role };
            const before = tray.children.length;
            showToast("Privileged operational message", { minRole: "admin" });
            assert.equal(tray.children.length, before + 1);
        }
        tray.children.length = 0;
        timers.clear();
        globalThis.localStorage = { getItem: () => "user" };
        let dismissedCount = 0;
        let expiredCount = 0;
        showToast("Saved", {
            duration: 2_500,
            onDismiss: () => {
                dismissedCount += 1;
            },
            onExpire: () => {
                expiredCount += 1;
            },
        });
        const toast = tray.children.at(-1);

        assert.equal(timers.size, 1);
        assert.equal([...timers.values()][0].delay, 2_500);

        toast.dispatch("mouseenter");
        assert.equal(timers.size, 0);

        toast.dispatch("mouseleave");
        assert.equal(timers.size, 1);
        assert.equal([...timers.values()][0].delay, 2_500);
        assert.equal(toast.querySelector(".toast-timebar").style.animation, "");

        toast.dispatch("pointerdown", {
            button: 0,
            clientX: 20,
            isPrimary: true,
            pointerId: 1,
            pointerType: "touch",
        });
        toast.dispatch("pointermove", {
            clientX: 84,
            pointerId: 1,
        });
        assert.equal(toast.classList.contains("toast--hiding"), false);
        toast.dispatch("pointermove", {
            clientX: 40,
            pointerId: 1,
        });
        toast.dispatch("pointerup", {
            pointerId: 1,
            pointerType: "touch",
        });
        assert.equal(toast.classList.contains("toast--hiding"), false);
        assert.equal(timers.size, 1);

        toast.dispatch("pointerdown", {
            button: 0,
            clientX: 20,
            isPrimary: true,
            pointerId: 2,
            pointerType: "touch",
        });
        toast.dispatch("pointermove", {
            clientX: 84,
            pointerId: 2,
        });
        toast.dispatch("pointerup", {
            pointerId: 2,
            pointerType: "touch",
        });
        assert.equal(toast.classList.contains("toast--hiding"), true);
        toast.dispatch("transitionend");
        assert.equal(dismissedCount, 1);
        assert.equal(expiredCount, 0);

        showToast("Auto refresh", {
            duration: 2_500,
            onExpire: () => {
                expiredCount += 1;
            },
        });
        const expiringToast = tray.children.at(-1);
        const expirationTimer = [...timers.values()].find(
            ({ delay }) => delay === 2_500,
        );
        expirationTimer.callback();
        expiringToast.dispatch("transitionend");
        assert.equal(expiredCount, 1);

        showToast("Permanent", { permanent: true });
        const permanentToast = tray.children.at(-1);
        assert.equal(permanentToast.listeners.has("pointerdown"), false);
        assert.equal(
            permanentToast.classList.contains("toast--dismissible"),
            false,
        );
    } finally {
        Object.assign(globalThis, originalGlobals);
    }
});

test("toast hover hides the dismissal timebar", () => {
    const stylesheet = readFileSync(
        fileURLToPath(new URL("../../styles/reuse/toast.css", import.meta.url)),
        "utf8",
    );

    assert.match(
        stylesheet,
        /\.toast:hover \.toast-timebar\s*{\s*display:\s*none;/,
    );
});

let stylesheetFixtureId = 0;

async function withStylesheetFixture(run) {
    const originals = Object.fromEntries(
        ["document", "requestAnimationFrame", "setTimeout", "clearTimeout"].map(
            (key) => [key, globalThis[key]],
        ),
    );
    const head = new FakeElement();
    const body = new FakeElement();
    const timers = new Map();
    const frames = [];
    const links = [];
    let timerId = 0;
    globalThis.document = {
        head,
        body,
        createElement: (tag) => {
            const element = new FakeElement();
            if (tag === "link") links.push(element);
            return element;
        },
        querySelector: (selector) =>
            selector === ".toast-tray"
                ? body.children.find(
                      (child) => child.className === "toast-tray",
                  )
                : head.children[0],
    };
    globalThis.requestAnimationFrame = (callback) => frames.push(callback);
    globalThis.setTimeout = (callback, delay) => {
        const id = ++timerId;
        timers.set(id, { callback, delay });
        return id;
    };
    globalThis.clearTimeout = (id) => timers.delete(id);
    const tick = async () => {
        await Promise.resolve();
        await Promise.resolve();
    };
    const expire = async (delay) => {
        for (const [id, timer] of [...timers]) {
            if (timer.delay !== delay) continue;
            timers.delete(id);
            timer.callback();
        }
        await tick();
    };
    try {
        const { showToast } = await import(
            `../toast.js?stylesheet=${++stylesheetFixtureId}`
        );
        await run({
            showToast,
            head,
            body,
            timers,
            links,
            frames,
            tick,
            expire,
        });
    } finally {
        Object.assign(globalThis, originals);
    }
}

test("toast retries a failed stylesheet through its public entry point", async () => {
    await withStylesheetFixture(async ({ showToast, head, links, tick }) => {
        showToast("First", { permanent: true });
        const failed = head.children[0];
        failed.dispatch("error");
        await tick();
        showToast("Second", { permanent: true });
        assert.notEqual(head.children[0], failed);
        assert.equal(links.length, 2);
        assert.equal(failed.listeners.size, 0);
        const loaded = head.children[0];
        loaded.sheet = {};
        loaded.dispatch("load");
        await tick();
        assert.equal(loaded.listeners.size, 0);
        showToast("Third", { permanent: true });
        assert.deepEqual(head.children, [loaded]);
    });
});

test("concurrent toasts share bounded attempts and can retry after exhaustion", async () => {
    await withStylesheetFixture(
        async ({ showToast, head, timers, links, tick }) => {
            for (let attempt = 0; attempt < 3; attempt += 1) {
                for (let caller = 0; caller < 10; caller += 1) {
                    showToast("Concurrent", { permanent: true });
                }
                assert.equal(head.children.length, 1);
                assert.equal(timers.size, 1);
                const first = head.children[0];
                assert.equal(first.listeners.get("load").size, 1);
                assert.equal(first.listeners.get("error").size, 1);
                first.dispatch("error");
                await tick();
                const second = head.children[0];
                assert.notEqual(second, first);
                first.dispatch("load");
                assert.equal(head.children[0], second);
                second.dispatch("error");
                await tick();
                assert.equal(head.children.length, 0);
                assert.equal(timers.size, 0);
                assert.equal(links.length, (attempt + 1) * 2);
                assert.ok(links.every((link) => link.listeners.size === 0));
            }
        },
    );
});

test("pre-existing loaded, loading and failed links keep their external owner", async () => {
    for (const state of ["loaded", "loading", "failed"]) {
        await withStylesheetFixture(
            async ({ showToast, head, timers, links, tick, expire }) => {
                const external = new FakeElement();
                if (state === "loaded") external.sheet = {};
                head.appendChild(external);
                showToast("Existing", { permanent: true });
                assert.equal(links.length, 0);
                if (state === "failed") {
                    await expire(5_000);
                    assert.equal(links.length, 1);
                    const retry = links[0];
                    retry.sheet = {};
                    retry.dispatch("load");
                } else if (state === "loading") {
                    external.sheet = {};
                    external.dispatch("load");
                }
                await tick();
                assert.equal(timers.size, 0);
                assert.equal(external.listeners.size, 0);
                assert.equal(head.children[0], external);
                showToast("Again", { permanent: true });
                assert.equal(links.length, state === "failed" ? 1 : 0);
            },
        );
    }
});

test("missing lifecycle events time out without unbounded links or listeners", async () => {
    await withStylesheetFixture(
        async ({ showToast, head, timers, links, expire }) => {
            showToast("Waiting", { permanent: true });
            await expire(5_000);
            assert.equal(head.children.length, 1);
            await expire(5_000);
            assert.equal(head.children.length, 0);
            assert.equal(timers.size, 0);
            assert.equal(links.length, 2);
            assert.ok(links.every((link) => link.listeners.size === 0));
        },
    );
});

test("caller abort and dismissal during loading cannot revive a toast", async () => {
    await withStylesheetFixture(
        async ({ showToast, body, head, frames, tick, expire }) => {
            const controller = new AbortController();
            let dismissals = 0;
            let expirations = 0;
            const dismiss = showToast("Pending", {
                duration: 2_500,
                onDismiss: () => (dismissals += 1),
                onExpire: () => (expirations += 1),
            });
            controller.signal.addEventListener("abort", dismiss, {
                once: true,
            });
            const toast = body.children[0].children[0];
            controller.abort();
            dismiss();
            head.children[0].dispatch("error");
            await tick();
            head.children[0].sheet = {};
            head.children[0].dispatch("load");
            while (frames.length) frames.shift()();
            assert.equal(toast.classList.contains("toast--visible"), false);
            await expire(400);
            await expire(2_500);
            toast.dispatch("transitionend");
            assert.equal(body.children[0].children.length, 0);
            assert.equal(dismissals, 1);
            assert.equal(expirations, 0);
        },
    );
});

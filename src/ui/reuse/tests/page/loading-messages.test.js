import test from "node:test";
import loadingFallback from "../../../languages/en/loading.json" with { type: "json" };
import assert from "node:assert/strict";
import { loadTestModule } from "../../../../tooling/reuse/test-module.ts";

function fixture({ deferred = false, fallback = loadingFallback } = {}) {
    let now = 0;
    let serial = 0;
    let languages = ["en"];
    const timers = new Map();
    const requests = [];
    const errors = [];
    const element = () => ({
        dataset: {},
        attributes: {},
        children: [],
        textContent: "",
        setAttribute(key, value) {
            this.attributes[key] = value;
        },
        getAttribute(key) {
            return this.attributes[key];
        },
        append(...children) {
            this.children.push(...children);
        },
    });
    const body = element();
    const schedule = (callback, delay, interval = false) => {
        const id = ++serial;
        timers.set(id, { callback, time: now + delay, delay, interval });
        return id;
    };
    const module = loadTestModule(
        new URL("../../page-entry.js", import.meta.url),
        {
            "../languages/en/loading.json": fallback,
            "./i18n.js": {
                readPreferredLanguages: () => languages,
                createI18n(options) {
                    assert.equal(options.persistLocale, false);
                    const locale = options.preferredLanguages[0];
                    const value = { t: (key) => `${locale}:${key}` };
                    if (!deferred) return Promise.resolve(value);
                    return new Promise((resolve, reject) =>
                        requests.push({
                            resolve: () => resolve(value),
                            reject,
                        }),
                    );
                },
            },
            "./runtime-error-popup.js": {
                openRuntimeErrorPopup: ({ error }) => errors.push(error),
            },
            "./ui-ctx.js": {},
            "./feedback-capabilities.js": {},
            "./floating-window.js": {},
            "./ui-provider-loader.js": {},
        },
        {
            document: { body, createElement: element },
            console: { warn() {} },
            setTimeout: (callback, delay) => schedule(callback, delay),
            setInterval: (callback, delay) => schedule(callback, delay, true),
            clearTimeout: (id) => timers.delete(id),
            clearInterval: (id) => timers.delete(id),
        },
    );
    return {
        begin: module.beginPageLoading,
        requests,
        errors,
        timers,
        locale: (locale) => {
            languages = [locale];
        },
        overlay: () => body.children[0],
        message: () => body.children[0].children[1].textContent,
        async tick(duration) {
            const end = now + duration;
            while (true) {
                const entry = [...timers]
                    .sort((a, b) => a[1].time - b[1].time)
                    .find(([, timer]) => timer.time <= end);
                if (!entry) break;
                const [id, timer] = entry;
                now = timer.time;
                if (timer.interval) timer.time += timer.delay;
                else timers.delete(id);
                timer.callback();
                await new Promise(setImmediate);
            }
            now = end;
            await new Promise(setImmediate);
        },
    };
}

test("spinner and below-spinner message share reveal, rotate, overlap and clear together", async () => {
    const loading = fixture();
    const first = loading.begin();
    await loading.tick(119);
    assert.equal(loading.overlay().attributes["data-overlay-visible"], "false");
    assert.equal(loading.overlay().attributes["data-message-visible"], "false");
    await loading.tick(1);
    assert.equal(loading.overlay().attributes["data-overlay-visible"], "true");
    assert.equal(loading.overlay().attributes["data-message-visible"], "true");
    assert.match(loading.message(), /en:.*loading_joke_1$/);
    const second = loading.begin();
    first();
    first();
    await loading.tick(1680);
    assert.match(loading.message(), /loading_joke_2$/);
    second();
    assert.equal(loading.overlay().attributes["data-message-visible"], "false");
    assert.equal(loading.overlay().attributes["data-overlay-visible"], "false");
    assert.equal(loading.timers.size, 0);
    const quick = loading.begin();
    await loading.tick(60);
    quick();
    await loading.tick(500);
    assert.equal(loading.overlay().attributes["data-message-visible"], "false");
    assert.equal(loading.timers.size, 0);
});

test("locale changes replace loading copy and stale translations cannot win", async () => {
    const loading = fixture({ deferred: true });
    const first = loading.begin();
    await loading.tick(120);
    assert.ok(
        loading.message().trim(),
        "fallback is visible while translations are pending",
    );
    loading.locale("de");
    const second = loading.begin();
    first();
    loading.requests[1].resolve();
    await loading.tick(0);
    assert.match(loading.message(), /^de:/);
    loading.requests[0].resolve();
    await loading.tick(0);
    assert.match(loading.message(), /^de:/);
    second();
});

test("failed loading translations retry on the next task without delaying feedback", async () => {
    const loading = fixture({ deferred: true });
    const first = loading.begin();
    loading.requests[0].reject(new Error("fixture unavailable"));
    await loading.tick(120);
    assert.equal(loading.overlay().attributes["data-message-visible"], "true");
    assert.ok(loading.message().trim());
    first();
    const next = loading.begin();
    assert.equal(loading.requests.length, 2);
    loading.requests[1].resolve();
    await loading.tick(120);
    assert.match(loading.message(), /^en:/);
    next();
});

test("missing or blank English bundle keys fail explicitly", () => {
    assert.throws(() => fixture({ fallback: {} }), /Missing translation/);
    assert.throws(
        () =>
            fixture({
                fallback: {
                    ...loadingFallback,
                    "ui.reuse.loading_joke_1": " ",
                },
            }),
        /Missing translation/,
    );
});

test("fallback rotation continues while localization is stalled", async () => {
    const loading = fixture({ deferred: true });
    const finish = loading.begin();
    await loading.tick(1800);
    assert.equal(loading.message(), loadingFallback["ui.reuse.loading_joke_2"]);
    await loading.tick(1800);
    assert.equal(loading.message(), loadingFallback["ui.reuse.loading_joke_3"]);
    loading.requests[0].resolve();
    await loading.tick(0);
    assert.match(loading.message(), /loading_joke_3$/);
    finish();
});

test("a missing authoritative translation is surfaced instead of silently replaced", async () => {
    const loading = fixture({ deferred: true });
    const finish = loading.begin();
    const error = Object.assign(new Error("missing_translation:fixture"), {
        code: "missing_translation",
    });
    loading.requests[0].reject(error);
    await loading.tick(0);
    assert.deepEqual(loading.errors, [error]);
    finish();
});

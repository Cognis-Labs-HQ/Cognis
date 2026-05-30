import test from "node:test";
import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

test("runtime error popup renders branded header and supports previous-route fallback", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/reuse/runtime-error-popup.js"),
        "utf8",
    );

    assert.match(source, /popup-error-report-brand/);
    assert.match(source, /\/static\/assets\/icons\/cognis-icon\.png/);
    assert.match(source, /navigateToPreviousRouteIfDifferent/);
    assert.match(source, /window\.history\.state\?\.previousRouterPage/);
    assert.match(source, /hasLoadedMainPageBoilerplate/);
    assert.match(source, /didReloadIntoCurrentDocument/);
    assert.match(source, /id:\s*["']copy["']/);
    assert.match(source, /navigator\.clipboard\?\.writeText/);
    assert.match(
        source,
        /window\.location\.assign\(normalizedPreviousRoutePath\)/,
    );
    assert.match(
        source,
        /popupAction === null \|\| popupAction === (["'])close\1/,
    );
});

test("popup styles constrain dialog height and apply themed scrollbars", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/styles/popup.css"),
        "utf8",
    );

    assert.match(source, /max-height:\s*calc\(100dvh - 48px\);/);
    assert.match(
        source,
        /\.popup-overlay,\s*[\s\S]*\.popup-overlay \*\s*\{\s*scrollbar-color:/m,
    );
    assert.match(source, /\.popup-error-report-brand\s*\{/);
    assert.match(source, /data-popup-action="copy"/);
    assert.match(source, /\/static\/assets\/reuse\/clipboard\.svg/);
});

test("router stores previous route in history state during SPA navigation", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/reuse/app-router.js"),
        "utf8",
    );

    assert.match(source, /previousRouterPage/);
    assert.match(
        source,
        /history\.pushState\(\{\s*routerPage:\s*path,\s*previousRouterPage\s*\},\s*["']["'],\s*path\)/,
    );
});

test("runtime error popup suppresses crash dialogs for connection-interruption failures", async () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/reuse/runtime-error-popup.js"),
        "utf8",
    );
    const testableSource =
        source
            .replace(/^import[\s\S]*?from .*;\n/gm, "")
            .replace(/\bexport\s+/g, "") +
        "\n" +
        "globalThis.__testExports = { openRuntimeErrorPopup };\n";

    const openPopupCalls = [];
    const context = {
        console,
        Date,
        openPopup(options) {
            openPopupCalls.push(options);
            return Promise.resolve("close");
        },
        shouldSuppressConnectionRecoveryPopup() {
            return true;
        },
        createI18n() {
            return Promise.resolve({
                t(key) {
                    return key;
                },
            });
        },
        escapeHtml(value) {
            return String(value ?? "");
        },
        getCurrentRoutePath() {
            return "/dashboard";
        },
        normalizeSameOriginRoutePath(routePath) {
            return String(routePath ?? "");
        },
        window: {
            location: {
                href: "https://example.com/dashboard",
            },
            history: {
                back() {},
                state: {},
            },
            addEventListener() {},
        },
        document: {
            referrer: "",
        },
    };
    context.globalThis = context;

    vm.runInNewContext(testableSource, context, {
        filename: "runtime-error-popup.js",
    });

    await context.__testExports.openRuntimeErrorPopup({
        error: new Error('HTTP 503 while loading "/api/v1/users"'),
        context: "Route load failed",
    });

    assert.equal(openPopupCalls.length, 0);
});

test("runtime error popup uses full navigation fallback after reload-origin failures when main boilerplate is missing", async () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/reuse/runtime-error-popup.js"),
        "utf8",
    );
    const testableSource =
        source
            .replace(/^import[\s\S]*?from .*;\n/gm, "")
            .replace(/\bexport\s+/g, "") +
        "\n" +
        "globalThis.__testExports = { openRuntimeErrorPopup };\n";

    const locationAssignCalls = [];
    let historyBackCalls = 0;
    const context = {
        console,
        Date,
        openPopup() {
            return Promise.resolve("close");
        },
        shouldSuppressConnectionRecoveryPopup() {
            return false;
        },
        createI18n() {
            return Promise.resolve({
                t(key) {
                    return key;
                },
            });
        },
        escapeHtml(value) {
            return String(value ?? "");
        },
        getCurrentRoutePath() {
            return "/broken";
        },
        normalizeSameOriginRoutePath(routePath) {
            return String(routePath ?? "");
        },
        window: {
            location: {
                href: "https://example.com/broken",
                assign(routePath) {
                    locationAssignCalls.push(routePath);
                },
            },
            history: {
                back() {
                    historyBackCalls += 1;
                },
                state: {
                    previousRouterPage: "/dashboard",
                },
            },
            performance: {
                getEntriesByType() {
                    return [{ type: "reload" }];
                },
            },
            addEventListener() {},
        },
        document: {
            referrer: "",
            querySelector() {
                return null;
            },
        },
    };
    context.globalThis = context;

    vm.runInNewContext(testableSource, context, {
        filename: "runtime-error-popup.js",
    });

    await context.__testExports.openRuntimeErrorPopup({
        error: new Error("Route mount failed"),
        context: "Route mount failed",
    });

    assert.deepEqual(locationAssignCalls, ["/dashboard"]);
    assert.equal(historyBackCalls, 0);
});

test("runtime error popup preserves SPA back navigation when main boilerplate is loaded", async () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/reuse/runtime-error-popup.js"),
        "utf8",
    );
    const testableSource =
        source
            .replace(/^import[\s\S]*?from .*;\n/gm, "")
            .replace(/\bexport\s+/g, "") +
        "\n" +
        "globalThis.__testExports = { openRuntimeErrorPopup };\n";

    const locationAssignCalls = [];
    let historyBackCalls = 0;
    const context = {
        console,
        Date,
        openPopup() {
            return Promise.resolve("close");
        },
        shouldSuppressConnectionRecoveryPopup() {
            return false;
        },
        createI18n() {
            return Promise.resolve({
                t(key) {
                    return key;
                },
            });
        },
        escapeHtml(value) {
            return String(value ?? "");
        },
        getCurrentRoutePath() {
            return "/broken";
        },
        normalizeSameOriginRoutePath(routePath) {
            return String(routePath ?? "");
        },
        window: {
            location: {
                href: "https://example.com/broken",
                assign(routePath) {
                    locationAssignCalls.push(routePath);
                },
            },
            history: {
                back() {
                    historyBackCalls += 1;
                },
                state: {
                    previousRouterPage: "/dashboard",
                },
            },
            performance: {
                getEntriesByType() {
                    return [{ type: "reload" }];
                },
            },
            addEventListener() {},
        },
        document: {
            referrer: "",
            querySelector(selector) {
                if (selector === ".app-shell") return {};
                return null;
            },
        },
    };
    context.globalThis = context;

    vm.runInNewContext(testableSource, context, {
        filename: "runtime-error-popup.js",
    });

    await context.__testExports.openRuntimeErrorPopup({
        error: new Error("Route mount failed"),
        context: "Route mount failed",
    });

    assert.deepEqual(locationAssignCalls, []);
    assert.equal(historyBackCalls, 1);
});

test("runtime error popup caches main boilerplate lookup result", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/reuse/runtime-error-popup.js"),
        "utf8",
    );
    const testableSource =
        source
            .replace(/^import[\s\S]*?from .*;\n/gm, "")
            .replace(/\bexport\s+/g, "") +
        "\n" +
        "globalThis.__testExports = { hasLoadedMainPageBoilerplate };\n";

    let querySelectorCalls = 0;
    const context = {
        console,
        Date,
        document: {
            querySelector(selector) {
                if (selector !== ".app-shell") return null;
                querySelectorCalls += 1;
                return {};
            },
        },
    };
    context.globalThis = context;

    vm.runInNewContext(testableSource, context, {
        filename: "runtime-error-popup.js",
    });

    assert.equal(context.__testExports.hasLoadedMainPageBoilerplate(), true);
    assert.equal(context.__testExports.hasLoadedMainPageBoilerplate(), true);
    assert.equal(querySelectorCalls, 1);
});

test("runtime error popup copy action writes full crash detail text", async () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/reuse/runtime-error-popup.js"),
        "utf8",
    );
    const testableSource =
        source
            .replace(/^import[\s\S]*?from .*;\n/gm, "")
            .replace(/\bexport\s+/g, "") +
        "\n" +
        "globalThis.__testExports = { openRuntimeErrorPopup };\n";

    const copiedValues = [];
    const context = {
        console,
        Date,
        openPopup(options) {
            return Promise.resolve()
                .then(() => options.onAction("copy"))
                .then(() => "close");
        },
        shouldSuppressConnectionRecoveryPopup() {
            return false;
        },
        createI18n() {
            return Promise.resolve({
                t(key) {
                    return key;
                },
            });
        },
        escapeHtml(value) {
            return String(value ?? "");
        },
        getCurrentRoutePath() {
            return "/broken";
        },
        normalizeSameOriginRoutePath(routePath) {
            return String(routePath ?? "");
        },
        navigator: {
            clipboard: {
                writeText(value) {
                    copiedValues.push(value);
                    return Promise.resolve();
                },
            },
        },
        window: {
            location: {
                href: "https://example.com/broken",
                assign() {},
            },
            history: {
                back() {},
                state: {
                    previousRouterPage: "/dashboard",
                },
            },
            performance: {
                getEntriesByType() {
                    return [{ type: "reload" }];
                },
            },
            addEventListener() {},
        },
        document: {
            referrer: "",
            querySelector() {
                return {};
            },
        },
    };
    context.globalThis = context;

    vm.runInNewContext(testableSource, context, {
        filename: "runtime-error-popup.js",
    });

    await context.__testExports.openRuntimeErrorPopup({
        error: new Error("Route mount failed"),
        context: "Route mount failed",
        consoleEntries: [
            {
                timestamp: "2026-05-27T00:00:00.000Z",
                level: "error",
                message: "Example console entry",
            },
        ],
    });

    assert.equal(copiedValues.length, 1);
    assert.match(copiedValues[0], /ui\.reuse\.runtime_error_popup_summary/);
    assert.match(copiedValues[0], /Route mount failed/);
    assert.match(copiedValues[0], /https:\/\/example\.com\/broken/);
    assert.match(copiedValues[0], /Example console entry/);
});

test("runtime error popup copy action adds and removes copied class on success", async () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/reuse/runtime-error-popup.js"),
        "utf8",
    );
    const testableSource =
        source
            .replace(/^import[\s\S]*?from .*;\n/gm, "")
            .replace(/\bexport\s+/g, "") +
        "\n" +
        "globalThis.__testExports = { openRuntimeErrorPopup };\n";

    const addedClasses = [];
    const removedClasses = [];
    const timeouts = [];
    const copyBtn = {
        classList: {
            add(...cls) {
                addedClasses.push(...cls);
            },
            remove(...cls) {
                removedClasses.push(...cls);
            },
        },
    };
    const overlay = {
        querySelector(selector) {
            if (selector === '[data-popup-action="copy"]') return copyBtn;
            return null;
        },
    };

    const context = {
        console,
        Date,
        openPopup(options) {
            return Promise.resolve()
                .then(() => options.onAction("copy", overlay))
                .then(() => "close");
        },
        shouldSuppressConnectionRecoveryPopup() {
            return false;
        },
        createI18n() {
            return Promise.resolve({
                t(key) {
                    return key;
                },
            });
        },
        escapeHtml(value) {
            return String(value ?? "");
        },
        getCurrentRoutePath() {
            return "/broken";
        },
        normalizeSameOriginRoutePath(routePath) {
            return String(routePath ?? "");
        },
        setTimeout(fn, ms) {
            timeouts.push({ fn, ms });
        },
        navigator: {
            clipboard: {
                writeText() {
                    return Promise.resolve();
                },
            },
        },
        window: {
            location: { href: "https://example.com/broken", assign() {} },
            history: { back() {}, state: {} },
            addEventListener() {},
        },
        document: {
            referrer: "",
            querySelector() {
                return {};
            },
        },
    };
    context.globalThis = context;

    vm.runInNewContext(testableSource, context, {
        filename: "runtime-error-popup.js",
    });

    await context.__testExports.openRuntimeErrorPopup({
        error: new Error("Boom"),
        context: "test",
    });

    assert.deepEqual(addedClasses, ["popup-action-btn--copied"]);
    assert.equal(timeouts.length, 1);
    assert.equal(timeouts[0].ms, 1500);

    // Simulate timeout firing
    timeouts[0].fn();
    assert.deepEqual(removedClasses, ["popup-action-btn--copied"]);
});

test("runtime error popup copy action skips class toggle when overlay is not an HTMLElement", async () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/reuse/runtime-error-popup.js"),
        "utf8",
    );
    const testableSource =
        source
            .replace(/^import[\s\S]*?from .*;\n/gm, "")
            .replace(/\bexport\s+/g, "") +
        "\n" +
        "globalThis.__testExports = { openRuntimeErrorPopup };\n";

    const timeouts = [];
    const context = {
        console,
        Date,
        openPopup(options) {
            return Promise.resolve()
                .then(() => options.onAction("copy", null))
                .then(() => "close");
        },
        shouldSuppressConnectionRecoveryPopup() {
            return false;
        },
        createI18n() {
            return Promise.resolve({
                t(key) {
                    return key;
                },
            });
        },
        escapeHtml(value) {
            return String(value ?? "");
        },
        getCurrentRoutePath() {
            return "/broken";
        },
        normalizeSameOriginRoutePath(routePath) {
            return String(routePath ?? "");
        },
        setTimeout(fn, ms) {
            timeouts.push({ fn, ms });
        },
        navigator: {
            clipboard: {
                writeText() {
                    return Promise.resolve();
                },
            },
        },
        window: {
            location: { href: "https://example.com/broken", assign() {} },
            history: { back() {}, state: {} },
            addEventListener() {},
        },
        document: {
            referrer: "",
            querySelector() {
                return {};
            },
        },
    };
    context.globalThis = context;

    vm.runInNewContext(testableSource, context, {
        filename: "runtime-error-popup.js",
    });

    await context.__testExports.openRuntimeErrorPopup({
        error: new Error("Boom"),
        context: "test",
    });

    assert.equal(timeouts.length, 0);
});

test("runtime error handlers ignore benign ResizeObserver loop errors", async () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/reuse/runtime-error-popup.js"),
        "utf8",
    );
    const testableSource =
        source
            .replace(/^import[\s\S]*?from .*;\n/gm, "")
            .replace(/\bexport\s+/g, "") +
        "\n" +
        "globalThis.__testExports = { installRuntimeErrorHandlers };\n";

    const listeners = new Map();
    const openPopupCalls = [];
    const context = {
        console,
        Date,
        openPopup(options) {
            openPopupCalls.push(options);
            return Promise.resolve("close");
        },
        shouldSuppressConnectionRecoveryPopup() {
            return false;
        },
        createI18n() {
            return Promise.resolve({
                t(key) {
                    return key;
                },
            });
        },
        escapeHtml(value) {
            return String(value ?? "");
        },
        getCurrentRoutePath() {
            return "/settings";
        },
        normalizeSameOriginRoutePath(routePath) {
            return String(routePath ?? "");
        },
        window: {
            location: {
                href: "https://example.com/settings#security",
                assign() {},
            },
            history: {
                back() {},
                state: {},
            },
            addEventListener(type, handler) {
                listeners.set(type, handler);
            },
        },
        document: {
            referrer: "",
            querySelector() {
                return {};
            },
        },
    };
    context.globalThis = context;

    vm.runInNewContext(testableSource, context, {
        filename: "runtime-error-popup.js",
    });

    context.__testExports.installRuntimeErrorHandlers();
    const errorHandler = listeners.get("error");
    assert.equal(typeof errorHandler, "function");

    errorHandler({
        message: "ResizeObserver loop completed with undelivered notifications.",
    });
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(openPopupCalls.length, 0);

    errorHandler({
        message: "Unexpected UI crash",
    });
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(openPopupCalls.length, 1);
});

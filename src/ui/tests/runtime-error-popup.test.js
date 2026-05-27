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
    assert.match(source, /didReloadIntoCurrentDocument/);
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

test("runtime error popup uses full navigation fallback after reload-origin failures", async () => {
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

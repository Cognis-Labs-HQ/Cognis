import assert from "node:assert/strict";
import test from "node:test";
import { loadTestModule } from "../../../tooling/reuse/test-module.ts";

test("repeated handler installation reports one Calendar rejection and preserves distinct failures", async () => {
    const registrations = new Map();
    const popups = [];
    const context = {
        console: { warn() {}, error() {}, log() {}, info() {}, debug() {} },
        Date,
        Error,
        uiCtx: { capabilities: { get: () => () => {} } },
        applyTheme() {},
        getStoredTheme: () => "light",
        primePopupStylesheet: async () => {},
        shouldSuppressConnectionRecoveryPopup: () => false,
        createI18n: async () => ({ t: (key) => key }),
        escapeHtml: String,
        getCurrentRoutePath: () => "/calendar",
        normalizeSameOriginRoutePath: String,
        openPopup: async (options) => {
            popups.push(options);
            return "close";
        },
        window: {
            location: { href: "https://example.test/calendar" },
            history: { state: {} },
            addEventListener(type, handler) {
                const handlers = registrations.get(type) ?? [];
                handlers.push(handler);
                registrations.set(type, handlers);
            },
        },
        document: { referrer: "", querySelector: () => ({}) },
    };
    context.globalThis = context;
    const handlers = loadTestModule(
        new URL("../../reuse/runtime-error-popup.js", import.meta.url),
        Object.fromEntries(
            [
                "./ui-ctx.js",
                "./popup.js",
                "./api-client.js",
                "./i18n.js",
                "./escape-html.js",
                "./clipboard.js",
                "./theme-toggle.js",
                "./route-path.js",
            ].map((specifier) => [specifier, context]),
        ),
        context,
    );
    for (let index = 0; index < 4; index++)
        handlers.installRuntimeErrorHandlers();
    assert.equal(registrations.get("unhandledrejection").length, 1);
    assert.equal(registrations.get("error").length, 1);
    const rejection = registrations.get("unhandledrejection")[0];
    const error = new Error(
        "missing_translation:gateway.calendar.event_status_busy",
    );
    rejection({ reason: error });
    await new Promise(setImmediate);
    assert.equal(popups.length, 1);
    assert.match(
        popups[0].body(),
        /missing_translation:gateway\.calendar\.event_status_busy/,
    );
    rejection({ reason: error });
    await new Promise(setImmediate);
    assert.equal(popups.length, 1);
    rejection({ reason: new Error("distinct_calendar_failure") });
    await new Promise(setImmediate);
    assert.equal(popups.length, 2);
    assert.match(popups[1].body(), /distinct_calendar_failure/);
});

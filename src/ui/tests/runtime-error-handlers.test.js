import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

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
    class TestImageElement {
        constructor() {
            this.dataset = {};
            this.src = "";
            this.hidden = false;
        }
    }
    const context = {
        console,
        Date,
        HTMLImageElement: TestImageElement,
        applyTheme() {},
        getStoredTheme() {
            return "light";
        },
        openPopup(options) {
            openPopupCalls.push(options);
            return Promise.resolve("close");
        },
        primePopupStylesheet() {
            return Promise.resolve();
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

    const ignoredResizeObserverMessages = [
        "ResizeObserver loop completed with undelivered notifications.",
        "ResizeObserver loop limit exceeded",
    ];
    for (const ignoredMessage of ignoredResizeObserverMessages) {
        errorHandler({
            message: ignoredMessage,
        });
        await Promise.resolve();
        await Promise.resolve();
    }
    assert.equal(openPopupCalls.length, 0);

    const brokenModuleImage = new TestImageElement();
    brokenModuleImage.dataset.resourceFallback = "/fallback.svg";
    brokenModuleImage.src = "blob:https://example.com/broken";
    errorHandler({ target: brokenModuleImage });
    await Promise.resolve();
    assert.equal(brokenModuleImage.src, "/fallback.svg");
    assert.equal(openPopupCalls.length, 0);

    errorHandler({ target: brokenModuleImage });
    await Promise.resolve();
    assert.equal(brokenModuleImage.hidden, true);
    assert.equal(openPopupCalls.length, 0);
});

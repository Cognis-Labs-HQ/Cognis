import test from "node:test";
import assert from "node:assert/strict";
import { uiCtx } from "../ui-ctx.js";
import { registerFeedbackCapabilities } from "../feedback-capabilities.js";

test("browser feedback capabilities expose host toast, popup, and logging processes", () => {
    registerFeedbackCapabilities();

    assert.equal(typeof uiCtx.capabilities.get("ui:showToast"), "function");
    assert.equal(
        typeof uiCtx.capabilities.get("ui:openErrorPopup"),
        "function",
    );
    assert.equal(typeof uiCtx.capabilities.get("ui:log"), "function");
});

test("logging skips anonymous requests and contains delivery failures", async (t) => {
    let token = "";
    let status = 401;
    let fail = false;
    const requests = [];
    const events = [];
    globalThis.window = { dispatchEvent: (event) => events.push(event) };
    globalThis.CustomEvent = class {
        constructor(type) {
            this.type = type;
        }
    };
    t.after(() => {
        delete globalThis.window;
        delete globalThis.CustomEvent;
    });
    t.mock.method(console, "warn", () => {});
    globalThis.localStorage = { getItem: () => token };
    t.after(() => {
        delete globalThis.localStorage;
    });
    t.mock.method(globalThis, "fetch", async (_path, options) => {
        requests.push(options);
        if (fail) throw new Error("offline");
        return { ok: status === 200, status };
    });
    const log = uiCtx.capabilities.get("ui:log");
    assert.equal(await log("error", "Callback navigation failed"), false);
    assert.equal(requests.length, 0);
    token = "expired-token";
    assert.equal(await log("error", "Callback navigation failed"), false);
    status = 503;
    assert.equal(await log("error", "Callback navigation failed"), false);
    fail = true;
    assert.equal(await log("error", "Callback navigation failed"), false);
    fail = false;
    status = 200;
    assert.equal(await log("info", "Navigation completed"), true);
    assert.deepEqual(events, []);
});

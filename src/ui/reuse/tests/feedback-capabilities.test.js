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

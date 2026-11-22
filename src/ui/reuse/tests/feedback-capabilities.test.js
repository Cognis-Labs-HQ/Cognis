import test from "node:test";
import assert from "node:assert/strict";
import { subscribeDiagnostics } from "../diagnostics.js";
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

test("feedback logging reaches the registered diagnostic consumer", async () => {
    const entries = [];
    const release = subscribeDiagnostics(async (entry) => {
        entries.push(entry);
        return true;
    });
    try {
        const log = uiCtx.capabilities.get("ui:log");
        assert.equal(
            await log("error", "navigation_failed", { component: "ui" }),
            true,
        );
        assert.deepEqual(entries.at(-1), {
            level: "error",
            message: "navigation_failed",
            meta: { component: "ui" },
        });
    } finally {
        release();
    }
});

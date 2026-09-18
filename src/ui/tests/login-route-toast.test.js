import assert from "node:assert/strict";
import test from "node:test";
import {
    createLoginReasonNotifier,
    createRouteScopedToast,
    showLoginReasonToast,
} from "../app/login/client-loaders.js";

test("login route toasts dismiss when navigation aborts the page", () => {
    const controller = new AbortController();
    const calls = [];
    const showToast = createRouteScopedToast((message, options) => {
        const call = { message, options, dismissed: false };
        calls.push(call);
        return () => {
            call.dismissed = true;
        };
    }, controller.signal);

    const dismiss = showLoginReasonToast({
        reason: "session_expired",
        i18n: { t: (key) => key },
        showToast,
    });

    assert.equal(typeof dismiss, "function");
    assert.equal(calls[0].options.permanent, true);
    assert.equal(calls[0].dismissed, false);
    controller.abort();
    assert.equal(calls[0].dismissed, true);
});

test("login reason notifier only shows a permanent reason once", () => {
    let count = 0;
    const notify = createLoginReasonNotifier({
        reason: "session_expired",
        i18n: { t: (key) => key },
        showToast: () => {
            count += 1;
            return () => undefined;
        },
    });

    assert.equal(notify(), true);
    assert.equal(notify(), false);
    assert.equal(count, 1);
});

test("login reason helper skips unknown reasons", () => {
    const result = showLoginReasonToast({
        reason: "unknown",
        i18n: { t: (key) => key },
        showToast: () => assert.fail("unexpected toast"),
    });

    assert.equal(result, null);
});

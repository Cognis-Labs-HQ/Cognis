import test from "node:test";
import assert from "node:assert/strict";
import { navigateToDocument } from "../../page-entry.js";

function environment(testContext, { allowed = true, reject = false } = {}) {
    const assigned = [];
    const events = [];
    const previous = globalThis.window;
    globalThis.window = {
        location: {
            origin: "https://cognis.test",
            assign: (url) => {
                if (reject) throw new Error("navigation rejected");
                assigned.push(url);
            },
        },
        dispatchEvent: (event) => {
            events.push(event);
            return allowed;
        },
    };
    testContext.after(() => {
        globalThis.window = previous;
    });
    return { assigned, events };
}

for (const path of ["/", "/register", "/login?reason=sso_failed"]) {
    test(`standalone page loads server document ${path}`, (testContext) => {
        const { assigned } = environment(testContext);
        assert.equal(navigateToDocument(path), true);
        assert.deepEqual(assigned, [`https://cognis.test${path}`]);
    });
}

test("document navigation rejects malformed, external, executable and credential URLs", (testContext) => {
    const { assigned, events } = environment(testContext);
    for (const path of [
        "https://[invalid",
        "https://cognis.test:invalid/",
        "https://other.test/",
        "//other.test/",
        "javascript:alert(1)",
        "blob:https://cognis.test/id",
        "https://user:secret@cognis.test/",
        null,
    ]) {
        assert.equal(navigateToDocument(path), false);
    }
    assert.deepEqual(assigned, []);
    assert.deepEqual(events, []);
});

test("document guard can decline and resume without changing SPA state", (testContext) => {
    const { assigned, events } = environment(testContext, { allowed: false });
    assert.equal(navigateToDocument("/register"), false);
    assert.deepEqual(assigned, []);
    assert.equal(events[0].type, "cognis:route-before-navigate");
    assert.equal(events[0].cancelable, true);
    assert.equal(events[0].detail.resume(), true);
    assert.deepEqual(assigned, ["https://cognis.test/register"]);
});

test("cancelled document transitions cannot start or resume", (testContext) => {
    const { assigned, events } = environment(testContext, { allowed: false });
    const controller = new AbortController();
    assert.equal(
        navigateToDocument("/register", { signal: controller.signal }),
        false,
    );
    controller.abort();
    assert.equal(events[0].detail.resume(), false);
    assert.equal(navigateToDocument("/", { signal: controller.signal }), false);
    assert.deepEqual(assigned, []);
});

test("document assignment rejection reaches the callback recovery boundary", (testContext) => {
    environment(testContext, { reject: true });
    assert.throws(() => navigateToDocument("/login"), /navigation rejected/);
});

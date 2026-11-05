import test from "node:test";
import assert from "node:assert/strict";
import { searchPopupLifetime } from "../lifetime.js";

test("a tutorial lifetime closes its search popup without closing a replacement", () => {
    const tutorial = new AbortController();
    const original = new AbortController();
    const replacement = new AbortController();
    let originalClosed = 0,
        replacementClosed = 0;
    searchPopupLifetime.track(() => {
        originalClosed++;
        original.abort();
    }, original.signal);
    assert.equal(searchPopupLifetime.attachLifetime(tutorial.signal), true);
    original.abort();
    searchPopupLifetime.track(() => {
        replacementClosed++;
        replacement.abort();
    }, replacement.signal);
    tutorial.abort();
    assert.equal(originalClosed, 0);
    assert.equal(replacementClosed, 0);
    const nextTutorial = new AbortController();
    assert.equal(searchPopupLifetime.attachLifetime(nextTutorial.signal), true);
    nextTutorial.abort();
    assert.equal(replacementClosed, 1);
    assert.equal(
        searchPopupLifetime.attachLifetime(new AbortController().signal),
        false,
    );
});
